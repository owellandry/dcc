use super::*;
use crate::api::servers::common::{
    ensure_manageable_member_target, ensure_server_permission, load_role, load_scope_overwrites,
    overwrite_payload, MANAGE_ROLES_PERMISSION,
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplaceOverwritesBody {
    pub overwrites: Vec<ReplaceOverwriteItem>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplaceOverwriteItem {
    pub target_type: String,
    pub target_id: Uuid,
    pub allow_bits: i64,
    pub deny_bits: i64,
}

pub async fn replace_category_overwrites(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(category_id): Path<Uuid>,
    Json(body): Json<ReplaceOverwritesBody>,
) -> Result<Json<Value>> {
    let server_id = sqlx::query_scalar::<_, Uuid>("SELECT server_id FROM categories WHERE id = $1")
        .bind(category_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Category not found".into()))?;

    let actor = ensure_server_permission(
        &state,
        user_id,
        server_id,
        MANAGE_ROLES_PERMISSION,
        "You do not have permission to manage permission overwrites in this server",
    )
    .await?;

    replace_overwrites(
        &state,
        &actor,
        server_id,
        Some(category_id),
        None,
        body.overwrites,
    )
    .await
}

pub async fn replace_channel_overwrites(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(channel_id): Path<Uuid>,
    Json(body): Json<ReplaceOverwritesBody>,
) -> Result<Json<Value>> {
    let server_id =
        sqlx::query_scalar::<_, Option<Uuid>>("SELECT server_id FROM channels WHERE id = $1")
            .bind(channel_id)
            .fetch_optional(&state.db)
            .await?
            .flatten()
            .ok_or_else(|| AppError::NotFound("Channel not found".into()))?;

    let actor = ensure_server_permission(
        &state,
        user_id,
        server_id,
        MANAGE_ROLES_PERMISSION,
        "You do not have permission to manage permission overwrites in this server",
    )
    .await?;

    replace_overwrites(
        &state,
        &actor,
        server_id,
        None,
        Some(channel_id),
        body.overwrites,
    )
    .await
}

async fn replace_overwrites(
    state: &AppState,
    actor: &crate::api::servers::common::ServerPermissionsContext,
    server_id: Uuid,
    category_id: Option<Uuid>,
    channel_id: Option<Uuid>,
    overwrites: Vec<ReplaceOverwriteItem>,
) -> Result<Json<Value>> {
    for overwrite in &overwrites {
        if (overwrite.allow_bits & overwrite.deny_bits) != 0 {
            return Err(AppError::BadRequest(
                "An overwrite cannot allow and deny the same permission at once".into(),
            ));
        }

        match overwrite.target_type.as_str() {
            "role" => {
                let role = load_role(state, overwrite.target_id).await?;
                if role.server_id != server_id {
                    return Err(AppError::BadRequest(
                        "Role does not belong to this server".into(),
                    ));
                }

                if !role.is_default
                    && !actor.is_owner
                    && role.position >= actor.highest_role_position
                {
                    return Err(AppError::Forbidden(
                        "You cannot edit overwrites for a role equal or above your highest role"
                            .into(),
                    ));
                }
            }
            "member" => {
                ensure_manageable_member_target(state, actor, overwrite.target_id).await?;
            }
            _ => {
                return Err(AppError::validation(
                    "targetType",
                    "Overwrite target must be role or member",
                ));
            }
        }
    }

    let mut tx = state.db.begin().await?;
    match (category_id, channel_id) {
        (Some(category_id), None) => {
            sqlx::query("DELETE FROM permission_overwrites WHERE category_id = $1")
                .bind(category_id)
                .execute(&mut *tx)
                .await?;
        }
        (None, Some(channel_id)) => {
            sqlx::query("DELETE FROM permission_overwrites WHERE channel_id = $1")
                .bind(channel_id)
                .execute(&mut *tx)
                .await?;
        }
        _ => {}
    }

    for overwrite in overwrites {
        sqlx::query(
            r#"INSERT INTO permission_overwrites (
                    id, server_id, category_id, channel_id, target_type, target_id, allow_bits, deny_bits
               )
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"#,
        )
        .bind(Uuid::new_v4())
        .bind(server_id)
        .bind(category_id)
        .bind(channel_id)
        .bind(overwrite.target_type)
        .bind(overwrite.target_id)
        .bind(overwrite.allow_bits)
        .bind(overwrite.deny_bits)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;

    let applied = load_scope_overwrites(state, category_id, channel_id).await?;
    Ok(Json(json!({
        "data": applied.iter().map(overwrite_payload).collect::<Vec<_>>()
    })))
}
