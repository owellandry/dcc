use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::{
    api::servers::common::{
        ensure_channel_view_access, has_permission, load_channel_access,
        load_server_permissions_context, MANAGE_MESSAGES_PERMISSION, SEND_MESSAGES_PERMISSION,
    },
    error::{AppError, Result},
    middleware::AuthUser,
    models::message::MessageRow,
    services::pubsub::{dm_channel, guild_channel, publish},
    state::AppState,
};

// ── List messages ─────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct MessagesQuery {
    pub before: Option<Uuid>,
    pub after: Option<Uuid>,
    pub limit: Option<i64>,
}

pub async fn list_messages(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(channel_id): Path<Uuid>,
    Query(q): Query<MessagesQuery>,
) -> Result<Json<Value>> {
    ensure_channel_view_access(&state, user_id, channel_id).await?;

    let limit = q.limit.unwrap_or(50).min(100);

    // Determine cursor direction and fetch
    let (rows, reverse_after) = if let Some(before) = q.before {
        let r = sqlx::query_as::<_, MessageRow>(
            r#"SELECT m.id, m.channel_id, m.author_id, m.content, m.message_type,
                      m.reply_to_id, m.is_edited, m.created_at, m.edited_at,
                      u.username as author_username, u.discriminator as author_discriminator,
                      u.avatar_url as author_avatar_url, u.banner_url as author_banner_url,
                      u.bio as author_bio, u.status as author_status,
                      u.custom_status as author_custom_status,
                      u.is_verified as author_is_verified, u.badges as author_badges, u.created_at as author_created_at
               FROM messages m
               JOIN users u ON u.id = m.author_id
               WHERE m.channel_id = $1
                 AND m.created_at < (SELECT created_at FROM messages WHERE id = $2)
               ORDER BY m.created_at DESC
               LIMIT $3"#
        )
        .bind(channel_id)
        .bind(before)
        .bind(limit + 1)
        .fetch_all(&state.db)
        .await?;
        (r, false)
    } else if let Some(after) = q.after {
        let r = sqlx::query_as::<_, MessageRow>(
            r#"SELECT m.id, m.channel_id, m.author_id, m.content, m.message_type,
                      m.reply_to_id, m.is_edited, m.created_at, m.edited_at,
                      u.username as author_username, u.discriminator as author_discriminator,
                      u.avatar_url as author_avatar_url, u.banner_url as author_banner_url,
                      u.bio as author_bio, u.status as author_status,
                      u.custom_status as author_custom_status,
                      u.is_verified as author_is_verified, u.badges as author_badges, u.created_at as author_created_at
               FROM messages m
               JOIN users u ON u.id = m.author_id
               WHERE m.channel_id = $1
                 AND m.created_at > (SELECT created_at FROM messages WHERE id = $2)
               ORDER BY m.created_at ASC
               LIMIT $3"#
        )
        .bind(channel_id)
        .bind(after)
        .bind(limit + 1)
        .fetch_all(&state.db)
        .await?;
        (r, true)
    } else {
        let r = sqlx::query_as::<_, MessageRow>(
            r#"SELECT m.id, m.channel_id, m.author_id, m.content, m.message_type,
                      m.reply_to_id, m.is_edited, m.created_at, m.edited_at,
                      u.username as author_username, u.discriminator as author_discriminator,
                      u.avatar_url as author_avatar_url, u.banner_url as author_banner_url,
                      u.bio as author_bio, u.status as author_status,
                      u.custom_status as author_custom_status,
                      u.is_verified as author_is_verified, u.badges as author_badges, u.created_at as author_created_at
               FROM messages m
               JOIN users u ON u.id = m.author_id
               WHERE m.channel_id = $1
               ORDER BY m.created_at DESC
               LIMIT $2"#
        )
        .bind(channel_id)
        .bind(limit + 1)
        .fetch_all(&state.db)
        .await?;
        (r, false)
    };
    let _ = reverse_after; // direction handled by DB ORDER BY

    let has_more = rows.len() as i64 > limit;
    let rows = if has_more {
        &rows[..limit as usize]
    } else {
        &rows[..]
    };
    let next_cursor = rows.last().map(|r| r.id.to_string());

    let mut messages: Vec<Value> = Vec::with_capacity(rows.len());
    for row in rows {
        messages.push(build_message_payload(&state, row, user_id).await?);
    }

    // Return oldest-first for normal display
    messages.reverse();

    Ok(Json(json!({
        "data": messages,
        "meta": {
            "hasMore": has_more,
            "nextCursor": next_cursor,
            "prevCursor": null,
        }
    })))
}

