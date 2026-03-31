#![allow(dead_code)]

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use super::user::UserPublic;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Friendship {
    pub id: Uuid,
    pub requester_id: Uuid,
    pub addressee_id: Uuid,
    pub status: String, // pending, accepted, blocked
    pub created_at: DateTime<Utc>,
    pub user: UserPublic, // the other person
}

#[derive(Debug, sqlx::FromRow)]
pub struct FriendshipRow {
    pub id: Uuid,
    pub requester_id: Uuid,
    pub addressee_id: Uuid,
    pub status: String,
    pub created_at: DateTime<Utc>,
    // user join (the other person)
    pub user_id: Uuid,
    pub username: String,
    pub discriminator: String,
    pub avatar_url: Option<String>,
    pub banner_url: Option<String>,
    pub bio: Option<String>,
    pub status_field: String,
    pub custom_status: Option<String>,
    pub is_verified: bool,
    pub badges: Vec<String>,
    pub user_created_at: DateTime<Utc>,
}

impl FriendshipRow {
    pub fn into_friendship(self) -> Friendship {
        Friendship {
            id: self.id,
            requester_id: self.requester_id,
            addressee_id: self.addressee_id,
            status: self.status,
            created_at: self.created_at,
            user: UserPublic {
                id: self.user_id,
                username: self.username,
                discriminator: self.discriminator,
                avatar_url: self.avatar_url,
                banner_url: self.banner_url,
                bio: self.bio,
                status: self.status_field,
                custom_status: self.custom_status,
                is_verified: self.is_verified,
                badges: self.badges,
                created_at: self.user_created_at,
            },
        }
    }
}
