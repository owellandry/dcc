#![allow(dead_code)]

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub discriminator: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: Option<String>,
    pub avatar_url: Option<String>,
    pub banner_url: Option<String>,
    pub bio: Option<String>,
    pub status: String,
    pub custom_status: Option<String>,
    pub is_verified: bool,
    pub badges: Vec<String>,
    pub created_at: DateTime<Utc>,
}

/// Public view — never exposes email or password_hash
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPublic {
    pub id: Uuid,
    pub username: String,
    pub discriminator: String,
    pub avatar_url: Option<String>,
    pub banner_url: Option<String>,
    pub bio: Option<String>,
    pub status: String,
    pub custom_status: Option<String>,
    pub is_verified: bool,
    pub badges: Vec<String>,
    pub created_at: DateTime<Utc>,
}

/// Own view — includes email, no password
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserMe {
    pub id: Uuid,
    pub username: String,
    pub discriminator: String,
    pub email: String,
    pub avatar_url: Option<String>,
    pub banner_url: Option<String>,
    pub bio: Option<String>,
    pub status: String,
    pub custom_status: Option<String>,
    pub is_verified: bool,
    pub badges: Vec<String>,
    pub created_at: DateTime<Utc>,
}

impl From<User> for UserPublic {
    fn from(u: User) -> Self {
        UserPublic {
            id: u.id,
            username: u.username,
            discriminator: u.discriminator,
            avatar_url: u.avatar_url,
            banner_url: u.banner_url,
            bio: u.bio,
            status: u.status,
            custom_status: u.custom_status,
            is_verified: u.is_verified,
            badges: u.badges,
            created_at: u.created_at,
        }
    }
}

impl From<User> for UserMe {
    fn from(u: User) -> Self {
        UserMe {
            id: u.id,
            username: u.username,
            discriminator: u.discriminator,
            email: u.email,
            avatar_url: u.avatar_url,
            banner_url: u.banner_url,
            bio: u.bio,
            status: u.status,
            custom_status: u.custom_status,
            is_verified: u.is_verified,
            badges: u.badges,
            created_at: u.created_at,
        }
    }
}
