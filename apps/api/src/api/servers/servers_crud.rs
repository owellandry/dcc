use super::*;
use std::collections::HashSet;
use crate::api::servers::common::{
    can_manage_default_category, ensure_member, ensure_owner, ensure_owner_or_manage_server,
    is_default_restricted_category_name,
};

#[derive(Deserialize)]
pub struct CreateServerBody {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateServerBody {
    pub name: Option<String>,
    pub description: Option<String>,
    pub is_public: Option<bool>,
    pub icon_url: Option<String>,
    pub banner_url: Option<String>,
    pub invite_code: Option<String>,
}

pub async fn list_my_servers(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
) -> Result<Json<Value>> {
    let servers = sqlx::query!(
        r#"SELECT s.id, s.name, s.description, s.icon_url, s.banner_url,
                  s.owner_id, s.invite_code, s.is_public, s.member_count, s.created_at
           FROM servers s
           JOIN server_members sm ON sm.server_id = s.id
           WHERE sm.user_id = $1
           ORDER BY sm.joined_at ASC"#,
        user_id
    )
    .fetch_all(&state.db)
    .await?;

    let data: Vec<Value> = servers
        .into_iter()
        .map(|s| json!({
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "iconUrl": s.icon_url,
            "bannerUrl": s.banner_url,
            "ownerId": s.owner_id,
            "inviteCode": s.invite_code,
            "isPublic": s.is_public,
            "memberCount": s.member_count,
            "createdAt": s.created_at,
        }))
        .collect();

    Ok(Json(json!({ "data": data })))
}

pub async fn get_server(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(server_id): Path<Uuid>,
) -> Result<Json<Value>> {
    ensure_member(&state, user_id, server_id).await?;

    let s = sqlx::query!(
        r#"SELECT id, name, description, icon_url, banner_url,
                  owner_id, invite_code, is_public, member_count, created_at
           FROM servers WHERE id = $1"#,
        server_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Server not found".into()))?;

    let categories = sqlx::query!(
        "SELECT id, name, position FROM categories WHERE server_id = $1 ORDER BY position",
        server_id
    )
    .fetch_all(&state.db)
    .await?;

    let channels = sqlx::query!(
        r#"SELECT id, server_id, category_id, name, topic, channel_type,
                  position, is_nsfw, slowmode_seconds, last_message_id, created_at
           FROM channels WHERE server_id = $1 ORDER BY position"#,
        server_id
    )
    .fetch_all(&state.db)
    .await?;

    let can_manage_default_category = can_manage_default_category(&state, user_id, server_id).await?;
    let restricted_category_ids: HashSet<Uuid> = categories
        .iter()
        .filter(|category| is_default_restricted_category_name(&category.name))
        .map(|category| category.id)
        .collect();

    let cats: Vec<Value> = categories
        .into_iter()
        .map(|c| json!({
            "id": c.id,
            "serverId": server_id,
            "name": c.name,
            "position": c.position
        }))
        .collect();

    let chans: Vec<Value> = channels
        .into_iter()
        .map(|c| json!({
            "id": c.id,
            "serverId": c.server_id,
            "categoryId": c.category_id,
            "name": c.name,
            "topic": c.topic,
            "type": c.channel_type,
            "position": c.position,
            "isNsfw": c.is_nsfw,
            "slowmodeSeconds": c.slowmode_seconds,
            "lastMessageId": c.last_message_id,
            "createdAt": c.created_at,
            "canSendMessages": c
                .category_id
                .map(|category_id| !restricted_category_ids.contains(&category_id) || can_manage_default_category)
                .unwrap_or(true),
        }))
        .collect();

    Ok(Json(json!({
        "data": {
            "server": {
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "iconUrl": s.icon_url,
                "bannerUrl": s.banner_url,
                "ownerId": s.owner_id,
                "inviteCode": s.invite_code,
                "isPublic": s.is_public,
                "memberCount": s.member_count,
                "createdAt": s.created_at,
            },
            "categories": cats,
            "channels": chans,
        }
    })))
}

pub async fn create_server(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Json(body): Json<CreateServerBody>,
) -> Result<Json<Value>> {
    let name = body.name.trim().to_string();
    if name.is_empty() || name.len() > 100 {
        return Err(AppError::validation("name", "Name must be 1–100 characters"));
    }

    let invite_code = generate_invite_code();
    let server_id = Uuid::new_v4();
    let cat_info_id = Uuid::new_v4();
    let cat_gen_id = Uuid::new_v4();
    let ch_reglas_id = Uuid::new_v4();
    let ch_bienvenida_id = Uuid::new_v4();
    let ch_general_id = Uuid::new_v4();
    let ch_voz_id = Uuid::new_v4();

    let mut tx = state.db.begin().await?;

    sqlx::query!(
        r#"INSERT INTO servers (id, name, description, owner_id, invite_code)
           VALUES ($1, $2, $3, $4, $5)"#,
        server_id,
        name,
        body.description,
        user_id,
        invite_code,
    )
    .execute(&mut *tx)
    .await?;

    sqlx::query!(
        "INSERT INTO server_members (server_id, user_id) VALUES ($1, $2)",
        server_id,
        user_id
    )
    .execute(&mut *tx)
    .await?;

    sqlx::query!(
        "INSERT INTO categories (id, server_id, name, position) VALUES ($1, $2, $3, $4)",
        cat_info_id,
        server_id,
        "INFORMACIÓN",
        0
    )
    .execute(&mut *tx)
    .await?;

    sqlx::query!(
        "INSERT INTO categories (id, server_id, name, position) VALUES ($1, $2, $3, $4)",
        cat_gen_id,
        server_id,
        "GENERAL",
        1
    )
    .execute(&mut *tx)
    .await?;

    sqlx::query!(
        r#"INSERT INTO channels (id, server_id, category_id, name, channel_type, position)
           VALUES ($1, $2, $3, 'reglas', 'text', 0)"#,
        ch_reglas_id,
        server_id,
        cat_info_id
    )
    .execute(&mut *tx)
    .await?;

    sqlx::query!(
        r#"INSERT INTO channels (id, server_id, category_id, name, channel_type, position)
           VALUES ($1, $2, $3, 'bienvenida', 'text', 1)"#,
        ch_bienvenida_id,
        server_id,
        cat_info_id
    )
    .execute(&mut *tx)
    .await?;

    sqlx::query!(
        r#"INSERT INTO channels (id, server_id, category_id, name, channel_type, position)
           VALUES ($1, $2, $3, 'chat-general', 'text', 0)"#,
        ch_general_id,
        server_id,
        cat_gen_id
    )
    .execute(&mut *tx)
    .await?;

    sqlx::query!(
        r#"INSERT INTO channels (id, server_id, category_id, name, channel_type, position)
           VALUES ($1, $2, $3, 'voz-general', 'voice', 1)"#,
        ch_voz_id,
        server_id,
        cat_gen_id
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    let s = sqlx::query!(
        r#"SELECT id, name, description, icon_url, banner_url,
                  owner_id, invite_code, is_public, member_count, created_at
           FROM servers WHERE id = $1"#,
        server_id
    )
    .fetch_one(&state.db)
    .await?;

    let channels = sqlx::query!(
        r#"SELECT id, server_id, category_id, name, topic, channel_type,
                  position, is_nsfw, slowmode_seconds, last_message_id, created_at
           FROM channels WHERE server_id = $1 ORDER BY category_id, position"#,
        server_id
    )
    .fetch_all(&state.db)
    .await?;

    let categories = sqlx::query!(
        "SELECT id, server_id, name, position FROM categories WHERE server_id = $1 ORDER BY position",
        server_id
    )
    .fetch_all(&state.db)
    .await?;

    let chans: Vec<Value> = channels
        .into_iter()
        .map(|c| json!({
            "id": c.id,
            "serverId": c.server_id,
            "categoryId": c.category_id,
            "name": c.name,
            "topic": c.topic,
            "type": c.channel_type,
            "position": c.position,
            "isNsfw": c.is_nsfw,
            "slowmodeSeconds": c.slowmode_seconds,
            "lastMessageId": c.last_message_id,
            "createdAt": c.created_at,
            "canSendMessages": true,
        }))
        .collect();

    let cats: Vec<Value> = categories
        .into_iter()
        .map(|c| json!({
            "id": c.id,
            "serverId": c.server_id,
            "name": c.name,
            "position": c.position,
        }))
        .collect();

    Ok(Json(json!({
        "data": {
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "iconUrl": s.icon_url,
            "bannerUrl": s.banner_url,
            "ownerId": s.owner_id,
            "inviteCode": s.invite_code,
            "isPublic": s.is_public,
            "memberCount": s.member_count,
            "createdAt": s.created_at,
            "channels": chans,
            "categories": cats,
        }
    })))
}

pub async fn update_server(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(server_id): Path<Uuid>,
    Json(body): Json<UpdateServerBody>,
) -> Result<Json<Value>> {
    ensure_owner_or_manage_server(&state, user_id, server_id).await?;

    let invite_code = if let Some(raw_invite_code) = body.invite_code {
        let normalized = raw_invite_code.trim().to_ascii_lowercase();
        if normalized.is_empty() {
            return Err(AppError::validation("inviteCode", "Invite code cannot be empty"));
        }
        if normalized.len() < 3 || normalized.len() > 32 {
            return Err(AppError::validation("inviteCode", "Invite code must be between 3 and 32 characters"));
        }
        if !normalized
            .chars()
            .all(|ch| ch.is_ascii_lowercase() || ch.is_ascii_digit() || ch == '-' || ch == '_')
        {
            return Err(AppError::validation("inviteCode", "Use only lowercase letters, numbers, '-' and '_'"));
        }

        let is_taken = sqlx::query_scalar!(
            r#"SELECT EXISTS(
                SELECT 1
                FROM servers
                WHERE invite_code = $1
                  AND id <> $2
            )"#,
            normalized,
            server_id
        )
        .fetch_one(&state.db)
        .await?
        .unwrap_or(false);

        if is_taken {
            return Err(AppError::Conflict("El codigo de invitacion ya esta en uso.".into()));
        }

        Some(normalized)
    } else {
        None
    };

    let s = sqlx::query!(
        r#"UPDATE servers
           SET name        = COALESCE($2, name),
               description = COALESCE($3, description),
               is_public   = COALESCE($4, is_public),
               icon_url    = COALESCE($5, icon_url),
               banner_url  = COALESCE($6, banner_url),
               invite_code = COALESCE($7, invite_code)
           WHERE id = $1
           RETURNING id, name, description, icon_url, banner_url,
                     owner_id, invite_code, is_public, member_count, created_at"#,
        server_id,
        body.name,
        body.description,
        body.is_public,
        body.icon_url,
        body.banner_url,
        invite_code,
    )
    .fetch_one(&state.db)
    .await?;

    Ok(Json(json!({
        "data": {
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "iconUrl": s.icon_url,
            "bannerUrl": s.banner_url,
            "ownerId": s.owner_id,
            "inviteCode": s.invite_code,
            "isPublic": s.is_public,
            "memberCount": s.member_count,
            "createdAt": s.created_at,
        }
    })))
}

pub async fn upload_server_icon(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(server_id): Path<Uuid>,
    mut multipart: Multipart,
) -> Result<Json<Value>> {
    ensure_owner(&state, user_id, server_id).await?;

    let mut file_data: Option<(Vec<u8>, String)> = None;

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        AppError::BadRequest(format!("Multipart error: {e}"))
    })? {
        let name = field.name().unwrap_or("").to_string();
        if name == "icon" {
            let content_type = field
                .content_type()
                .map(|ct| ct.to_string())
                .unwrap_or_else(|| "application/octet-stream".to_string());
            let allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
            if !allowed.contains(&content_type.as_str()) {
                return Err(AppError::BadRequest("Only JPEG, PNG, GIF, and WebP images are allowed".into()));
            }
            let bytes = field.bytes().await.map_err(|e| {
                AppError::BadRequest(format!("Failed to read file: {e}"))
            })?;
            if bytes.len() > 8 * 1024 * 1024 {
                return Err(AppError::BadRequest("Icon must be under 8MB".into()));
            }
            file_data = Some((bytes.to_vec(), content_type));
        }
    }

