use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{request::Parts, HeaderMap},
};
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    services::auth::verify_access_token,
    state::AppState,
};

/// Extractor that validates the Bearer token and returns the user ID.
#[derive(Debug, Clone)]
pub struct AuthUser(pub Uuid);

#[async_trait]
impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self> {
        let token = extract_bearer_token(&parts.headers)
            .ok_or_else(|| AppError::Unauthorized("Missing or invalid Authorization header".into()))?;

        let user_id = verify_access_token(&token, &state.config.jwt_secret)?;

        Ok(AuthUser(user_id))
    }
}

pub fn extract_bearer_token(headers: &HeaderMap) -> Option<String> {
    let auth = headers.get("Authorization")?.to_str().ok()?;
    let token = auth.strip_prefix("Bearer ")?;
    Some(token.to_string())
}
