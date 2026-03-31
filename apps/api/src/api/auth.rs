use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::{IntoResponse, Redirect, Response},
    Json,
};
use axum_extra::extract::cookie::{Cookie, CookieJar};
use chrono::{Duration, Utc};
use serde::Deserialize;
use serde_json::json;
use sqlx::Row;
use time::Duration as TimeDuration;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    middleware::auth::AuthUser,
    services::auth::{
        consume_backup_code, decrypt_sensitive_value, generate_access_token,
        generate_discriminator, generate_refresh_token, generate_verification_token, hash_password,
        verify_password, verify_totp_code,
    },
    state::AppState,
};

// ── Request bodies ────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct RegisterBody {
    pub username: String,
    pub email: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct LoginBody {
    pub login: String,
    pub password: String,
    #[serde(rename = "twoFactorCode")]
    pub two_factor_code: Option<String>,
}

#[derive(Deserialize)]
pub struct VerifyEmailBody {
    pub token: String,
}

#[derive(Deserialize)]
pub struct OAuthCallback {
    pub code: String,
    #[serde(rename = "state")]
    pub _state: Option<String>,
}

// ── Handlers ──────────────────────────────────────────────────────────────────

pub async fn register(
    State(state): State<AppState>,
    Json(body): Json<RegisterBody>,
) -> Result<impl IntoResponse> {
    // Validate
    if body.username.len() < 2 || body.username.len() > 32 {
        return Err(AppError::validation(
            "username",
            "Username must be 2–32 characters",
        ));
    }
    if !body
        .username
        .chars()
        .all(|c| c.is_alphanumeric() || c == '.' || c == '_' || c == '-')
    {
        return Err(AppError::validation(
            "username",
            "Username can only contain letters, numbers, dots, underscores, and dashes",
        ));
    }
    if body.password.len() < 8 {
        return Err(AppError::validation(
            "password",
            "Password must be at least 8 characters",
        ));
    }
    if !body.email.contains('@') {
        return Err(AppError::validation("email", "Invalid email address"));
    }

    // Check uniqueness
    let email_exists: bool = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)",
        body.email
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(false);

    if email_exists {
        return Err(AppError::validation("email", "Email already in use"));
    }

    let username_exists: bool = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)",
        body.username
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(false);

    if username_exists {
        return Err(AppError::validation("username", "Username already taken"));
    }

    let password_hash = hash_password(&body.password)?;
    let discriminator = generate_discriminator();
    let user_id = Uuid::new_v4();

    sqlx::query!(
        r#"
        INSERT INTO users (id, username, discriminator, email, password_hash)
        VALUES ($1, $2, $3, $4, $5)
        "#,
        user_id,
        body.username,
        discriminator,
        body.email,
        password_hash,
    )
    .execute(&state.db)
    .await?;

    // Create verification token
    let verification_token = generate_verification_token();
    let expires_at = Utc::now() + Duration::hours(24);

    sqlx::query!(
        "INSERT INTO email_verifications (user_id, token, expires_at) VALUES ($1, $2, $3)",
        user_id,
        verification_token,
        expires_at,
    )
    .execute(&state.db)
    .await?;

    let verification_url = build_verification_url(&state, &verification_token);
    log_verification_link(&body.email, &verification_token, &verification_url);

    Ok((
        StatusCode::CREATED,
        Json(json!({
            "data": {
                "message": "Registration successful. Please check your email.",
                "verificationUrl": expose_verification_url(&state).then_some(verification_url),
            }
        })),
    ))
}