    let (bytes, content_type) = file_data
        .ok_or_else(|| AppError::BadRequest("Missing icon field".into()))?;

    let ext = match content_type.as_str() {
        "image/jpeg" => "jpg",
        "image/png" => "png",
        "image/gif" => "gif",
        "image/webp" => "webp",
        _ => "bin",
    };
    let filename = format!("{}.{}", Uuid::new_v4(), ext);

    let uploads_dir = std::path::Path::new("uploads/server-icons");
    tokio::fs::create_dir_all(uploads_dir).await.map_err(|e| {
        AppError::Internal(anyhow::anyhow!("Failed to create uploads dir: {e}"))
    })?;
    let path = uploads_dir.join(&filename);
    tokio::fs::write(&path, &bytes).await.map_err(|e| {
        AppError::Internal(anyhow::anyhow!("Failed to write icon: {e}"))
    })?;

    let icon_url = format!("/uploads/server-icons/{}", filename);

    sqlx::query!(
        "UPDATE servers SET icon_url = $1 WHERE id = $2",
        icon_url,
        server_id
    )
    .execute(&state.db)
    .await?;

    Ok(Json(json!({ "data": { "iconUrl": icon_url } })))
}

pub async fn upload_server_banner(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(server_id): Path<Uuid>,
    mut multipart: Multipart,
) -> Result<Json<Value>> {
    ensure_owner(&state, user_id, server_id).await?;

    let mut file_data: Option<(Vec<u8>, String)> = None;

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        AppError::BadRequest(format!("Multipart error: {e}"))
    })? {
        let name = field.name().unwrap_or("").to_string();
        if name == "banner" {
            let content_type = field
                .content_type()
                .map(|ct| ct.to_string())
                .unwrap_or_else(|| "application/octet-stream".to_string());
            let allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
            if !allowed.contains(&content_type.as_str()) {
                return Err(AppError::BadRequest("Only JPEG, PNG, GIF, and WebP images are allowed".into()));
            }
            let bytes = field.bytes().await.map_err(|e| {
                AppError::BadRequest(format!("Failed to read file: {e}"))
            })?;
            if bytes.len() > 12 * 1024 * 1024 {
                return Err(AppError::BadRequest("Banner must be under 12MB".into()));
            }
            file_data = Some((bytes.to_vec(), content_type));
        }
    }

    let (bytes, content_type) = file_data
        .ok_or_else(|| AppError::BadRequest("Missing banner field".into()))?;

    let ext = match content_type.as_str() {
        "image/jpeg" => "jpg",
        "image/png" => "png",
        "image/gif" => "gif",
        "image/webp" => "webp",
        _ => "bin",
    };
    let filename = format!("{}.{}", Uuid::new_v4(), ext);

    let uploads_dir = std::path::Path::new("uploads/server-banners");
    tokio::fs::create_dir_all(uploads_dir).await.map_err(|e| {
        AppError::Internal(anyhow::anyhow!("Failed to create uploads dir: {e}"))
    })?;
    let path = uploads_dir.join(&filename);
    tokio::fs::write(&path, &bytes).await.map_err(|e| {
        AppError::Internal(anyhow::anyhow!("Failed to write banner: {e}"))
    })?;

    let banner_url = format!("/uploads/server-banners/{}", filename);

    sqlx::query!(
        "UPDATE servers SET banner_url = $1 WHERE id = $2",
        banner_url,
        server_id
    )
    .execute(&state.db)
    .await?;

    Ok(Json(json!({ "data": { "bannerUrl": banner_url } })))
}

pub async fn delete_server(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(server_id): Path<Uuid>,
) -> Result<Json<Value>> {
    ensure_owner(&state, user_id, server_id).await?;

    sqlx::query!("DELETE FROM servers WHERE id = $1", server_id)
        .execute(&state.db)
        .await?;

    Ok(Json(json!({ "data": null })))
}
