use axum::{
    extract::{Multipart, Path, State},
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};
use sqlx::Row;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    middleware::AuthUser,
    services::auth::{
        build_totp_setup, consume_backup_code, decrypt_sensitive_value, encrypt_sensitive_value,
        generate_backup_codes, generate_totp_secret_base32, hash_password, verify_password,
        verify_totp_code,
    },
    services::cache,
    services::pubsub::{guild_channel, publish, user_channel},
    state::AppState,
};

pub async fn me(AuthUser(user_id): AuthUser, State(state): State<AppState>) -> Result<Json<Value>> {
    let user = sqlx::query(
        r#"SELECT id, username, discriminator, email, avatar_url, banner_url,
                  bio, status, custom_status, voice_mic_muted, voice_headphones_muted, is_verified, badges, created_at
           FROM users WHERE id = $1"#
    )
    .bind(user_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("User not found".into()))?;
    let user_id = user.try_get::<Uuid, _>("id")?;
    let username = user.try_get::<String, _>("username")?;
    let discriminator = user.try_get::<String, _>("discriminator")?;
    let email = user.try_get::<String, _>("email")?;
    let avatar_url = user.try_get::<Option<String>, _>("avatar_url")?;
    let banner_url = user.try_get::<Option<String>, _>("banner_url")?;
    let bio = user.try_get::<Option<String>, _>("bio")?;
    let status = user.try_get::<String, _>("status")?;
    let custom_status = user.try_get::<Option<String>, _>("custom_status")?;
    let voice_mic_muted = user.try_get::<bool, _>("voice_mic_muted")?;
    let voice_headphones_muted = user.try_get::<bool, _>("voice_headphones_muted")?;
    let is_verified = user.try_get::<bool, _>("is_verified")?;
    let badges = user.try_get::<Vec<String>, _>("badges")?;
    let created_at = user.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at")?;
    let two_factor_enabled = get_two_factor_enabled(&state, user_id).await?;

    Ok(Json(json!({
        "data": {
            "id": user_id,
            "username": username,
            "discriminator": discriminator,
            "email": email,
            "avatarUrl": avatar_url,
            "bannerUrl": banner_url,
            "bio": bio,
            "status": status,
            "customStatus": custom_status,
            "voiceMicMuted": voice_mic_muted,
            "voiceHeadphonesMuted": voice_headphones_muted,
            "isVerified": is_verified,
            "badges": badges,
            "twoFactorEnabled": two_factor_enabled,
            "createdAt": created_at,
        }
    })))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMeBody {
    pub username: Option<String>,
    pub email: Option<String>,
    pub bio: Option<String>,
    pub status: Option<String>,
    pub custom_status: Option<String>,
    pub voice_mic_muted: Option<bool>,
    pub voice_headphones_muted: Option<bool>,
    pub current_password: Option<String>,
    pub new_password: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrepareTwoFactorBody {
    pub current_password: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnableTwoFactorBody {
    pub current_password: Option<String>,
    pub secret: String,
    pub code: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DisableTwoFactorBody {
    pub current_password: Option<String>,
    pub code: String,
}

pub async fn update_me(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Json(body): Json<UpdateMeBody>,
) -> Result<Json<Value>> {
    #[derive(sqlx::FromRow)]
    struct CurrentUserRow {
        username: String,
        email: String,
        password_hash: Option<String>,
    }

    let current_user = sqlx::query_as::<_, CurrentUserRow>(
        r#"SELECT username, email, password_hash
           FROM users
           WHERE id = $1"#,
    )
    .bind(user_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("User not found".into()))?;

    let valid_statuses = ["online", "idle", "dnd", "offline"];
    if let Some(ref s) = body.status {
        if !valid_statuses.contains(&s.as_str()) {
            return Err(AppError::validation(
                "status",
                "Must be one of: online, idle, dnd, offline",
            ));
        }
    }

    let next_username = if let Some(username) = body.username.as_ref() {
        let trimmed = username.trim();
        if trimmed.len() < 2 || trimmed.len() > 32 {
            return Err(AppError::validation(
                "username",
                "Username must be 2-32 characters",
            ));
        }
        if trimmed == current_user.username {
            None
        } else {
            Some(trimmed.to_string())
        }
    } else {
        None
    };

    let next_email = if let Some(email) = body.email.as_ref() {
        let trimmed = email.trim().to_lowercase();
        if !trimmed.contains('@') {
            return Err(AppError::validation("email", "Email must be valid"));
        }
        if trimmed == current_user.email {
            None
        } else {
            Some(trimmed)
        }
    } else {
        None
    };

    if body.current_password.is_some() && body.new_password.is_none() {
        return Err(AppError::validation(
            "newPassword",
            "New password is required",
        ));
    }

    let next_password_hash = if let Some(new_password) = body.new_password.as_ref() {
        if new_password.len() < 8 {
            return Err(AppError::validation(
                "newPassword",
                "Password must be at least 8 characters",
            ));
        }

        if let Some(hash) = current_user.password_hash.as_deref() {
            let current_password = body.current_password.as_deref().ok_or_else(|| {
                AppError::validation("currentPassword", "Current password is required")
            })?;

            if !verify_password(current_password, hash)? {
                return Err(AppError::validation(
                    "currentPassword",
                    "Current password is incorrect",
                ));
            }
        }

        Some(hash_password(new_password)?)
    } else {
        None
    };

    let user = sqlx::query(
        r#"UPDATE users
           SET username      = COALESCE($2, username),
               email         = COALESCE($3, email),
               bio           = COALESCE($4, bio),
               status        = COALESCE($5, status),
               custom_status = COALESCE($6, custom_status),
               password_hash = COALESCE($7, password_hash),
               voice_mic_muted = COALESCE($8, voice_mic_muted),
               voice_headphones_muted = COALESCE($9, voice_headphones_muted)
           WHERE id = $1
           RETURNING id, username, discriminator, email, avatar_url, banner_url,
                     bio, status, custom_status, voice_mic_muted, voice_headphones_muted, is_verified, badges, created_at"#
    )
    .bind(user_id)
    .bind(next_username)
    .bind(next_email)
    .bind(body.bio)
    .bind(body.status)
    .bind(body.custom_status)
    .bind(next_password_hash)
    .bind(body.voice_mic_muted)
    .bind(body.voice_headphones_muted)
    .fetch_one(&state.db)
    .await?;
    let user_id = user.try_get::<Uuid, _>("id")?;

    // Invalidate user cache after profile update
    let mut redis = state.redis.clone();
    cache::invalidate_user(&mut redis, user_id).await;
    let username = user.try_get::<String, _>("username")?;
    let discriminator = user.try_get::<String, _>("discriminator")?;
    let email = user.try_get::<String, _>("email")?;
    let avatar_url = user.try_get::<Option<String>, _>("avatar_url")?;
    let banner_url = user.try_get::<Option<String>, _>("banner_url")?;
    let bio = user.try_get::<Option<String>, _>("bio")?;
    let status = user.try_get::<String, _>("status")?;
    let custom_status = user.try_get::<Option<String>, _>("custom_status")?;
    let voice_mic_muted = user.try_get::<bool, _>("voice_mic_muted")?;
    let voice_headphones_muted = user.try_get::<bool, _>("voice_headphones_muted")?;
    let is_verified = user.try_get::<bool, _>("is_verified")?;
    let badges = user.try_get::<Vec<String>, _>("badges")?;
    let created_at = user.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at")?;

    let presence_event = json!({
        "t": "PRESENCE_UPDATE",
        "d": {
            "userId": user_id,
            "status": status,
            "customStatus": custom_status,
        }
    });

    let _ = publish(
        &state.redis.clone(),
        &user_channel(user_id),
        &presence_event.to_string(),
    )
    .await;

    let guild_ids =
        sqlx::query_scalar::<_, Uuid>("SELECT server_id FROM server_members WHERE user_id = $1")
            .bind(user_id)
            .fetch_all(&state.db)
            .await
            .unwrap_or_default();

    for guild_id in guild_ids {
        let _ = publish(
            &state.redis.clone(),
            &guild_channel(guild_id),
            &presence_event.to_string(),
        )
        .await;
    }
    let two_factor_enabled = get_two_factor_enabled(&state, user_id).await?;

    Ok(Json(json!({
        "data": {
            "id": user_id,
            "username": username,
            "discriminator": discriminator,
            "email": email,
            "avatarUrl": avatar_url,
            "bannerUrl": banner_url,
            "bio": bio,
            "status": status,
            "customStatus": custom_status,
            "voiceMicMuted": voice_mic_muted,
            "voiceHeadphonesMuted": voice_headphones_muted,
            "isVerified": is_verified,
            "badges": badges,
            "twoFactorEnabled": two_factor_enabled,
            "createdAt": created_at,
        }
    })))
}

pub async fn prepare_two_factor(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Json(body): Json<PrepareTwoFactorBody>,
) -> Result<Json<Value>> {
    let row = sqlx::query(
        r#"
        SELECT username, email, password_hash, two_factor_enabled
        FROM users
        WHERE id = $1
        "#,
    )
    .bind(user_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("User not found".into()))?;

    ensure_current_password_if_required(
        row.try_get::<Option<String>, _>("password_hash")?
            .as_deref(),
        body.current_password.as_deref(),
    )?;

    if row.try_get::<bool, _>("two_factor_enabled")? {
        return Err(AppError::Conflict(
            "Two-factor authentication is already enabled".into(),
        ));
    }

    let secret = generate_totp_secret_base32();
    let account_name = row.try_get::<String, _>("email")?;
    let issuer = "DCC";
    let (otpauth_url, qr_code_data_url) = build_totp_setup(&secret, &account_name, issuer)?;

    Ok(Json(json!({
        "data": {
            "secret": secret,
            "otpauthUrl": otpauth_url,
            "qrCodeDataUrl": qr_code_data_url,
            "accountName": account_name,
            "issuer": issuer,
        }
    })))
}

pub async fn enable_two_factor(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Json(body): Json<EnableTwoFactorBody>,
) -> Result<Json<Value>> {
    let secret = body.secret.trim();
    let code = body.code.trim();
    if secret.is_empty() {
        return Err(AppError::validation(
            "secret",
            "Two-factor secret is required",
        ));
    }
    if code.is_empty() {
        return Err(AppError::validation(
            "code",
            "Authentication code is required",
        ));
    }

    let row = sqlx::query(
        r#"
        SELECT email, password_hash, two_factor_enabled
        FROM users
        WHERE id = $1
        "#,
    )
    .bind(user_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("User not found".into()))?;

    ensure_current_password_if_required(
        row.try_get::<Option<String>, _>("password_hash")?
            .as_deref(),
        body.current_password.as_deref(),
    )?;

    if row.try_get::<bool, _>("two_factor_enabled")? {
        return Err(AppError::Conflict(
            "Two-factor authentication is already enabled".into(),
        ));
    }

    let account_name = row.try_get::<String, _>("email")?;
    if !verify_totp_code(secret, code, &account_name, "DCC")? {
        return Err(AppError::Unauthorized("Invalid two-factor code".into()));
    }

    let encrypted_secret = encrypt_sensitive_value(secret, &state.config.jwt_secret)?;
    let (backup_codes, backup_code_hashes) = generate_backup_codes(8);

    sqlx::query(
        r#"
        UPDATE users
        SET two_factor_enabled = TRUE,
            two_factor_secret_encrypted = $2,
            two_factor_backup_codes = $3
        WHERE id = $1
        "#,
    )
    .bind(user_id)
    .bind(encrypted_secret)
    .bind(backup_code_hashes)
    .execute(&state.db)
    .await?;

    Ok(Json(json!({
        "data": {
            "backupCodes": backup_codes
        }
    })))
}

pub async fn disable_two_factor(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Json(body): Json<DisableTwoFactorBody>,
) -> Result<Json<Value>> {
    let code = body.code.trim();
    if code.is_empty() {
        return Err(AppError::validation(
            "code",
            "Authentication code is required",
        ));
    }

    let row = sqlx::query(
        r#"
        SELECT email, password_hash, two_factor_enabled, two_factor_secret_encrypted, two_factor_backup_codes
        FROM users
        WHERE id = $1
        "#,
    )
    .bind(user_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("User not found".into()))?;

    ensure_current_password_if_required(
        row.try_get::<Option<String>, _>("password_hash")?
            .as_deref(),
        body.current_password.as_deref(),
    )?;

    if !row.try_get::<bool, _>("two_factor_enabled")? {
        return Ok(Json(json!({
            "data": {
                "message": "Two-factor authentication is already disabled"
            }
        })));
    }

    let encrypted_secret = row
        .try_get::<Option<String>, _>("two_factor_secret_encrypted")?
        .ok_or_else(|| {
            AppError::Unauthorized("Two-factor authentication is not configured correctly".into())
        })?;
    let secret = decrypt_sensitive_value(&encrypted_secret, &state.config.jwt_secret)?;
    let account_name = row.try_get::<String, _>("email")?;

    let is_totp_valid = verify_totp_code(&secret, code, &account_name, "DCC")?;
    let current_backup_codes = row
        .try_get::<Vec<String>, _>("two_factor_backup_codes")
        .unwrap_or_default();

    if !is_totp_valid {
        consume_backup_code(&current_backup_codes, code)
            .ok_or_else(|| AppError::Unauthorized("Invalid two-factor code".into()))?;
    }

    sqlx::query(
        r#"
        UPDATE users
        SET two_factor_enabled = FALSE,
            two_factor_secret_encrypted = NULL,
            two_factor_backup_codes = $2
        WHERE id = $1
        "#,
    )
    .bind(user_id)
    .bind(Vec::<String>::new())
    .execute(&state.db)
    .await?;

    Ok(Json(json!({
        "data": {
            "message": "Two-factor authentication disabled"
        }
    })))
}

pub async fn get_user(
    _auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>> {
    let mut redis = state.redis.clone();
    let user_opt = cache::get_or_fetch_user_public(&mut redis, id, async {
        let user = sqlx::query_as::<_, crate::models::user::UserPublic>(
            r#"SELECT id, username, discriminator, avatar_url, banner_url,
                      bio, status, custom_status, is_verified, badges, created_at
               FROM users WHERE id = $1"#,
        )
        .bind(id)
        .fetch_optional(&state.db)
        .await?;
        Ok(user)
    })
    .await?;

    let user = user_opt.ok_or_else(|| AppError::NotFound("User not found".into()))?;

    Ok(Json(json!({
        "data": {
            "id": user.id,
            "username": user.username,
            "discriminator": user.discriminator,
            "avatarUrl": user.avatar_url,
            "bannerUrl": user.banner_url,
            "bio": user.bio,
            "status": user.status,
            "customStatus": user.custom_status,
            "isVerified": user.is_verified,
            "badges": user.badges,
            "createdAt": user.created_at,
        }
    })))
}

pub async fn upload_avatar(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> Result<Json<Value>> {
    let mut file_data: Option<(Vec<u8>, String)> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("Multipart error: {e}")))?
    {
        let name = field.name().unwrap_or("").to_string();
        if name == "avatar" {
            let content_type = field
                .content_type()
                .map(|ct| ct.to_string())
                .unwrap_or_else(|| "application/octet-stream".to_string());
            let allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
            if !allowed.contains(&content_type.as_str()) {
                return Err(AppError::BadRequest(
                    "Only JPEG, PNG, GIF, and WebP images are allowed".into(),
                ));
            }
            let bytes = field
                .bytes()
                .await
                .map_err(|e| AppError::BadRequest(format!("Failed to read file: {e}")))?;
            if bytes.len() > 8 * 1024 * 1024 {
                return Err(AppError::BadRequest("Avatar must be under 8MB".into()));
            }
            file_data = Some((bytes.to_vec(), content_type));
        }
    }

    let (bytes, content_type) =
        file_data.ok_or_else(|| AppError::BadRequest("Missing avatar field".into()))?;

    // Store in configured storage — for now save to local /uploads dir
    // In production this would upload to S3/R2
    let ext = match content_type.as_str() {
        "image/jpeg" => "jpg",
        "image/png" => "png",
        "image/gif" => "gif",
        "image/webp" => "webp",
        _ => "bin",
    };
    let filename = format!("{}.{}", Uuid::new_v4(), ext);

    // Write to disk (placeholder — swap for S3/R2 in production)
    let uploads_dir = std::path::Path::new("uploads/avatars");
    tokio::fs::create_dir_all(uploads_dir)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to create uploads dir: {e}")))?;
    let path = uploads_dir.join(&filename);
    tokio::fs::write(&path, &bytes)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to write avatar: {e}")))?;

    let avatar_url = format!("/uploads/avatars/{}", filename);

    sqlx::query("UPDATE users SET avatar_url = $1 WHERE id = $2")
        .bind(&avatar_url)
        .bind(user_id)
        .execute(&state.db)
        .await?;

    // Invalidate user cache after avatar update
    let mut redis = state.redis.clone();
    cache::invalidate_user(&mut redis, user_id).await;

    Ok(Json(json!({ "data": { "avatarUrl": avatar_url } })))
}

pub async fn upload_banner(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> Result<Json<Value>> {
    let mut file_data: Option<(Vec<u8>, String)> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("Multipart error: {e}")))?
    {
        let name = field.name().unwrap_or("").to_string();
        if name == "banner" {
            let content_type = field
                .content_type()
                .map(|ct| ct.to_string())
                .unwrap_or_else(|| "application/octet-stream".to_string());
            let allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
            if !allowed.contains(&content_type.as_str()) {
                return Err(AppError::BadRequest(
                    "Only JPEG, PNG, GIF, and WebP images are allowed".into(),
                ));
            }
            let bytes = field
                .bytes()
                .await
                .map_err(|e| AppError::BadRequest(format!("Failed to read file: {e}")))?;
            if bytes.len() > 12 * 1024 * 1024 {
                return Err(AppError::BadRequest("Banner must be under 12MB".into()));
            }
            file_data = Some((bytes.to_vec(), content_type));
        }
    }

    let (bytes, content_type) =
        file_data.ok_or_else(|| AppError::BadRequest("Missing banner field".into()))?;

    let ext = match content_type.as_str() {
        "image/jpeg" => "jpg",
        "image/png" => "png",
        "image/gif" => "gif",
        "image/webp" => "webp",
        _ => "bin",
    };
    let filename = format!("{}.{}", Uuid::new_v4(), ext);

    let uploads_dir = std::path::Path::new("uploads/banners");
    tokio::fs::create_dir_all(uploads_dir)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to create uploads dir: {e}")))?;
    let path = uploads_dir.join(&filename);
    tokio::fs::write(&path, &bytes)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to write banner: {e}")))?;

    let banner_url = format!("/uploads/banners/{}", filename);

    sqlx::query("UPDATE users SET banner_url = $1 WHERE id = $2")
        .bind(&banner_url)
        .bind(user_id)
        .execute(&state.db)
        .await?;

    // Invalidate user cache after banner update
    let mut redis = state.redis.clone();
    cache::invalidate_user(&mut redis, user_id).await;

    Ok(Json(json!({ "data": { "bannerUrl": banner_url } })))
}

async fn get_two_factor_enabled(state: &AppState, user_id: Uuid) -> Result<bool> {
    Ok(
        sqlx::query_scalar::<_, bool>("SELECT two_factor_enabled FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_optional(&state.db)
            .await?
            .unwrap_or(false),
    )
}

fn ensure_current_password_if_required(
    password_hash: Option<&str>,
    current_password: Option<&str>,
) -> Result<()> {
    if let Some(hash) = password_hash {
        let current_password = current_password
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .ok_or_else(|| {
                AppError::validation("currentPassword", "Current password is required")
            })?;

        if !verify_password(current_password, hash)? {
            return Err(AppError::validation(
                "currentPassword",
                "Current password is incorrect",
            ));
        }
    }

    Ok(())
}