pub async fn login(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(body): Json<LoginBody>,
) -> Result<(CookieJar, impl IntoResponse)> {
    let login = body.login.trim();
    if login.is_empty() {
        return Err(AppError::validation(
            "login",
            "Username or email is required",
        ));
    }

    let user = sqlx::query(
        r#"
        SELECT id, username, email, password_hash, is_verified, two_factor_enabled,
               two_factor_secret_encrypted, two_factor_backup_codes
        FROM users
        WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)
        LIMIT 1
        "#,
    )
    .bind(login)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::Unauthorized("Invalid credentials".into()))?;

    let password_hash = user.try_get::<Option<String>, _>("password_hash")?;
    let hash = password_hash
        .as_deref()
        .ok_or_else(|| AppError::BadRequest("This account uses OAuth login".into()))?;

    if !verify_password(&body.password, hash)? {
        return Err(AppError::Unauthorized("Invalid credentials".into()));
    }

    let user_id = user.try_get::<Uuid, _>("id")?;
    let two_factor_enabled = user.try_get::<bool, _>("two_factor_enabled")?;

    if two_factor_enabled {
        let provided_code = body
            .two_factor_code
            .as_deref()
            .map(str::trim)
            .filter(|code| !code.is_empty());

        let Some(code) = provided_code else {
            return Ok((
                jar,
                Json(json!({
                    "data": {
                        "requiresTwoFactor": true
                    }
                })),
            ));
        };

        let encrypted_secret = user
            .try_get::<Option<String>, _>("two_factor_secret_encrypted")?
            .ok_or_else(|| {
                AppError::Unauthorized(
                    "Two-factor authentication is not configured correctly".into(),
                )
            })?;
        let secret = decrypt_sensitive_value(&encrypted_secret, &state.config.jwt_secret)?;
        let account_name = user.try_get::<String, _>("email")?;
        let issuer = "DCC";

        let is_totp_valid = verify_totp_code(&secret, code, &account_name, issuer)?;

        if !is_totp_valid {
            let backup_hashes = user
                .try_get::<Vec<String>, _>("two_factor_backup_codes")
                .unwrap_or_default();

            if let Some(next_backup_hashes) = consume_backup_code(&backup_hashes, code) {
                sqlx::query("UPDATE users SET two_factor_backup_codes = $2 WHERE id = $1")
                    .bind(user_id)
                    .bind(next_backup_hashes)
                    .execute(&state.db)
                    .await?;
            } else {
                return Err(AppError::Unauthorized("Invalid two-factor code".into()));
            }
        }
    }

    let access_token = generate_access_token(
        user_id,
        &state.config.jwt_secret,
        state.config.access_token_expiry_minutes,
    )?;

    let refresh_token = generate_refresh_token();
    let refresh_expires = Utc::now() + Duration::days(state.config.refresh_token_expiry_days);

    // Hash the refresh token before storing
    let token_hash = sha256_hex(&refresh_token);

    sqlx::query!(
        "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
        user_id,
        token_hash,
        refresh_expires,
    )
    .execute(&state.db)
    .await?;

    let cookie = build_refresh_cookie(&state, refresh_token);

    Ok((
        jar.add(cookie),
        Json(json!({ "data": { "accessToken": access_token } })),
    ))
}

pub async fn logout(
    State(state): State<AppState>,
    jar: CookieJar,
) -> Result<(CookieJar, impl IntoResponse)> {
    if let Some(refresh_cookie) = jar.get("refresh_token") {
        let token_hash = sha256_hex(refresh_cookie.value());
        sqlx::query!(
            "DELETE FROM refresh_tokens WHERE token_hash = $1",
            token_hash
        )
        .execute(&state.db)
        .await?;
    }

    let removed = build_removed_refresh_cookie(&state);

    Ok((
        jar.remove(removed),
        Json(json!({ "data": { "message": "Logged out" } })),
    ))
}

pub async fn refresh(State(state): State<AppState>, jar: CookieJar) -> Result<Response> {
    let Some(refresh_token) = jar.get("refresh_token").map(|c| c.value().to_string()) else {
        return Ok(StatusCode::NO_CONTENT.into_response());
    };

    let token_hash = sha256_hex(&refresh_token);

    let Some(row) = sqlx::query!(
        r#"
        SELECT rt.user_id, rt.expires_at
        FROM refresh_tokens rt
        WHERE rt.token_hash = $1
        "#,
        token_hash,
    )
    .fetch_optional(&state.db)
    .await?
    else {
        return Ok(StatusCode::NO_CONTENT.into_response());
    };

    if row.expires_at < Utc::now() {
        sqlx::query!(
            "DELETE FROM refresh_tokens WHERE token_hash = $1",
            token_hash
        )
        .execute(&state.db)
        .await?;
        return Ok(StatusCode::NO_CONTENT.into_response());
    }

    let access_token = generate_access_token(
        row.user_id,
        &state.config.jwt_secret,
        state.config.access_token_expiry_minutes,
    )?;

    Ok(Json(json!({ "data": { "accessToken": access_token } })).into_response())
}

