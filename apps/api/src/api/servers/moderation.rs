use super::*;
use crate::api::servers::common::{
    ensure_assignable_roles, ensure_manageable_member_target, ensure_server_permission,
    load_member_roles, load_role, role_payload, BAN_MEMBERS_PERMISSION, KICK_MEMBERS_PERMISSION,
    MANAGE_ROLES_PERMISSION,
};
use crate::middleware::AuthUser;
use crate::models::server::ServerMemberRow;
use crate::services::cache;
use serde_json::Value;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplaceMemberRolesBody {
    pub role_ids: Vec<Uuid>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BanMemberBody {
    pub user_id: Uuid,
    pub reason: Option<String>,
}

pub async fn replace_member_roles(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path((server_id, target_user_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<ReplaceMemberRolesBody>,
) -> Result<Json<Value>> {
    let actor = ensure_server_permission(
        &state,
        user_id,
        server_id,
        MANAGE_ROLES_PERMISSION,
        "You do not have permission to manage roles in this server",
    )
    .await?;
    ensure_manageable_member_target(&state, &actor, target_user_id).await?;

    let mut roles = Vec::new();
    for role_id in body.role_ids {
        let role = load_role(&state, role_id).await?;
        if role.server_id != server_id {
            return Err(AppError::BadRequest(
                "Role does not belong to this server".into(),
            ));
        }
        roles.push(role);
    }
    ensure_assignable_roles(&actor, &roles)?;

    let mut tx = state.db.begin().await?;
    sqlx::query("DELETE FROM member_roles WHERE server_id = $1 AND user_id = $2")
        .bind(server_id)
        .bind(target_user_id)
        .execute(&mut *tx)
        .await?;

    for role in &roles {
        sqlx::query("INSERT INTO member_roles (server_id, user_id, role_id) VALUES ($1, $2, $3)")
            .bind(server_id)
            .bind(target_user_id)
            .bind(role.id)
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await?;

    let member = fetch_member_payload(&state, server_id, target_user_id).await?;
    Ok(Json(json!({ "data": member })))
}

pub async fn kick_member(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path((server_id, target_user_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<Value>> {
    let actor = ensure_server_permission(
        &state,
        user_id,
        server_id,
        KICK_MEMBERS_PERMISSION,
        "You do not have permission to kick members in this server",
    )
    .await?;
    ensure_manageable_member_target(&state, &actor, target_user_id).await?;

    sqlx::query("DELETE FROM server_members WHERE server_id = $1 AND user_id = $2")
        .bind(server_id)
        .bind(target_user_id)
        .execute(&state.db)
        .await?;

    sync_member_count(&state, server_id).await?;

    Ok(Json(json!({ "data": null })))
}

pub async fn ban_member(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(server_id): Path<Uuid>,
    Json(body): Json<BanMemberBody>,
) -> Result<Json<Value>> {
    let actor = ensure_server_permission(
        &state,
        user_id,
        server_id,
        BAN_MEMBERS_PERMISSION,
        "You do not have permission to ban members in this server",
    )
    .await?;

    let is_member: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM server_members WHERE server_id = $1 AND user_id = $2)",
    )
    .bind(server_id)
    .bind(body.user_id)
    .fetch_one(&state.db)
    .await?;
    if is_member {
        ensure_manageable_member_target(&state, &actor, body.user_id).await?;
    } else if actor.owner_id == body.user_id {
        return Err(AppError::Forbidden(
            "The server owner cannot be banned".into(),
        ));
    }

    let mut tx = state.db.begin().await?;
    sqlx::query(
        r#"INSERT INTO server_bans (server_id, user_id, banned_by, reason)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (server_id, user_id)
           DO UPDATE SET banned_by = EXCLUDED.banned_by, reason = EXCLUDED.reason, created_at = NOW()"#,
    )
    .bind(server_id)
    .bind(body.user_id)
    .bind(user_id)
    .bind(body.reason)
    .execute(&mut *tx)
    .await?;

    sqlx::query("DELETE FROM server_members WHERE server_id = $1 AND user_id = $2")
        .bind(server_id)
        .bind(body.user_id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;

    sync_member_count(&state, server_id).await?;

    Ok(Json(json!({ "data": null })))
}

pub async fn unban_member(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path((server_id, target_user_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<Value>> {
    ensure_server_permission(
        &state,
        user_id,
        server_id,
        BAN_MEMBERS_PERMISSION,
        "You do not have permission to unban members in this server",
    )
    .await?;

    sqlx::query("DELETE FROM server_bans WHERE server_id = $1 AND user_id = $2")
        .bind(server_id)
        .bind(target_user_id)
        .execute(&state.db)
        .await?;

    Ok(Json(json!({ "data": null })))
}

async fn fetch_member_payload(state: &AppState, server_id: Uuid, user_id: Uuid) -> Result<Value> {
    let row = sqlx::query_as::<_, ServerMemberRow>(
        r#"SELECT sm.server_id, sm.user_id, sm.nickname, sm.joined_at,
                  u.username, u.discriminator, u.avatar_url, u.banner_url,
                  u.bio, u.status, u.custom_status, u.is_verified, u.badges, u.created_at as user_created_at
           FROM server_members sm
           JOIN users u ON u.id = sm.user_id
           WHERE sm.server_id = $1
             AND sm.user_id = $2"#,
    )
    .bind(server_id)
    .bind(user_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Member not found".into()))?;

    let roles = load_member_roles(state, server_id, user_id).await?;
    Ok(json!({
        "serverId": row.server_id,
        "userId": row.user_id,
        "nickname": row.nickname,
        "joinedAt": row.joined_at,
        "roles": roles.iter().map(role_payload).collect::<Vec<_>>(),
        "user": {
            "id": row.user_id,
            "username": row.username,
            "discriminator": row.discriminator,
            "avatarUrl": row.avatar_url,
            "bannerUrl": row.banner_url,
            "bio": row.bio,
            "status": row.status,
            "customStatus": row.custom_status,
            "isVerified": row.is_verified,
            "badges": row.badges,
            "createdAt": row.user_created_at,
        }
    }))
}

async fn sync_member_count(state: &AppState, server_id: Uuid) -> Result<()> {
    sqlx::query(
        "UPDATE servers SET member_count = (SELECT COUNT(*) FROM server_members WHERE server_id = $1) WHERE id = $1",
    )
    .bind(server_id)
    .execute(&state.db)
    .await?;

    // Invalidate server cache after member count change
    let mut redis = state.redis.clone();
    cache::invalidate_server(&mut redis, server_id).await;

    Ok(())
}
