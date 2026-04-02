#![allow(dead_code)]

use super::user::UserPublic;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: Uuid,
    pub channel_id: Uuid,
    pub author: UserPublic,
    pub content: Option<String>,
    #[serde(rename = "type")]
    pub message_type: String,
    pub reply_to: Option<Box<MessageReply>>,
    /// If this message is part of a thread, this is the root message ID
    #[serde(rename = "threadParentId")]
    pub thread_parent_id: Option<Uuid>,
    pub attachments: Vec<Attachment>,
    pub reactions: Vec<Reaction>,
    pub is_edited: bool,
    pub created_at: DateTime<Utc>,
    pub edited_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageReply {
    pub id: Uuid,
    pub author: UserPublic,
    pub content: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Attachment {
    pub id: Uuid,
    pub message_id: Uuid,
    pub url: String,
    pub filename: String,
    pub content_type: Option<String>,
    pub size_bytes: Option<i64>,
    pub width: Option<i32>,
    pub height: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Reaction {
    pub emoji: String,
    pub count: i64,
    pub me_reacted: bool,
}

/// Raw DB row for a message
#[derive(Debug, sqlx::FromRow)]
pub struct MessageRow {
    pub id: Uuid,
    pub channel_id: Uuid,
    pub author_id: Uuid,
    pub content: Option<String>,
    pub message_type: String,
    pub reply_to_id: Option<Uuid>,
    pub parent_message_id: Option<Uuid>,
    pub is_edited: bool,
    pub created_at: DateTime<Utc>,
    pub edited_at: Option<DateTime<Utc>>,
    // author join
    pub author_username: String,
    pub author_discriminator: String,
    pub author_avatar_url: Option<String>,
    pub author_banner_url: Option<String>,
    pub author_bio: Option<String>,
    pub author_status: String,
    pub author_custom_status: Option<String>,
    pub author_is_verified: bool,
    pub author_badges: Vec<String>,
    pub author_created_at: DateTime<Utc>,
}

impl MessageRow {
    pub fn into_message(
        self,
        reply_to: Option<MessageReply>,
        attachments: Vec<Attachment>,
        reactions: Vec<Reaction>,
    ) -> Message {
        Message {
            id: self.id,
            channel_id: self.channel_id,
            author: UserPublic {
                id: self.author_id,
                username: self.author_username,
                discriminator: self.author_discriminator,
                avatar_url: self.author_avatar_url,
                banner_url: self.author_banner_url,
                bio: self.author_bio,
                status: self.author_status,
                custom_status: self.author_custom_status,
                is_verified: self.author_is_verified,
                badges: self.author_badges,
                created_at: self.author_created_at,
            },
            content: self.content,
            message_type: self.message_type,
            reply_to: reply_to.map(Box::new),
            thread_parent_id: self.parent_message_id,
            attachments,
            reactions,
            is_edited: self.is_edited,
            created_at: self.created_at,
            edited_at: self.edited_at,
        }
    }
}