pub async fn verify_email(
    State(state): State<AppState>,
    Json(body): Json<VerifyEmailBody>,
) -> Result<impl IntoResponse> {
    let row = sqlx::query!(
        "SELECT user_id, expires_at FROM email_verifications WHERE token = $1",
        body.token,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::BadRequest("Invalid or expired token".into()))?;

    if row.expires_at < Utc::now() {
        sqlx::query!(
            "DELETE FROM email_verifications WHERE token = $1",
            body.token
        )
        .execute(&state.db)
        .await?;
        return Err(AppError::BadRequest("Token has expired".into()));
    }

    sqlx::query!(
        "UPDATE users SET is_verified = TRUE WHERE id = $1",
        row.user_id,
    )
    .execute(&state.db)
    .await?;

    sqlx::query!(
        "DELETE FROM email_verifications WHERE token = $1",
        body.token
    )
    .execute(&state.db)
    .await?;

    Ok(Json(
        json!({ "data": { "message": "Email verified successfully" } }),
    ))
}

pub async fn resend_verification(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
) -> Result<impl IntoResponse> {
    // Delete old tokens
    sqlx::query!(
        "DELETE FROM email_verifications WHERE user_id = $1",
        user_id
    )
    .execute(&state.db)
    .await?;

    let token = generate_verification_token();
    let expires_at = Utc::now() + Duration::hours(24);

    sqlx::query!(
        "INSERT INTO email_verifications (user_id, token, expires_at) VALUES ($1, $2, $3)",
        user_id,
        token,
        expires_at,
    )
    .execute(&state.db)
    .await?;

    let verification_url = build_verification_url(&state, &token);
    log_verification_link(&user_id.to_string(), &token, &verification_url);

    Ok(Json(json!({
        "data": {
            "message": "Verification email sent",
            "verificationUrl": expose_verification_url(&state).then_some(verification_url),
        }
    })))
}

// ── OAuth (stubs) ─────────────────────────────────────────────────────────────

pub async fn oauth_google_redirect(State(state): State<AppState>) -> impl IntoResponse {
    let url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope=openid%20email%20profile&state=dcc",
        state.config.google_client_id,
        urlencoding::encode(&state.config.google_redirect_uri),
    );
    Redirect::temporary(&url)
}

pub async fn oauth_google_callback(
    State(state): State<AppState>,
    Query(params): Query<OAuthCallback>,
    jar: CookieJar,
) -> Result<impl IntoResponse> {
    let token_resp = reqwest::Client::new()
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("code", params.code.as_str()),
            ("client_id", state.config.google_client_id.as_str()),
            ("client_secret", state.config.google_client_secret.as_str()),
            ("redirect_uri", state.config.google_redirect_uri.as_str()),
            ("grant_type", "authorization_code"),
        ])
        .send()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("OAuth request failed: {}", e)))?;

    let token_json: serde_json::Value = token_resp
        .json()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("OAuth response parse failed: {}", e)))?;

    let id_token = token_json["id_token"]
        .as_str()
        .ok_or_else(|| AppError::BadRequest("No id_token in OAuth response".into()))?;

    // Decode without verification just to get the email (validate properly in prod)
    let parts: Vec<&str> = id_token.split('.').collect();
    if parts.len() < 2 {
        return Err(AppError::BadRequest("Invalid id_token".into()));
    }
    let payload = base64_decode_url(parts[1])?;
    let claims: serde_json::Value = serde_json::from_str(&payload)
        .map_err(|_| AppError::BadRequest("Cannot parse id_token claims".into()))?;

    let email = claims["email"]
        .as_str()
        .ok_or_else(|| AppError::BadRequest("No email in token".into()))?
        .to_string();
    let name = claims["name"].as_str().unwrap_or("user").to_string();
    let avatar_url = claims["picture"].as_str().map(|s| s.to_string());

    let (user_id, _) = upsert_oauth_user(&state, &email, &name, avatar_url).await?;
    let access_token = generate_access_token(
        user_id,
        &state.config.jwt_secret,
        state.config.access_token_expiry_minutes,
    )?;
    let refresh_token = set_refresh_cookie(&state, user_id).await?;

    let cookie = build_refresh_cookie(&state, refresh_token);

    let redirect_url = format!(
        "{}/channels/@me?token={}",
        state.config.app_url, access_token
    );
    Ok((jar.add(cookie), Redirect::temporary(&redirect_url)))
}

