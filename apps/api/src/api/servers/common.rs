use super::*;

pub(crate) const ADMINISTRATOR_PERMISSION: i64 = 1 << 12;
pub(crate) const MANAGE_SERVER_PERMISSION: i64 = 1 << 7;

pub(super) async fn ensure_member(state: &AppState, user_id: Uuid, server_id: Uuid) -> Result<()> {
    let exists = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM server_members WHERE server_id = $1 AND user_id = $2)",
        server_id,
        user_id
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(false);

    if !exists {
        return Err(AppError::Forbidden("Not a member of this server".into()));
    }
    Ok(())
}

pub(super) async fn ensure_owner(state: &AppState, user_id: Uuid, server_id: Uuid) -> Result<()> {
    let owner = sqlx::query_scalar!(
        "SELECT owner_id FROM servers WHERE id = $1",
        server_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Server not found".into()))?;

    if owner != user_id {
        return Err(AppError::Forbidden("Only the server owner can do this".into()));
    }
    Ok(())
}

pub(super) async fn ensure_owner_or_manage_server(
    state: &AppState,
    user_id: Uuid,
    server_id: Uuid,
) -> Result<()> {
    let owner_id = sqlx::query_scalar!("SELECT owner_id FROM servers WHERE id = $1", server_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Server not found".into()))?;

    if owner_id == user_id {
        return Ok(());
    }

    let can_manage = sqlx::query_scalar!(
        r#"SELECT COALESCE(BOOL_OR((r.permissions & $3) = $3 OR (r.permissions & $4) = $4), FALSE)
           FROM member_roles mr
           JOIN roles r ON r.id = mr.role_id
           WHERE mr.server_id = $1
             AND mr.user_id = $2"#,
        server_id,
        user_id,
        ADMINISTRATOR_PERMISSION,
        MANAGE_SERVER_PERMISSION
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(false);

    if !can_manage {
        return Err(AppError::Forbidden(
            "Only the server owner or members with MANAGE_SERVER can do this".into(),
        ));
    }

    Ok(())
}

pub(crate) fn is_default_restricted_category_name(name: &str) -> bool {
    let normalized = name
        .trim()
        .to_lowercase()
        .replace('á', "a")
        .replace('é', "e")
        .replace('í', "i")
        .replace('ó', "o")
        .replace('ú', "u")
        .replace('ü', "u");

    matches!(
        normalized.as_str(),
        "informacion" | "información" | "information" | "info" | "default"
    )
}

pub(crate) async fn can_manage_default_category(
    state: &AppState,
    user_id: Uuid,
    server_id: Uuid,
) -> Result<bool> {
    let owner_id = sqlx::query_scalar!("SELECT owner_id FROM servers WHERE id = $1", server_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Server not found".into()))?;

    if owner_id == user_id {
        return Ok(true);
    }

    let admin_level = sqlx::query_scalar!(
        r#"SELECT MAX(position) as "max_position?"
           FROM roles
           WHERE server_id = $1
             AND (permissions & $2) = $2"#,
        server_id,
        ADMINISTRATOR_PERMISSION
    )
    .fetch_one(&state.db)
    .await?;

    let Some(admin_level) = admin_level else {
        return Ok(false);
    };

    let user_roles = sqlx::query!(
        r#"SELECT COALESCE(BOOL_OR((r.permissions & $3) = $3), FALSE) as "has_admin!",
                  MAX(r.position) as "max_position?"
           FROM member_roles mr
           JOIN roles r ON r.id = mr.role_id
           WHERE mr.server_id = $1
             AND mr.user_id = $2"#,
        server_id,
        user_id,
        ADMINISTRATOR_PERMISSION
    )
    .fetch_one(&state.db)
    .await?;

    if user_roles.has_admin {
        return Ok(true);
    }

    Ok(user_roles
        .max_position
        .map(|pos| pos >= admin_level)
        .unwrap_or(false))
}
