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
    models::user::UserPublic,
    services::pubsub::{publish, user_channel},
    state::AppState,
};

#[derive(sqlx::FromRow)]
struct FriendshipViewRow {
    id: Uuid,
    requester_id: Uuid,
    addressee_id: Uuid,
    status: String,
    created_at: chrono::DateTime<chrono::Utc>,
    user_id: Uuid,
    username: String,
    display_name: Option<String>,
    discriminator: String,
    avatar_url: Option<String>,
    avatar_decoration_url: Option<String>,
    banner_url: Option<String>,
    bio: Option<String>,
    user_status: Option<String>,
    custom_status: Option<String>,
    is_verified: bool,
    badges: serde_json::Value,
    user_created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(sqlx::FromRow)]
struct FriendshipCoreRow {
    id: Uuid,
    requester_id: Uuid,
    addressee_id: Uuid,
    status: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFriendRequestBody {
    pub username: String,
}

#[derive(Deserialize)]
pub struct UpdateFriendshipBody {
    pub action: String, // accept | decline | block
}

pub async fn list_friends(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
) -> Result<Json<Value>> {
    let rows = sqlx::query_as::<_, FriendshipViewRow>(
        r#"SELECT f.id, f.requester_id, f.addressee_id, f.status, f.created_at,
                  u.id as user_id, u.username, u.display_name, u.discriminator,
                  u.avatar_url, u.avatar_decoration_url, u.banner_url, u.bio,
                  u.status as user_status, u.custom_status, u.is_verified, to_jsonb(u.badges) as badges,
                  u.created_at as user_created_at
           FROM friendships f
           JOIN users u ON u.id = CASE
               WHEN f.requester_id = $1 THEN f.addressee_id
               ELSE f.requester_id
           END
           WHERE f.requester_id = $1 OR f.addressee_id = $1
           ORDER BY f.created_at DESC"#,
    )
    .bind(user_id)
    .fetch_all(&state.db)
    .await?;

    let data = rows
        .into_iter()
        .map(friendship_row_to_json)
        .collect::<Vec<_>>();

    Ok(Json(json!({ "data": data })))
}

pub async fn send_request_by_username(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Json(body): Json<CreateFriendRequestBody>,
) -> Result<Json<Value>> {
    let target = find_user_by_username(&state, body.username.trim()).await?;
    let payload = create_friend_request(&state, user_id, target.id).await?;

    Ok(Json(json!({ "data": payload })))
}

pub async fn send_request(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(target_id): Path<Uuid>,
) -> Result<Json<Value>> {
    let payload = create_friend_request(&state, user_id, target_id).await?;

    Ok(Json(json!({ "data": payload })))
}

pub async fn update_friendship(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(target_id): Path<Uuid>,
    Json(body): Json<UpdateFriendshipBody>,
) -> Result<Json<Value>> {
    let friendship = sqlx::query_as::<_, FriendshipCoreRow>(
        r#"SELECT id, requester_id, addressee_id, status
           FROM friendships
           WHERE (requester_id = $1 AND addressee_id = $2)
              OR (requester_id = $2 AND addressee_id = $1)"#,
    )
    .bind(user_id)
    .bind(target_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Friendship not found".into()))?;

    let other_user_id = other_user_id(&friendship, user_id)?;

    match body.action.as_str() {
        "accept" => {
            if friendship.addressee_id != user_id {
                return Err(AppError::Forbidden("Only the addressee can accept".into()));
            }
            if friendship.status != "pending" {
                return Err(AppError::BadRequest("Request is not pending".into()));
            }

            sqlx::query("UPDATE friendships SET status = 'accepted' WHERE id = $1")
                .bind(friendship.id)
                .execute(&state.db)
                .await?;

            publish_friendship_event(&state, user_id, "FRIEND_UPDATE", friendship.id).await;
            publish_friendship_event(&state, other_user_id, "FRIEND_UPDATE", friendship.id).await;

            let payload = friendship_payload_for_viewer(&state, friendship.id, user_id)
                .await?
                .ok_or_else(|| AppError::NotFound("Friendship not found".into()))?;

            Ok(Json(json!({ "data": payload })))
        }
        "decline" => {
            if friendship.addressee_id != user_id {
                return Err(AppError::Forbidden("Only the addressee can decline".into()));
            }
            if friendship.status != "pending" {
                return Err(AppError::BadRequest("Request is not pending".into()));
            }

            sqlx::query("DELETE FROM friendships WHERE id = $1")
                .bind(friendship.id)
                .execute(&state.db)
                .await?;

            publish_friend_remove(&state, user_id, friendship.id, other_user_id, "declined").await;
            publish_friend_remove(&state, other_user_id, friendship.id, user_id, "declined").await;

            Ok(Json(json!({ "data": null })))
        }
        "block" => {
            sqlx::query("UPDATE friendships SET status = 'blocked' WHERE id = $1")
                .bind(friendship.id)
                .execute(&state.db)
                .await?;

            publish_friendship_event(&state, user_id, "FRIEND_UPDATE", friendship.id).await;
            publish_friend_remove(&state, other_user_id, friendship.id, user_id, "blocked").await;

            let payload = friendship_payload_for_viewer(&state, friendship.id, user_id)
                .await?
                .ok_or_else(|| AppError::NotFound("Friendship not found".into()))?;

            Ok(Json(json!({ "data": payload })))
        }
        _ => Err(AppError::BadRequest(
            "Invalid action. Use: accept, decline, or block".into(),
        )),
    }
}

pub async fn remove_friend(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(target_id): Path<Uuid>,
) -> Result<Json<Value>> {
    let friendship = sqlx::query_as::<_, FriendshipCoreRow>(
        r#"SELECT id, requester_id, addressee_id, status
           FROM friendships
           WHERE (requester_id = $1 AND addressee_id = $2)
              OR (requester_id = $2 AND addressee_id = $1)"#,
    )
    .bind(user_id)
    .bind(target_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Friendship not found".into()))?;

    let other_user_id = other_user_id(&friendship, user_id)?;

    sqlx::query("DELETE FROM friendships WHERE id = $1")
        .bind(friendship.id)
        .execute(&state.db)
        .await?;

    publish_friend_remove(&state, user_id, friendship.id, other_user_id, "removed").await;
    publish_friend_remove(&state, other_user_id, friendship.id, user_id, "removed").await;

    Ok(Json(json!({ "data": null })))
}

async fn create_friend_request(
    state: &AppState,
    user_id: Uuid,
    target_id: Uuid,
) -> Result<Value> {
    if user_id == target_id {
        return Err(AppError::BadRequest(
            "Cannot send friend request to yourself".into(),
        ));
    }

    let _target = get_user_public_by_id(state, target_id)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".into()))?;

    #[derive(sqlx::FromRow)]
    struct FriendshipStatusRow {
        status: String,
    }

    let existing = sqlx::query_as::<_, FriendshipStatusRow>(
        r#"SELECT status FROM friendships
           WHERE (requester_id = $1 AND addressee_id = $2)
              OR (requester_id = $2 AND addressee_id = $1)"#,
    )
    .bind(user_id)
    .bind(target_id)
    .fetch_optional(&state.db)
    .await?;

    if let Some(rel) = existing {
        return match rel.status.as_str() {
            "accepted" => Err(AppError::Conflict("Already friends".into())),
            "pending" => Err(AppError::Conflict("Friend request already pending".into())),
            "blocked" => Err(AppError::Forbidden(
                "Cannot send request to this user".into(),
            )),
            _ => Err(AppError::Conflict("Relationship already exists".into())),
        };
    }

    let friendship_id = Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO friendships (id, requester_id, addressee_id, status)
           VALUES ($1, $2, $3, 'pending')"#,
    )
    .bind(friendship_id)
    .bind(user_id)
    .bind(target_id)
    .execute(&state.db)
    .await?;

    publish_friendship_event(state, user_id, "FRIEND_REQUEST", friendship_id).await;
    publish_friendship_event(state, target_id, "FRIEND_REQUEST", friendship_id).await;

    friendship_payload_for_viewer(state, friendship_id, user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Friendship not found".into()))
}

async fn find_user_by_username(state: &AppState, raw_value: &str) -> Result<UserPublic> {
    let trimmed = raw_value.trim();
    if trimmed.is_empty() {
        return Err(AppError::validation("username", "Username is required"));
    }

    let (username, discriminator) = parse_username_lookup(trimmed);

    let user = if let Some(discriminator) = discriminator {
        sqlx::query_as::<_, UserPublic>(
            r#"SELECT id, username, display_name, discriminator, avatar_url, avatar_decoration_url, banner_url, bio,
                      status, custom_status, is_verified, badges, created_at
               FROM users
               WHERE LOWER(username) = LOWER($1) AND discriminator = $2
               LIMIT 1"#,
        )
        .bind(username)
        .bind(discriminator)
        .fetch_optional(&state.db)
        .await?
    } else {
        sqlx::query_as::<_, UserPublic>(
            r#"SELECT id, username, display_name, discriminator, avatar_url, avatar_decoration_url, banner_url, bio,
                      status, custom_status, is_verified, badges, created_at
               FROM users
               WHERE LOWER(username) = LOWER($1)
               LIMIT 1"#,
        )
        .bind(username)
        .fetch_optional(&state.db)
        .await?
    };

    user.ok_or_else(|| AppError::NotFound("User not found".into()))
}

fn parse_username_lookup(value: &str) -> (&str, Option<&str>) {
    let mut parts = value.splitn(2, '#');
    let username = parts.next().unwrap_or(value).trim();
    let discriminator = parts
        .next()
        .map(str::trim)
        .filter(|part| !part.is_empty());

    (username, discriminator)
}

async fn get_user_public_by_id(state: &AppState, user_id: Uuid) -> Result<Option<UserPublic>> {
    sqlx::query_as::<_, UserPublic>(
        r#"SELECT id, username, display_name, discriminator, avatar_url, avatar_decoration_url, banner_url, bio,
                  status, custom_status, is_verified, badges, created_at
           FROM users WHERE id = $1"#,
    )
    .bind(user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(Into::into)
}

async fn friendship_payload_for_viewer(
    state: &AppState,
    friendship_id: Uuid,
    viewer_id: Uuid,
) -> Result<Option<Value>> {
    let row = sqlx::query_as::<_, FriendshipViewRow>(
        r#"SELECT f.id, f.requester_id, f.addressee_id, f.status, f.created_at,
                  u.id as user_id, u.username, u.display_name, u.discriminator,
                  u.avatar_url, u.avatar_decoration_url, u.banner_url, u.bio,
                  u.status as user_status, u.custom_status, u.is_verified, to_jsonb(u.badges) as badges,
                  u.created_at as user_created_at
           FROM friendships f
           JOIN users u ON u.id = CASE
               WHEN f.requester_id = $2 THEN f.addressee_id
               ELSE f.requester_id
           END
           WHERE f.id = $1 AND (f.requester_id = $2 OR f.addressee_id = $2)"#,
    )
    .bind(friendship_id)
    .bind(viewer_id)
    .fetch_optional(&state.db)
    .await?;

    Ok(row.map(friendship_row_to_json))
}

async fn publish_friendship_event(
    state: &AppState,
    recipient_id: Uuid,
    event_type: &str,
    friendship_id: Uuid,
) {
    let Ok(Some(payload)) = friendship_payload_for_viewer(state, friendship_id, recipient_id).await else {
        return;
    };

    let event = json!({
        "t": event_type,
        "d": payload,
    });
    let _ = publish(
        &state.redis.clone(),
        &user_channel(recipient_id),
        &event.to_string(),
    )
    .await;
}

async fn publish_friend_remove(
    state: &AppState,
    recipient_id: Uuid,
    friendship_id: Uuid,
    other_user_id: Uuid,
    reason: &str,
) {
    let event = json!({
        "t": "FRIEND_REMOVE",
        "d": {
            "friendshipId": friendship_id,
            "userId": other_user_id,
            "reason": reason,
        }
    });
    let _ = publish(
        &state.redis.clone(),
        &user_channel(recipient_id),
        &event.to_string(),
    )
    .await;
}

fn friendship_row_to_json(row: FriendshipViewRow) -> Value {
    json!({
        "id": row.id,
        "requesterId": row.requester_id,
        "addresseeId": row.addressee_id,
        "status": row.status,
        "createdAt": row.created_at,
        "user": {
            "id": row.user_id,
            "username": row.username,
            "displayName": row.display_name,
            "discriminator": row.discriminator,
            "avatarUrl": row.avatar_url,
            "avatarDecorationUrl": row.avatar_decoration_url,
            "bannerUrl": row.banner_url,
            "bio": row.bio,
            "status": row.user_status,
            "customStatus": row.custom_status,
            "isVerified": row.is_verified,
            "badges": row.badges,
            "createdAt": row.user_created_at,
        }
    })
}

fn other_user_id(friendship: &FriendshipCoreRow, viewer_id: Uuid) -> Result<Uuid> {
    if friendship.requester_id == viewer_id {
        Ok(friendship.addressee_id)
    } else if friendship.addressee_id == viewer_id {
        Ok(friendship.requester_id)
    } else {
        Err(AppError::Forbidden("Friendship does not belong to this user".into()))
    }
}