// ── Send message ──────────────────────────────────────────────────────────────

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendMessageBody {
    pub content: Option<String>,
    pub reply_to_id: Option<Uuid>,
}

pub async fn send_message(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(channel_id): Path<Uuid>,
    Json(body): Json<SendMessageBody>,
) -> Result<Json<Value>> {
    ensure_channel_view_access(&state, user_id, channel_id).await?;
    ensure_can_send_message(&state, user_id, channel_id).await?;

    let content = body.content.as_deref().map(|s| s.trim().to_string());
    if content.as_deref().map(|s| s.is_empty()).unwrap_or(true) {
        return Err(AppError::BadRequest(
            "Message content cannot be empty".into(),
        ));
    }
    let content = content.unwrap();
    if content.len() > 4000 {
        return Err(AppError::BadRequest(
            "Message exceeds 4000 character limit".into(),
        ));
    }

    let reply_to_id = validate_reply_target(&state, body.reply_to_id, channel_id).await?;
    let message_id = Uuid::new_v4();

    let row = sqlx::query_as::<_, MessageRow>(
        r#"WITH ins AS (
               INSERT INTO messages (id, channel_id, author_id, content, reply_to_id)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING *
           )
           SELECT m.id, m.channel_id, m.author_id, m.content, m.message_type,
                  m.reply_to_id, m.is_edited, m.created_at, m.edited_at,
                  u.username as author_username, u.discriminator as author_discriminator,
                  u.avatar_url as author_avatar_url, u.banner_url as author_banner_url,
                  u.bio as author_bio, u.status as author_status,
                  u.custom_status as author_custom_status,
                  u.is_verified as author_is_verified, u.badges as author_badges, u.created_at as author_created_at
           FROM ins m
           JOIN users u ON u.id = m.author_id"#,
    )
    .bind(message_id)
    .bind(channel_id)
    .bind(user_id)
    .bind(content)
    .bind(reply_to_id)
    .fetch_one(&state.db)
    .await?;

    // Update last_message_id on channel
    sqlx::query!(
        "UPDATE channels SET last_message_id = $1 WHERE id = $2",
        message_id,
        channel_id
    )
    .execute(&state.db)
    .await?;

    let message = build_message_payload(&state, &row, user_id).await?;

    // Publish to Redis pub/sub
    let pub_channel = get_pub_channel(&state, channel_id).await;
    let event = json!({ "t": "MESSAGE_CREATE", "d": message });
    let _ = publish(&state.redis.clone(), &pub_channel, &event.to_string()).await;

    Ok(Json(json!({ "data": message })))
}

// ── Edit message ──────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct EditMessageBody {
    pub content: String,
}

