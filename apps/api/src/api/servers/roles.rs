use super::*;
use crate::api::servers::common::{
    ensure_manageable_role_target, ensure_server_permission, load_role, load_server_roles,
    role_payload, MANAGE_ROLES_PERMISSION,
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRoleBody {
    pub name: String,
    pub color: Option<i32>,
    pub permissions: Option<i64>,
    pub is_hoisted: Option<bool>,
    pub is_mentionable: Option<bool>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRoleBody {
    pub name: Option<String>,
    pub color: Option<i32>,
    pub permissions: Option<i64>,
    pub position: Option<i32>,
    pub is_hoisted: Option<bool>,
    pub is_mentionable: Option<bool>,
}

pub async fn create_role(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(server_id): Path<Uuid>,
    Json(body): Json<CreateRoleBody>,
) -> Result<Json<Value>> {
    let actor = ensure_server_permission(
        &state,
        user_id,
        server_id,
        MANAGE_ROLES_PERMISSION,
        "You do not have permission to create roles in this server",
    )
    .await?;

    let name = body.name.trim().to_string();
    if name.is_empty() || name.len() > 100 {
        return Err(AppError::validation(
            "name",
            "Name must be 1-100 characters",
        ));
    }

    let position = sqlx::query_scalar!(
        "SELECT COALESCE(MAX(position) + 1, 0) FROM roles WHERE server_id = $1 AND is_default = FALSE",
        server_id
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    if !actor.is_owner && position >= actor.highest_role_position {
        return Err(AppError::Forbidden(
            "You cannot create roles at or above your highest role".into(),
        ));
    }

    let role = sqlx::query!(
        r#"INSERT INTO roles (
                id, server_id, name, color, permissions, position, is_hoisted, is_managed, is_mentionable, is_default
           )
           VALUES ($1, $2, $3, $4, COALESCE($5, 0), $6, COALESCE($7, FALSE), FALSE, COALESCE($8, FALSE), FALSE)
           RETURNING id"#,
        Uuid::new_v4(),
        server_id,
        name,
        body.color,
        body.permissions,
        position,
        body.is_hoisted,
        body.is_mentionable,
    )
    .fetch_one(&state.db)
    .await?;

    let role = load_role(&state, role.id).await?;
    Ok(Json(json!({ "data": role_payload(&role) })))
}

pub async fn update_role(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(role_id): Path<Uuid>,
    Json(body): Json<UpdateRoleBody>,
) -> Result<Json<Value>> {
    let role = load_role(&state, role_id).await?;
    let actor = ensure_server_permission(
        &state,
        user_id,
        role.server_id,
        MANAGE_ROLES_PERMISSION,
        "You do not have permission to update roles in this server",
    )
    .await?;
    ensure_manageable_role_target(&actor, &role)?;

    if !actor.is_owner {
        if let Some(position) = body.position {
            if position >= actor.highest_role_position {
                return Err(AppError::Forbidden(
                    "You cannot move a role above or equal to your highest role".into(),
                ));
            }
        }
    }

    let updated = sqlx::query!(
        r#"UPDATE roles
           SET name = COALESCE($2, name),
               color = COALESCE($3, color),
               permissions = COALESCE($4, permissions),
               position = COALESCE($5, position),
               is_hoisted = COALESCE($6, is_hoisted),
               is_mentionable = COALESCE($7, is_mentionable)
           WHERE id = $1
           RETURNING id"#,
        role_id,
        body.name,
        body.color,
        body.permissions,
        body.position,
        body.is_hoisted,
        body.is_mentionable,
    )
    .fetch_one(&state.db)
    .await?;

    let updated = load_role(&state, updated.id).await?;
    Ok(Json(json!({ "data": role_payload(&updated) })))
}

pub async fn delete_role(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(role_id): Path<Uuid>,
) -> Result<Json<Value>> {
    let role = load_role(&state, role_id).await?;
    let actor = ensure_server_permission(
        &state,
        user_id,
        role.server_id,
        MANAGE_ROLES_PERMISSION,
        "You do not have permission to delete roles in this server",
    )
    .await?;
    ensure_manageable_role_target(&actor, &role)?;

    let mut tx = state.db.begin().await?;
    sqlx::query!(
        "DELETE FROM permission_overwrites WHERE target_type = 'role' AND target_id = $1",
        role_id
    )
    .execute(&mut *tx)
    .await?;
    sqlx::query!("DELETE FROM roles WHERE id = $1", role_id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;

    Ok(Json(json!({ "data": null })))
}