pub async fn oauth_github_redirect(State(state): State<AppState>) -> impl IntoResponse {
    let url = format!(
        "https://github.com/login/oauth/authorize?client_id={}&redirect_uri={}&scope=user:email&state=dcc",
        state.config.github_client_id,
        urlencoding::encode(&state.config.github_redirect_uri),
    );
    Redirect::temporary(&url)
}

pub async fn oauth_github_callback(
    State(state): State<AppState>,
    Query(params): Query<OAuthCallback>,
    jar: CookieJar,
) -> Result<impl IntoResponse> {
    let client = reqwest::Client::new();

    let token_resp: serde_json::Value = client
        .post("https://github.com/login/oauth/access_token")
        .header("Accept", "application/json")
        .form(&[
            ("code", params.code.as_str()),
            ("client_id", state.config.github_client_id.as_str()),
            ("client_secret", state.config.github_client_secret.as_str()),
        ])
        .send()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("GitHub OAuth failed: {}", e)))?
        .json()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("GitHub OAuth parse failed: {}", e)))?;

    let gh_token = token_resp["access_token"]
        .as_str()
        .ok_or_else(|| AppError::BadRequest("No access_token from GitHub".into()))?
        .to_string();

    let user_info: serde_json::Value = client
        .get("https://api.github.com/user")
        .header("Authorization", format!("Bearer {}", gh_token))
        .header("User-Agent", "dcc-api/1.0")
        .send()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("GitHub user fetch failed: {}", e)))?
        .json()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("GitHub user parse failed: {}", e)))?;

    let email = if let Some(e) = user_info["email"].as_str().filter(|e| !e.is_empty()) {
        e.to_string()
    } else {
        // Fetch primary email separately
        let emails: Vec<serde_json::Value> = client
            .get("https://api.github.com/user/emails")
            .header("Authorization", format!("Bearer {}", gh_token))
            .header("User-Agent", "dcc-api/1.0")
            .send()
            .await
            .map_err(|e| AppError::Internal(anyhow::anyhow!("GitHub emails fetch failed: {}", e)))?
            .json()
            .await
            .map_err(|e| {
                AppError::Internal(anyhow::anyhow!("GitHub emails parse failed: {}", e))
            })?;

        emails
            .iter()
            .find(|e| e["primary"].as_bool().unwrap_or(false))
            .and_then(|e| e["email"].as_str())
            .unwrap_or("unknown@github.com")
            .to_string()
    };

    let name = user_info["login"].as_str().unwrap_or("user").to_string();
    let avatar_url = user_info["avatar_url"].as_str().map(|s| s.to_string());

    let (user_id, _) = upsert_oauth_user(&state, &email, &name, avatar_url).await?;
    let access_token = generate_access_token(
        user_id,
        &state.config.jwt_secret,
        state.config.access_token_expiry_minutes,
    )?;
    let refresh_token = set_refresh_cookie(&state, user_id).await?;

    let cookie = build_refresh_cookie(&state, refresh_token);

    let redirect_url = format!(
        "{}/channels/@me?token={}",
        state.config.app_url, access_token
    );
    Ok((jar.add(cookie), Redirect::temporary(&redirect_url)))
}

// ── Helpers ───────────────────────────────────────────────────────────────────

