use axum::{
    extract::{Path, State},
    Json,
};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::{
    api::servers::common::ensure_channel_view_access,
    error::{AppError, Result},
    middleware::AuthUser,
    state::AppState,
};

#[derive(sqlx::FromRow)]
struct ChannelReadRow {
    channel_id: Uuid,
    last_read_message_id: Option<Uuid>,
    last_read_at: chrono::DateTime<chrono::Utc>,
    unread_count: i64,
    mention_count: i64,
}

pub async fn list_channel_reads(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
) -> Result<Json<Value>> {
    initialize_missing_reads(&state, user_id).await?;

    let rows = sqlx::query_as::<_, ChannelReadRow>(
        r#"
        SELECT
            cr.channel_id,
            cr.last_read_message_id,
            cr.last_read_at,
            COUNT(m.id) FILTER (
                WHERE m.author_id <> $1
                  AND m.created_at > cr.last_read_at
            ) AS unread_count,
            COUNT(m.id) FILTER (
                WHERE m.author_id <> $1
                  AND m.created_at > cr.last_read_at
                  AND (
                      EXISTS(
                          SELECT 1
                          FROM messages reply_target
                          WHERE reply_target.id = m.reply_to_id
                            AND reply_target.author_id = $1
                      )
                      OR LOWER(COALESCE(m.content, '')) LIKE ('%@' || LOWER(viewer.username) || '%')
                      OR (
                          viewer.display_name IS NOT NULL
                          AND viewer.display_name <> ''
                          AND LOWER(COALESCE(m.content, '')) LIKE ('%@' || LOWER(viewer.display_name) || '%')
                      )
                  )
            ) AS mention_count
        FROM channel_reads cr
        JOIN users viewer ON viewer.id = $1
        LEFT JOIN messages m ON m.channel_id = cr.channel_id
        WHERE cr.user_id = $1
        GROUP BY cr.channel_id, cr.last_read_message_id, cr.last_read_at
        "#,
    )
    .bind(user_id)
    .fetch_all(&state.db)
    .await?;

    let data = rows
        .into_iter()
        .map(|row| {
            json!({
                "channelId": row.channel_id,
                "lastReadMessageId": row.last_read_message_id,
                "lastReadAt": row.last_read_at,
                "unreadCount": row.unread_count,
                "mentionCount": row.mention_count,
            })
        })
        .collect::<Vec<_>>();

    Ok(Json(json!({ "data": data })))
}

pub async fn mark_channel_read(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(channel_id): Path<Uuid>,
) -> Result<Json<Value>> {
    ensure_channel_view_access(&state, user_id, channel_id).await?;
    initialize_channel_read(&state, user_id, channel_id).await?;

    let last_message_id =
        sqlx::query_scalar::<_, Option<Uuid>>("SELECT last_message_id FROM channels WHERE id = $1")
            .bind(channel_id)
            .fetch_optional(&state.db)
            .await?
            .ok_or_else(|| AppError::NotFound("Channel not found".into()))?;

    let row = sqlx::query_as::<_, ChannelReadRow>(
        r#"
        INSERT INTO channel_reads (user_id, channel_id, last_read_message_id, last_read_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id, channel_id)
        DO UPDATE SET
            last_read_message_id = EXCLUDED.last_read_message_id,
            last_read_at = NOW()
        RETURNING channel_id, last_read_message_id, last_read_at, 0::BIGINT AS unread_count, 0::BIGINT AS mention_count
        "#,
    )
    .bind(user_id)
    .bind(channel_id)
    .bind(last_message_id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(json!({
        "data": {
            "channelId": row.channel_id,
            "lastReadMessageId": row.last_read_message_id,
            "lastReadAt": row.last_read_at,
            "unreadCount": 0,
            "mentionCount": 0,
        }
    })))
}

async fn initialize_missing_reads(state: &AppState, user_id: Uuid) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO channel_reads (user_id, channel_id, last_read_message_id, last_read_at)
        SELECT
            $1,
            c.id,
            c.last_message_id,
            NOW()
        FROM channels c
        WHERE (
            (c.server_id IS NOT NULL AND EXISTS(
                SELECT 1
                FROM server_members sm
                WHERE sm.server_id = c.server_id
                  AND sm.user_id = $1
            ))
            OR EXISTS(
                SELECT 1
                FROM dm_participants dp
                WHERE dp.channel_id = c.id
                  AND dp.user_id = $1
            )
        )
        AND NOT EXISTS(
            SELECT 1
            FROM channel_reads cr
            WHERE cr.user_id = $1
              AND cr.channel_id = c.id
        )
        "#,
    )
    .bind(user_id)
    .execute(&state.db)
    .await?;

    Ok(())
}

async fn initialize_channel_read(state: &AppState, user_id: Uuid, channel_id: Uuid) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO channel_reads (user_id, channel_id, last_read_message_id, last_read_at)
        SELECT $1, c.id, c.last_message_id, NOW()
        FROM channels c
        WHERE c.id = $2
        ON CONFLICT (user_id, channel_id) DO NOTHING
        "#,
    )
    .bind(user_id)
    .bind(channel_id)
    .execute(&state.db)
    .await?;

    Ok(())
}
