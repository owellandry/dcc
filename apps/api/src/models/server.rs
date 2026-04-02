#![allow(dead_code)]

use super::user::UserPublic;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Server {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub icon_url: Option<String>,
    pub banner_url: Option<String>,
    pub owner_id: Uuid,
    pub invite_code: String,
    pub is_public: bool,
    pub member_count: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Category {
    pub id: Uuid,
    pub server_id: Uuid,
    pub name: String,
    pub position: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Role {
    pub id: Uuid,
    pub server_id: Uuid,
    pub name: String,
    pub color: Option<i32>,
    pub permissions: i64,
    pub position: i32,
    pub is_mentionable: bool,
    pub is_hoisted: bool,
    pub is_managed: bool,
    pub is_default: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerMember {
    pub server_id: Uuid,
    pub user_id: Uuid,
    pub nickname: Option<String>,
    pub joined_at: DateTime<Utc>,
    pub roles: Vec<Role>,
    pub user: UserPublic,
}

/// Raw row from DB join
#[derive(Debug, sqlx::FromRow)]
pub struct ServerMemberRow {
    pub server_id: Uuid,
    pub user_id: Uuid,
    pub nickname: Option<String>,
    pub joined_at: DateTime<Utc>,
    // user fields
    pub username: String,
    pub display_name: Option<String>,
    pub discriminator: String,
    pub avatar_url: Option<String>,
    pub avatar_decoration_url: Option<String>,
    pub banner_url: Option<String>,
    pub bio: Option<String>,
    pub status: String,
    pub custom_status: Option<String>,
    pub is_verified: bool,
    pub badges: Vec<String>,
    pub user_created_at: DateTime<Utc>,
}

impl ServerMemberRow {
    pub fn into_member(self, roles: Vec<Role>) -> ServerMember {
        ServerMember {
            server_id: self.server_id,
            user_id: self.user_id,
            nickname: self.nickname,
            joined_at: self.joined_at,
            roles,
            user: UserPublic {
                id: self.user_id,
                username: self.username,
                display_name: self.display_name,
                discriminator: self.discriminator,
                avatar_url: self.avatar_url,
                avatar_decoration_url: self.avatar_decoration_url,
                banner_url: self.banner_url,
                bio: self.bio,
                status: self.status,
                custom_status: self.custom_status,
                is_verified: self.is_verified,
                badges: self.badges,
                created_at: self.user_created_at,
            },
        }
    }
}