pub async fn edit_message(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(message_id): Path<Uuid>,
    Json(body): Json<EditMessageBody>,
) -> Result<Json<Value>> {
    let content = body.content.trim().to_string();
    if content.is_empty() || content.len() > 4000 {
        return Err(AppError::BadRequest(
            "Message must be 1–4000 characters".into(),
        ));
    }

    let updated_message = sqlx::query!(
        r#"UPDATE messages
           SET content = $1, is_edited = TRUE, edited_at = NOW()
           WHERE id = $2 AND author_id = $3
           RETURNING id"#,
        content,
        message_id,
        user_id,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Message not found or not yours".into()))?;

    let row = sqlx::query_as::<_, MessageRow>(
        r#"SELECT m.id, m.channel_id, m.author_id, m.content, m.message_type,
                  m.reply_to_id, m.is_edited, m.created_at, m.edited_at,
                  u.username as author_username, u.discriminator as author_discriminator,
                  u.avatar_url as author_avatar_url, u.banner_url as author_banner_url,
                  u.bio as author_bio, u.status as author_status,
                  u.custom_status as author_custom_status,
                  u.is_verified as author_is_verified, u.badges as author_badges, u.created_at as author_created_at
           FROM messages m
           JOIN users u ON u.id = m.author_id
           WHERE m.id = $1"#,
    )
    .bind(updated_message.id)
    .fetch_one(&state.db)
    .await?;

    let message = build_message_payload(&state, &row, user_id).await?;

    let pub_channel = get_pub_channel(&state, row.channel_id).await;
    let event = json!({ "t": "MESSAGE_UPDATE", "d": message });
    let _ = publish(&state.redis.clone(), &pub_channel, &event.to_string()).await;

    Ok(Json(json!({ "data": message })))
}

// ── Delete message ────────────────────────────────────────────────────────────

pub async fn delete_message(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(message_id): Path<Uuid>,
) -> Result<Json<Value>> {
    let row = sqlx::query!(
        "SELECT id, channel_id, author_id FROM messages WHERE id = $1",
        message_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Message not found".into()))?;

    if row.author_id != user_id {
        let access = load_channel_access(&state, user_id, row.channel_id).await?;
        let Some(server_id) = access.server_id else {
            return Err(AppError::Forbidden(
                "Cannot delete someone else's message".into(),
            ));
        };
        let context = load_server_permissions_context(&state, user_id, server_id).await?;
        if !context.is_owner && !has_permission(access.permissions, MANAGE_MESSAGES_PERMISSION) {
            return Err(AppError::Forbidden(
                "Cannot delete someone else's message".into(),
            ));
        }
    }

    sqlx::query!("DELETE FROM messages WHERE id = $1", message_id)
        .execute(&state.db)
        .await?;

    let pub_channel = get_pub_channel(&state, row.channel_id).await;
    let event =
        json!({ "t": "MESSAGE_DELETE", "d": { "id": message_id, "channelId": row.channel_id } });
    let _ = publish(&state.redis.clone(), &pub_channel, &event.to_string()).await;

    Ok(Json(json!({ "data": null })))
}

// ── Reactions ─────────────────────────────────────────────────────────────────

pub async fn add_reaction(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path((message_id, emoji)): Path<(Uuid, String)>,
) -> Result<Json<Value>> {
    let emoji = urlencoding::decode(&emoji)
        .map(|s| s.into_owned())
        .unwrap_or(emoji);

    // Verify message exists and user can access it
    let msg = sqlx::query!("SELECT channel_id FROM messages WHERE id = $1", message_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Message not found".into()))?;

    ensure_channel_view_access(&state, user_id, msg.channel_id).await?;

    sqlx::query!(
        r#"INSERT INTO message_reactions (message_id, user_id, emoji)
           VALUES ($1, $2, $3)
           ON CONFLICT (message_id, user_id, emoji) DO NOTHING"#,
        message_id,
        user_id,
        emoji,
    )
    .execute(&state.db)
    .await?;

    let pub_channel = get_pub_channel(&state, msg.channel_id).await;
    let event = json!({
        "t": "REACTION_ADD",
        "d": { "messageId": message_id, "channelId": msg.channel_id, "userId": user_id, "emoji": emoji }
    });
    let _ = publish(&state.redis.clone(), &pub_channel, &event.to_string()).await;

    Ok(Json(json!({ "data": null })))
}

pub async fn remove_reaction(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path((message_id, emoji)): Path<(Uuid, String)>,
) -> Result<Json<Value>> {
    let emoji = urlencoding::decode(&emoji)
        .map(|s| s.into_owned())
        .unwrap_or(emoji);

    let msg = sqlx::query!("SELECT channel_id FROM messages WHERE id = $1", message_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Message not found".into()))?;

    ensure_channel_view_access(&state, user_id, msg.channel_id).await?;

    sqlx::query!(
        "DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3",
        message_id,
        user_id,
        emoji,
    )
    .execute(&state.db)
    .await?;

    let pub_channel = get_pub_channel(&state, msg.channel_id).await;
    let event = json!({
        "t": "REACTION_REMOVE",
        "d": { "messageId": message_id, "channelId": msg.channel_id, "userId": user_id, "emoji": emoji }
    });
    let _ = publish(&state.redis.clone(), &pub_channel, &event.to_string()).await;

    Ok(Json(json!({ "data": null })))
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async fn ensure_can_send_message(state: &AppState, user_id: Uuid, channel_id: Uuid) -> Result<()> {
    let access = load_channel_access(state, user_id, channel_id).await?;
    if access.server_id.is_some() && !has_permission(access.permissions, SEND_MESSAGES_PERMISSION) {
        return Err(AppError::Forbidden(
            "This channel is read-only for your role".into(),
        ));
    }

    Ok(())
}

async fn validate_reply_target(
    state: &AppState,
    reply_to_id: Option<Uuid>,
    channel_id: Uuid,
) -> Result<Option<Uuid>> {
    let Some(reply_to_id) = reply_to_id else {
        return Ok(None);
    };

    let reply_target = sqlx::query!("SELECT channel_id FROM messages WHERE id = $1", reply_to_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::BadRequest("Reply target message was not found".into()))?;

    if reply_target.channel_id != channel_id {
        return Err(AppError::BadRequest(
            "Reply target must belong to the same channel".into(),
        ));
    }

    Ok(Some(reply_to_id))
}

async fn fetch_reply_preview(state: &AppState, reply_to_id: Option<Uuid>) -> Result<Option<Value>> {
    let Some(reply_to_id) = reply_to_id else {
        return Ok(None);
    };

    let reply = sqlx::query!(
        r#"SELECT m.id, m.content,
                  u.id as author_id,
                  u.username as author_username,
                  u.discriminator as author_discriminator,
                  u.avatar_url as author_avatar_url,
                  u.banner_url as author_banner_url,
                  u.bio as author_bio,
                  u.status as author_status,
                  u.custom_status as author_custom_status,
                  u.is_verified as author_is_verified,
                  u.badges as author_badges,
                  u.created_at as author_created_at
           FROM messages m
           JOIN users u ON u.id = m.author_id
           WHERE m.id = $1"#,
        reply_to_id
    )
    .fetch_optional(&state.db)
    .await?;

    Ok(reply.map(|row| {
        json!({
            "id": row.id,
            "author": {
                "id": row.author_id,
                "username": row.author_username,
                "discriminator": row.author_discriminator,
                "avatarUrl": row.author_avatar_url,
                "bannerUrl": row.author_banner_url,
                "bio": row.author_bio,
                "status": row.author_status,
                "customStatus": row.author_custom_status,
                "isVerified": row.author_is_verified,
                "badges": row.author_badges,
                "createdAt": row.author_created_at,
            },
            "content": row.content,
            "attachments": [],
        })
    }))
}

async fn build_message_payload(state: &AppState, row: &MessageRow, user_id: Uuid) -> Result<Value> {
    let reactions = fetch_reactions(state, row.id, user_id).await?;
    let reply_to = fetch_reply_preview(state, row.reply_to_id).await?;

    Ok(json!({
        "id": row.id,
        "channelId": row.channel_id,
        "author": {
            "id": row.author_id,
            "username": row.author_username,
            "discriminator": row.author_discriminator,
            "avatarUrl": row.author_avatar_url,
            "bannerUrl": row.author_banner_url,
            "bio": row.author_bio,
            "status": row.author_status,
            "customStatus": row.author_custom_status,
            "isVerified": row.author_is_verified,
            "badges": row.author_badges,
            "createdAt": row.author_created_at,
        },
        "content": row.content,
        "type": row.message_type,
        "replyTo": reply_to,
        "attachments": [],
        "reactions": reactions,
        "isEdited": row.is_edited,
        "createdAt": row.created_at,
        "editedAt": row.edited_at,
    }))
}

async fn fetch_reactions(state: &AppState, message_id: Uuid, user_id: Uuid) -> Result<Vec<Value>> {
    let rows = sqlx::query!(
        r#"SELECT emoji, COUNT(*) as count,
                  BOOL_OR(user_id = $2) as me_reacted
           FROM message_reactions
           WHERE message_id = $1
           GROUP BY emoji"#,
        message_id,
        user_id,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(rows
        .into_iter()
        .map(|r| {
            json!({
                "emoji": r.emoji,
                "count": r.count.unwrap_or(0),
                "meReacted": r.me_reacted.unwrap_or(false),
            })
        })
        .collect())
}

async fn get_pub_channel(state: &AppState, channel_id: Uuid) -> String {
    // Determine if DM or guild channel for routing
    let server_id = sqlx::query_scalar!("SELECT server_id FROM channels WHERE id = $1", channel_id)
        .fetch_optional(&state.db)
        .await
        .ok()
        .flatten()
        .flatten();

    if let Some(sid) = server_id {
        guild_channel(sid)
    } else {
        dm_channel(channel_id)
    }
}
