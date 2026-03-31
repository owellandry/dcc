use axum::{
    extract::{Path, State},
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    middleware::AuthUser,
    services::pubsub::{publish, user_channel},
    state::AppState,
};

pub async fn list_friends(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
) -> Result<Json<Value>> {
    let rows = sqlx::query!(
        r#"SELECT f.id, f.requester_id, f.addressee_id, f.status, f.created_at,
                  u.id as user_id, u.username, u.discriminator,
                  u.avatar_url, u.banner_url, u.bio,
                  u.status as user_status, u.custom_status, u.is_verified, u.badges,
                  u.created_at as user_created_at
           FROM friendships f
           JOIN users u ON u.id = CASE
               WHEN f.requester_id = $1 THEN f.addressee_id
               ELSE f.requester_id
           END
           WHERE (f.requester_id = $1 OR f.addressee_id = $1)
             AND f.status != 'blocked'
           ORDER BY f.created_at DESC"#,
        user_id
    )
    .fetch_all(&state.db)
    .await?;

    let data: Vec<Value> = rows
        .into_iter()
        .map(|r| json!({
            "id": r.id,
            "requesterId": r.requester_id,
            "addresseeId": r.addressee_id,
            "status": r.status,
            "createdAt": r.created_at,
            "user": {
                "id": r.user_id,
                "username": r.username,
                "discriminator": r.discriminator,
                "avatarUrl": r.avatar_url,
                "bannerUrl": r.banner_url,
                "bio": r.bio,
                "status": r.user_status,
                "customStatus": r.custom_status,
                "isVerified": r.is_verified,
                "badges": r.badges,
                "createdAt": r.user_created_at,
            }
        }))
        .collect();

    Ok(Json(json!({ "data": data })))
}

pub async fn send_request(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(target_id): Path<Uuid>,
) -> Result<Json<Value>> {
    if user_id == target_id {
        return Err(AppError::BadRequest("Cannot send friend request to yourself".into()));
    }

    let target = sqlx::query!(
        r#"SELECT id, username, discriminator, avatar_url, banner_url, bio,
                  status, custom_status, is_verified, badges, created_at
           FROM users WHERE id = $1"#,
        target_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("User not found".into()))?;

    // Check existing relationship
    let existing = sqlx::query!(
        r#"SELECT id, status FROM friendships
           WHERE (requester_id = $1 AND addressee_id = $2)
              OR (requester_id = $2 AND addressee_id = $1)"#,
        user_id,
        target_id,
    )
    .fetch_optional(&state.db)
    .await?;

    if let Some(rel) = existing {
        return match rel.status.as_str() {
            "accepted" => Err(AppError::Conflict("Already friends".into())),
            "pending" => Err(AppError::Conflict("Friend request already pending".into())),
            "blocked" => Err(AppError::Forbidden("Cannot send request to this user".into())),
            _ => Err(AppError::Conflict("Relationship already exists".into())),
        };
    }

    let friendship_id = Uuid::new_v4();
    sqlx::query!(
        r#"INSERT INTO friendships (id, requester_id, addressee_id, status)
           VALUES ($1, $2, $3, 'pending')"#,
        friendship_id,
        user_id,
        target_id,
    )
    .execute(&state.db)
    .await?;

    // Notify target user
    let requester = sqlx::query!(
        r#"SELECT id, username, discriminator, avatar_url, banner_url, bio,
                  status, custom_status, is_verified, badges, created_at
           FROM users WHERE id = $1"#,
        user_id
    )
    .fetch_one(&state.db)
    .await?;

    let event = json!({
        "t": "FRIEND_REQUEST",
        "d": {
            "id": friendship_id,
            "requesterId": user_id,
            "addresseeId": target_id,
            "status": "pending",
            "user": {
                "id": requester.id,
                "username": requester.username,
                "discriminator": requester.discriminator,
                "avatarUrl": requester.avatar_url,
                "bannerUrl": requester.banner_url,
                "bio": requester.bio,
                "status": requester.status,
                "customStatus": requester.custom_status,
                "isVerified": requester.is_verified,
                "badges": requester.badges,
                "createdAt": requester.created_at,
            }
        }
    });
    let _ = publish(&state.redis.clone(), &user_channel(target_id), &event.to_string()).await;

    Ok(Json(json!({
        "data": {
            "id": friendship_id,
            "requesterId": user_id,
            "addresseeId": target_id,
            "status": "pending",
            "createdAt": chrono::Utc::now(),
            "user": {
                "id": target.id,
                "username": target.username,
                "discriminator": target.discriminator,
                "avatarUrl": target.avatar_url,
                "bannerUrl": target.banner_url,
                "bio": target.bio,
                "status": target.status,
                "customStatus": target.custom_status,
                "isVerified": target.is_verified,
                "badges": target.badges,
                "createdAt": target.created_at,
            }
        }
    })))
}

#[derive(Deserialize)]
pub struct UpdateFriendshipBody {
    pub action: String, // accept | decline | block
}

pub async fn update_friendship(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(target_id): Path<Uuid>,
    Json(body): Json<UpdateFriendshipBody>,
) -> Result<Json<Value>> {
    let friendship = sqlx::query!(
        r#"SELECT id, requester_id, addressee_id, status
           FROM friendships
           WHERE (requester_id = $1 AND addressee_id = $2)
              OR (requester_id = $2 AND addressee_id = $1)"#,
        user_id,
        target_id,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Friendship not found".into()))?;

    let new_status = match body.action.as_str() {
        "accept" => {
            if friendship.addressee_id != user_id {
                return Err(AppError::Forbidden("Only the addressee can accept".into()));
            }
            if friendship.status != "pending" {
                return Err(AppError::BadRequest("Request is not pending".into()));
            }
            "accepted"
        }
        "decline" => {
            if friendship.addressee_id != user_id {
                return Err(AppError::Forbidden("Only the addressee can decline".into()));
            }
            if friendship.status != "pending" {
                return Err(AppError::BadRequest("Request is not pending".into()));
            }
            // Delete on decline
            sqlx::query!("DELETE FROM friendships WHERE id = $1", friendship.id)
                .execute(&state.db)
                .await?;
            return Ok(Json(json!({ "data": null })));
        }
        "block" => "blocked",
        _ => return Err(AppError::BadRequest("Invalid action. Use: accept, decline, or block".into())),
    };

    sqlx::query!(
        "UPDATE friendships SET status = $1 WHERE id = $2",
        new_status,
        friendship.id,
    )
    .execute(&state.db)
    .await?;

    // Notify the requester
    let event = json!({
        "t": "FRIEND_UPDATE",
        "d": { "id": friendship.id, "status": new_status, "userId": user_id }
    });
    let _ = publish(
        &state.redis.clone(),
        &user_channel(friendship.requester_id),
        &event.to_string(),
    ).await;

    Ok(Json(json!({ "data": { "status": new_status } })))
}

pub async fn remove_friend(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(target_id): Path<Uuid>,
) -> Result<Json<Value>> {
    let result = sqlx::query!(
        r#"DELETE FROM friendships
           WHERE (requester_id = $1 AND addressee_id = $2)
              OR (requester_id = $2 AND addressee_id = $1)"#,
        user_id,
        target_id,
    )
    .execute(&state.db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Friendship not found".into()));
    }

    Ok(Json(json!({ "data": null })))
}
