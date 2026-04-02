//! Threads API
//! Threads are conversations attached to a root message

use axum::{
    extract::{Path, State},
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::FromRow;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    middleware::AuthUser,
    state::AppState,
};

/// Ensure a thread exists for a given root message, creating it if needed
pub async fn ensure_thread_exists(
    state: &AppState,
    first_message_id: Uuid,
    channel_id: Uuid,
) -> Result<()> {
    // Check if thread already exists
    let exists: Option<bool> = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM threads WHERE first_message_id = $1)"
    )
    .bind(first_message_id)
    .fetch_optional(&state.db)
    .await?;
    let exists = exists.unwrap_or(false);

    if !exists {
        let thread_id = Uuid::new_v4();
        let now = chrono::Utc::now();

        sqlx::query(
            r#"INSERT INTO threads (id, channel_id, first_message_id, is_archived, created_at, updated_at)
               VALUES ($1, $2, $3, FALSE, $4, $4)"#,
        )
        .bind(thread_id)
        .bind(channel_id)
        .bind(first_message_id)
        .bind(now)
        .execute(&state.db)
        .await?;
    }

    Ok(())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateThreadBody {
    /// Optional initial message content (if not provided, thread is created empty)
    pub content: Option<String>,
}

#[derive(Serialize, Deserialize, FromRow)]
pub struct Thread {
    pub id: Uuid,
    pub channel_id: Uuid,
    pub first_message_id: Uuid,
    pub is_archived: bool,
    pub archived_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ThreadResponse {
    pub id: Uuid,
    pub channel_id: Uuid,
    pub first_message_id: Uuid,
    pub is_archived: bool,
    pub archived_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

/// Create a thread from an existing message
/// POST /messages/:message_id/thread
pub async fn create_thread(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(message_id): Path<Uuid>,
    Json(body): Json<CreateThreadBody>,
) -> Result<Json<Value>> {
    // Find the message and ensure it's in the channel the user has access to
    #[derive(sqlx::FromRow)]
    struct MessageRow {
        channel_id: Uuid,
        author_id: Uuid,
        content: String,
        message_type: String,
    }

    let message_row = sqlx::query_as::<_, MessageRow>(
        r#"SELECT m.channel_id, m.author_id, m.content, m.message_type
           FROM messages m
           WHERE m.id = $1"#,
    )
    .bind(message_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Message not found".into()))?;

    // Ensure user can view the channel
    let _access = crate::api::servers::common::load_channel_access(
        &state,
        user_id,
        message_row.channel_id,
    )
    .await?;

    // Si body.content viene, creamos un primer mensaje dentro del thread
    // (en este modelo, se representa con `parent_message_id = message_id`).
    if let Some(content) = body.content.as_deref().map(|c| c.trim()).filter(|c| !c.is_empty()) {
        if content.len() > 4000 {
            return Err(AppError::BadRequest("Message exceeds 4000 character limit".into()));
        }

        let reply_message_id = Uuid::new_v4();
        sqlx::query(
            r#"INSERT INTO messages (id, channel_id, author_id, content, reply_to_id, parent_message_id)
               VALUES ($1, $2, $3, $4, NULL, $5)"#,
        )
        .bind(reply_message_id)
        .bind(message_row.channel_id)
        .bind(user_id)
        .bind(content.to_string())
        .bind(message_id)
        .execute(&state.db)
        .await?;

        // Best-effort: actualizar last_message_id del canal
        let _ = sqlx::query("UPDATE channels SET last_message_id = $1 WHERE id = $2")
            .bind(reply_message_id)
            .bind(message_row.channel_id)
            .execute(&state.db)
            .await;
    }

    // Check if thread already exists
    let existing_thread = sqlx::query_as::<_, Thread>(
        "SELECT * FROM threads WHERE first_message_id = $1",
    )
    .bind(message_id)
    .fetch_optional(&state.db)
    .await?;

    if let Some(thread) = existing_thread {
        return Ok(Json(json!({
            "data": thread,
            "created": false,
        })));
    }

    // Create new thread
    let thread_id = Uuid::new_v4();
    let now = chrono::Utc::now();

    sqlx::query(
        r#"INSERT INTO threads (id, channel_id, first_message_id, is_archived, created_at, updated_at)
           VALUES ($1, $2, $3, FALSE, $4, $4)"#,
    )
    .bind(thread_id)
    .bind(message_row.channel_id)
    .bind(message_id)
    .bind(now)
    .execute(&state.db)
    .await?;

    let thread = Thread {
        id: thread_id,
        channel_id: message_row.channel_id,
        first_message_id: message_id,
        is_archived: false,
        archived_at: None,
        created_at: now,
        updated_at: now,
    };

    Ok(Json(json!({
        "data": thread,
        "created": true,
    })))
}

/// Archive or unarchive a thread
/// PATCH /threads/:thread_id/archive
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchiveThreadBody {
    pub archived: bool,
}

pub async fn archive_thread(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(thread_id): Path<Uuid>,
    Json(body): Json<ArchiveThreadBody>,
) -> Result<Json<Value>> {
    // Find thread
    let thread = sqlx::query_as::<_, Thread>("SELECT * FROM threads WHERE id = $1",)
        .bind(thread_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Thread not found".into()))?;

    // Check permissions: user must be a member of the channel/server with MANAGE_SERVER or be the author?
    // For simplicity: require MANAGE_SERVER permission in the server
    let _ = crate::api::servers::common::ensure_server_permission(
        &state,
        user_id,
        // need to get server_id from channel
        // We'll query it
        {
            let server_id = sqlx::query_scalar::<_, Uuid>(
                "SELECT s.id FROM channels c JOIN servers s ON s.id = c.server_id WHERE c.id = $1",
            )
            .bind(thread.channel_id)
            .fetch_optional(&state.db)
            .await?
            .ok_or_else(|| AppError::NotFound("Channel not found".into()))?;
            server_id
        },
        crate::api::servers::common::MANAGE_SERVER_PERMISSION,
        "Only server managers can archive threads",
    )
    .await?;

    let now = chrono::Utc::now();

    if body.archived {
        sqlx::query(
            "UPDATE threads SET is_archived = TRUE, archived_at = $1, updated_at = $2 WHERE id = $3",
        )
        .bind(now)
        .bind(now)
        .bind(thread_id)
        .execute(&state.db)
        .await?;
    } else {
        sqlx::query(
            "UPDATE threads SET is_archived = FALSE, archived_at = NULL, updated_at = $1 WHERE id = $2",
        )
        .bind(now)
        .bind(thread_id)
        .execute(&state.db)
        .await?;
    }

    Ok(Json(json!({
        "data": {
            "threadId": thread_id,
            "archived": body.archived,
        }
    })))
}

#[cfg(test)]
mod tests {}