pub fn sha256_hex(input: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn base64_decode_url(input: &str) -> crate::error::Result<String> {
    use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
    let decoded = URL_SAFE_NO_PAD
        .decode(input)
        .map_err(|_| AppError::BadRequest("Invalid base64".into()))?;
    String::from_utf8(decoded).map_err(|_| AppError::BadRequest("Invalid UTF-8 in token".into()))
}

async fn upsert_oauth_user(
    state: &AppState,
    email: &str,
    name: &str,
    avatar_url: Option<String>,
) -> Result<(Uuid, bool)> {
    if let Some(row) = sqlx::query!("SELECT id FROM users WHERE email = $1", email)
        .fetch_optional(&state.db)
        .await?
    {
        return Ok((row.id, false));
    }

    // New user
    let user_id = Uuid::new_v4();
    let username = sanitize_username(name);
    let discriminator = generate_discriminator();

    sqlx::query!(
        r#"
        INSERT INTO users (id, username, discriminator, email, avatar_url, is_verified)
        VALUES ($1, $2, $3, $4, $5, TRUE)
        "#,
        user_id,
        username,
        discriminator,
        email,
        avatar_url,
    )
    .execute(&state.db)
    .await?;

    Ok((user_id, true))
}

async fn set_refresh_cookie(state: &AppState, user_id: Uuid) -> Result<String> {
    let refresh_token = generate_refresh_token();
    let token_hash = sha256_hex(&refresh_token);
    let expires_at = Utc::now() + Duration::days(state.config.refresh_token_expiry_days);

    sqlx::query!(
        "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
        user_id,
        token_hash,
        expires_at,
    )
    .execute(&state.db)
    .await?;

    Ok(refresh_token)
}

fn build_refresh_cookie(state: &AppState, refresh_token: String) -> Cookie<'static> {
    Cookie::build(("refresh_token", refresh_token))
        .http_only(true)
        .secure(should_use_secure_cookie(state))
        .same_site(refresh_cookie_same_site(state))
        .max_age(TimeDuration::days(state.config.refresh_token_expiry_days))
        .path("/")
        .build()
}

fn build_removed_refresh_cookie(state: &AppState) -> Cookie<'static> {
    Cookie::build(("refresh_token", ""))
        .http_only(true)
        .secure(should_use_secure_cookie(state))
        .same_site(refresh_cookie_same_site(state))
        .path("/")
        .max_age(TimeDuration::seconds(0))
        .build()
}

fn should_use_secure_cookie(state: &AppState) -> bool {
    state.config.app_url.starts_with("https://") || state.config.api_url.starts_with("https://")
}

fn refresh_cookie_same_site(state: &AppState) -> axum_extra::extract::cookie::SameSite {
    let app_host = extract_host(&state.config.app_url);
    let api_host = extract_host(&state.config.api_url);

    match (app_host, api_host) {
        (Some(app_host), Some(api_host)) if app_host.eq_ignore_ascii_case(api_host) => {
            axum_extra::extract::cookie::SameSite::Strict
        }
        _ => axum_extra::extract::cookie::SameSite::None,
    }
}

fn sanitize_username(name: &str) -> String {
    let s: String = name
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-' || *c == '.')
        .take(32)
        .collect();
    if s.len() < 2 {
        format!("user{}", &Uuid::new_v4().to_string()[..6])
    } else {
        s.to_lowercase()
    }
}

fn build_verification_url(state: &AppState, token: &str) -> String {
    format!(
        "{}/verify-email?token={}",
        state.config.app_url.trim_end_matches('/'),
        urlencoding::encode(token),
    )
}

fn expose_verification_url(state: &AppState) -> bool {
    state.config.app_urls.iter().any(|url| {
        url.contains("localhost")
            || url.contains("127.0.0.1")
            || url.contains("192.168.")
            || url.contains("10.")
            || url.contains("172.16.")
    })
}

fn extract_host(url: &str) -> Option<&str> {
    let (_, rest) = url.split_once("://")?;
    let authority = rest.split(['/', '?', '#']).next()?.trim();
    let host = authority
        .trim_start_matches('[')
        .trim_end_matches(']')
        .split(':')
        .next()?
        .trim();

    if host.is_empty() {
        None
    } else {
        Some(host)
    }
}

fn log_verification_link(subject: &str, token: &str, verification_url: &str) {
    tracing::info!("Verification token for {}: {}", subject, token);
    tracing::info!("Verification URL for {}: {}", subject, verification_url);
}
