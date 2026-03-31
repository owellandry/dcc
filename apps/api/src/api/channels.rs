use axum::{
    extract::{Path, State},
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::{
    api::servers::common::{
        ensure_channel_view_access, ensure_server_permission, load_scope_overwrites,
        resolve_channel_permissions, MANAGE_CHANNELS_PERMISSION, SEND_MESSAGES_PERMISSION,
    },
    error::{AppError, Result},
    middleware::AuthUser,
    state::AppState,
};

pub async fn get_channel(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(channel_id): Path<Uuid>,
) -> Result<Json<Value>> {
    let access = ensure_channel_view_access(&state, user_id, channel_id).await?;
    let c = sqlx::query!(
        r#"SELECT id, server_id, category_id, name, topic, icon_key, channel_type,
                  position, is_nsfw, slowmode_seconds, last_message_id, created_at
           FROM channels
           WHERE id = $1"#,
        channel_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Channel not found".into()))?;

    let overwrites = load_scope_overwrites(&state, None, Some(channel_id)).await?;

    Ok(Json(json!({
        "data": {
            "id": c.id,
            "serverId": c.server_id,
            "categoryId": c.category_id,
            "name": c.name,
            "topic": c.topic,
            "iconKey": c.icon_key,
            "type": c.channel_type,
            "position": c.position,
            "isNsfw": c.is_nsfw,
            "slowmodeSeconds": c.slowmode_seconds,
            "lastMessageId": c.last_message_id,
            "createdAt": c.created_at,
            "canSendMessages": (access.permissions & SEND_MESSAGES_PERMISSION) == SEND_MESSAGES_PERMISSION,
            "overwrites": overwrites
                .iter()
                .map(|overwrite| json!({
                    "id": overwrite.id,
                    "serverId": overwrite.server_id,
                    "categoryId": overwrite.category_id,
                    "channelId": overwrite.channel_id,
                    "targetType": overwrite.target_type,
                    "targetId": overwrite.target_id,
                    "allowBits": overwrite.allow_bits,
                    "denyBits": overwrite.deny_bits,
                    "createdAt": overwrite.created_at,
                }))
                .collect::<Vec<_>>(),
        }
    })))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateChannelBody {
    pub name: Option<String>,
    pub topic: Option<String>,
    pub icon_key: Option<String>,
    pub is_nsfw: Option<bool>,
    pub slowmode_seconds: Option<i32>,
    pub position: Option<i32>,
    pub category_id: Option<Uuid>,
}

pub async fn update_channel(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(channel_id): Path<Uuid>,
    Json(body): Json<UpdateChannelBody>,
) -> Result<Json<Value>> {
    let ch = sqlx::query!(
        "SELECT id, server_id FROM channels WHERE id = $1",
        channel_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Channel not found".into()))?;

    let Some(server_id) = ch.server_id else {
        return Err(AppError::Forbidden("Cannot edit DM channels".into()));
    };

    let context = ensure_server_permission(
        &state,
        user_id,
        server_id,
        MANAGE_CHANNELS_PERMISSION,
        "You do not have permission to update this channel",
    )
    .await?;

    if let Some(category_id) = body.category_id {
        let category_server_id = sqlx::query_scalar!(
            "SELECT server_id FROM categories WHERE id = $1",
            category_id
        )
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Category not found".into()))?;

        if category_server_id != server_id {
            return Err(AppError::BadRequest(
                "Category does not belong to this server".into(),
            ));
        }
    }

    let c = sqlx::query!(
        r#"UPDATE channels
           SET name             = COALESCE($2, name),
               topic            = COALESCE($3, topic),
               icon_key         = COALESCE($4, icon_key),
               is_nsfw          = COALESCE($5, is_nsfw),
               slowmode_seconds = COALESCE($6, slowmode_seconds),
               position         = COALESCE($7, position),
               category_id      = COALESCE($8, category_id)
           WHERE id = $1
           RETURNING id, server_id, category_id, name, topic, icon_key, channel_type,
                     position, is_nsfw, slowmode_seconds, last_message_id, created_at"#,
        channel_id,
        body.name,
        body.topic,
        body.icon_key,
        body.is_nsfw,
        body.slowmode_seconds,
        body.position,
        body.category_id,
    )
    .fetch_one(&state.db)
    .await?;

    let permissions = resolve_channel_permissions(&state, &context, c.category_id, c.id).await?;
    let overwrites = load_scope_overwrites(&state, None, Some(channel_id)).await?;

    Ok(Json(json!({
        "data": {
            "id": c.id,
            "serverId": c.server_id,
            "categoryId": c.category_id,
            "name": c.name,
            "topic": c.topic,
            "iconKey": c.icon_key,
            "type": c.channel_type,
            "position": c.position,
            "isNsfw": c.is_nsfw,
            "slowmodeSeconds": c.slowmode_seconds,
            "lastMessageId": c.last_message_id,
            "createdAt": c.created_at,
            "canSendMessages": (permissions & SEND_MESSAGES_PERMISSION) == SEND_MESSAGES_PERMISSION,
            "overwrites": overwrites
                .iter()
                .map(|overwrite| json!({
                    "id": overwrite.id,
                    "serverId": overwrite.server_id,
                    "categoryId": overwrite.category_id,
                    "channelId": overwrite.channel_id,
                    "targetType": overwrite.target_type,
                    "targetId": overwrite.target_id,
                    "allowBits": overwrite.allow_bits,
                    "denyBits": overwrite.deny_bits,
                    "createdAt": overwrite.created_at,
                }))
                .collect::<Vec<_>>(),
        }
    })))
}

pub async fn delete_channel(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(channel_id): Path<Uuid>,
) -> Result<Json<Value>> {
    let ch = sqlx::query!("SELECT server_id FROM channels WHERE id = $1", channel_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Channel not found".into()))?;

    let Some(server_id) = ch.server_id else {
        return Err(AppError::Forbidden(
            "Cannot delete DM channels this way".into(),
        ));
    };

    ensure_server_permission(
        &state,
        user_id,
        server_id,
        MANAGE_CHANNELS_PERMISSION,
        "You do not have permission to delete channels in this server",
    )
    .await?;

    sqlx::query!("DELETE FROM channels WHERE id = $1", channel_id)
        .execute(&state.db)
        .await?;

    Ok(Json(json!({ "data": null })))
}
