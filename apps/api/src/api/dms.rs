use axum::{
    extract::{Path, State},
    Json,
};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    middleware::AuthUser,
    state::AppState,
};

#[derive(sqlx::FromRow)]
struct DmChannelRow {
    id: Uuid,
    name: Option<String>,
    channel_type: String,
    last_message_id: Option<Uuid>,
    created_at: chrono::DateTime<chrono::Utc>,
}

pub async fn list_dms(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
) -> Result<Json<Value>> {
    let rows = sqlx::query_as::<_, DmChannelRow>(
        r#"SELECT c.id, c.name, c.channel_type, c.last_message_id, c.created_at
           FROM channels c
           JOIN dm_participants dp ON dp.channel_id = c.id
           WHERE dp.user_id = $1
             AND c.channel_type IN ('dm', 'group_dm')
           ORDER BY c.created_at DESC"#,
    )
    .bind(user_id)
    .fetch_all(&state.db)
    .await?;

    let mut dms: Vec<Value> = Vec::with_capacity(rows.len());
    for r in &rows {
        // Get other participants
        let participants = sqlx::query_as::<_, crate::models::user::UserPublic>(
            r#"SELECT u.id, u.username, u.discriminator, u.avatar_url, u.banner_url,
                      u.bio, u.status, u.custom_status, u.is_verified, u.badges, u.created_at
               FROM dm_participants dp
               JOIN users u ON u.id = dp.user_id
               WHERE dp.channel_id = $1 AND dp.user_id != $2"#,
        )
        .bind(r.id)
        .bind(user_id)
        .fetch_all(&state.db)
        .await?;

        let parts: Vec<Value> = participants
            .iter()
            .map(|u| {
                json!({
                    "id": u.id,
                    "username": u.username,
                    "discriminator": u.discriminator,
                    "avatarUrl": u.avatar_url,
                    "bannerUrl": u.banner_url,
                    "bio": u.bio,
                    "status": u.status,
                    "customStatus": u.custom_status,
                    "isVerified": u.is_verified,
                    "badges": u.badges,
                    "createdAt": u.created_at,
                })
            })
            .collect();

        dms.push(json!({
            "id": r.id,
            "serverId": null,
            "categoryId": null,
            "name": r.name,
            "topic": null,
            "iconKey": null,
            "type": r.channel_type,
            "position": 0,
            "isNsfw": false,
            "slowmodeSeconds": 0,
            "lastMessageId": r.last_message_id,
            "createdAt": r.created_at,
            "participants": parts,
        }));
    }

    Ok(Json(json!({ "data": dms })))
}

pub async fn open_dm(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(target_user_id): Path<Uuid>,
) -> Result<Json<Value>> {
    if user_id == target_user_id {
        return Err(AppError::BadRequest("Cannot open DM with yourself".into()));
    }

    // Check target user exists
    let exists: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)")
        .bind(target_user_id)
        .fetch_one(&state.db)
        .await?;

    if !exists {
        return Err(AppError::NotFound("User not found".into()));
    }

    // Check if DM already exists between these two users
    let existing = sqlx::query_scalar::<_, Uuid>(
        r#"SELECT c.id
           FROM channels c
           WHERE c.channel_type = 'dm'
             AND EXISTS(SELECT 1 FROM dm_participants WHERE channel_id = c.id AND user_id = $1)
             AND EXISTS(SELECT 1 FROM dm_participants WHERE channel_id = c.id AND user_id = $2)
             AND (SELECT COUNT(*) FROM dm_participants WHERE channel_id = c.id) = 2"#,
    )
    .bind(user_id)
    .bind(target_user_id)
    .fetch_optional(&state.db)
    .await?;

    let channel_id = if let Some(id) = existing {
        id
    } else {
        // Create new DM channel
        let new_id = Uuid::new_v4();
        let mut tx = state.db.begin().await?;

        sqlx::query("INSERT INTO channels (id, channel_type, position) VALUES ($1, 'dm', 0)")
            .bind(new_id)
            .execute(&mut *tx)
            .await?;

        sqlx::query("INSERT INTO dm_participants (channel_id, user_id) VALUES ($1, $2), ($1, $3)")
            .bind(new_id)
            .bind(user_id)
            .bind(target_user_id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        new_id
    };

    // Fetch channel + other user info
    let ch = sqlx::query_as::<_, DmChannelRow>(
        r#"SELECT id, name, channel_type, last_message_id, created_at
           FROM channels WHERE id = $1"#,
    )
    .bind(channel_id)
    .fetch_one(&state.db)
    .await?;

    let other = sqlx::query_as::<_, crate::models::user::UserPublic>(
        r#"SELECT u.id, u.username, u.discriminator, u.avatar_url, u.banner_url,
                  u.bio, u.status, u.custom_status, u.is_verified, u.badges, u.created_at
           FROM users u WHERE u.id = $1"#,
    )
    .bind(target_user_id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(json!({
        "data": {
            "id": ch.id,
            "serverId": null,
            "categoryId": null,
            "name": ch.name,
            "topic": null,
            "iconKey": null,
            "type": ch.channel_type,
            "position": 0,
            "isNsfw": false,
            "slowmodeSeconds": 0,
            "lastMessageId": ch.last_message_id,
            "createdAt": ch.created_at,
            "participants": [{
                "id": other.id,
                "username": other.username,
                "discriminator": other.discriminator,
                "avatarUrl": other.avatar_url,
                "bannerUrl": other.banner_url,
                "bio": other.bio,
                "status": other.status,
                "customStatus": other.custom_status,
                "isVerified": other.is_verified,
                "badges": other.badges,
                "createdAt": other.created_at,
            }],
        }
    })))
}

pub async fn close_dm(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(channel_id): Path<Uuid>,
) -> Result<Json<Value>> {
    // Verify user is a participant
    let in_dm: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM dm_participants WHERE channel_id = $1 AND user_id = $2)",
    )
    .bind(channel_id)
    .bind(user_id)
    .fetch_one(&state.db)
    .await?;

    if !in_dm {
        return Err(AppError::Forbidden("Not a participant of this DM".into()));
    }

    // Remove this user from participants (soft close — DM still exists for the other party)
    sqlx::query("DELETE FROM dm_participants WHERE channel_id = $1 AND user_id = $2")
        .bind(channel_id)
        .bind(user_id)
        .execute(&state.db)
        .await?;

    // If no participants left, delete the channel
    let remaining: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM dm_participants WHERE channel_id = $1")
            .bind(channel_id)
            .fetch_one(&state.db)
            .await?;

    if remaining == 0 {
        sqlx::query("DELETE FROM channels WHERE id = $1")
            .bind(channel_id)
            .execute(&state.db)
            .await?;
    }

    Ok(Json(json!({ "data": null })))
}
