use axum::{
    extract::{Path, State},
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::{
    api::servers::common::{can_manage_default_category, is_default_restricted_category_name},
    error::{AppError, Result},
    middleware::AuthUser,
    state::AppState,
};

pub async fn get_channel(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(channel_id): Path<Uuid>,
) -> Result<Json<Value>> {
    let c = fetch_channel_authorized(&state, user_id, channel_id).await?;
    Ok(Json(json!({ "data": c })))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateChannelBody {
    pub name: Option<String>,
    pub topic: Option<String>,
    pub is_nsfw: Option<bool>,
    pub slowmode_seconds: Option<i32>,
    pub position: Option<i32>,
}

pub async fn update_channel(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(channel_id): Path<Uuid>,
    Json(body): Json<UpdateChannelBody>,
) -> Result<Json<Value>> {
    // Must be a server channel and the caller must be a member
    let ch = sqlx::query!(
        "SELECT id, server_id FROM channels WHERE id = $1",
        channel_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Channel not found".into()))?;

    if let Some(server_id) = ch.server_id {
        ensure_member(&state, user_id, server_id).await?;
    } else {
        return Err(AppError::Forbidden("Cannot edit DM channels".into()));
    }

    let c = sqlx::query!(
        r#"UPDATE channels
           SET name             = COALESCE($2, name),
               topic            = COALESCE($3, topic),
               is_nsfw          = COALESCE($4, is_nsfw),
               slowmode_seconds = COALESCE($5, slowmode_seconds),
               position         = COALESCE($6, position)
           WHERE id = $1
           RETURNING id, server_id, category_id, name, topic, channel_type,
                     position, is_nsfw, slowmode_seconds, last_message_id, created_at"#,
        channel_id,
        body.name,
        body.topic,
        body.is_nsfw,
        body.slowmode_seconds,
        body.position,
    )
    .fetch_one(&state.db)
    .await?;

    Ok(Json(json!({
        "data": {
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
        }
    })))
}

pub async fn delete_channel(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(channel_id): Path<Uuid>,
) -> Result<Json<Value>> {
    let ch = sqlx::query!(
        "SELECT server_id FROM channels WHERE id = $1",
        channel_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Channel not found".into()))?;

    if let Some(server_id) = ch.server_id {
        // Only owner can delete channels for now
        let owner = sqlx::query_scalar!(
            "SELECT owner_id FROM servers WHERE id = $1",
            server_id
        )
        .fetch_one(&state.db)
        .await?;

        if owner != user_id {
            return Err(AppError::Forbidden("Only the server owner can delete channels".into()));
        }
    } else {
        return Err(AppError::Forbidden("Cannot delete DM channels this way".into()));
    }

    sqlx::query!("DELETE FROM channels WHERE id = $1", channel_id)
        .execute(&state.db)
        .await?;

    Ok(Json(json!({ "data": null })))
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async fn fetch_channel_authorized(
    state: &AppState,
    user_id: Uuid,
    channel_id: Uuid,
) -> Result<Value> {
    let c = sqlx::query!(
        r#"SELECT c.id, c.server_id, c.category_id, c.name, c.topic, c.channel_type,
                  c.position, c.is_nsfw, c.slowmode_seconds, c.last_message_id, c.created_at,
                  cat.name as "category_name?"
           FROM channels c
           LEFT JOIN categories cat ON cat.id = c.category_id
           WHERE c.id = $1"#,
        channel_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Channel not found".into()))?;

    // Check access: if server channel, user must be member; if DM, user must be participant
    if let Some(server_id) = c.server_id {
        ensure_member(state, user_id, server_id).await?;
    } else {
        // DM channel — check participant
        let in_dm = sqlx::query_scalar!(
            "SELECT EXISTS(SELECT 1 FROM dm_participants WHERE channel_id = $1 AND user_id = $2)",
            channel_id,
            user_id
        )
        .fetch_one(&state.db)
        .await?
        .unwrap_or(false);

        if !in_dm {
            return Err(AppError::Forbidden("Not a participant of this DM".into()));
        }
    }

    Ok(json!({
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
        "canSendMessages": match c.server_id {
            Some(server_id) => {
                !c.category_name
                    .as_deref()
                    .map(is_default_restricted_category_name)
                    .unwrap_or(false)
                    || can_manage_default_category(state, user_id, server_id).await?
            }
            None => true,
        },
    }))
}

pub(crate) async fn ensure_member(state: &AppState, user_id: Uuid, server_id: Uuid) -> Result<()> {
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
