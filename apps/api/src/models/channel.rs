use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Channel {
    pub id: Uuid,
    pub server_id: Option<Uuid>,
    pub category_id: Option<Uuid>,
    pub name: Option<String>,
    pub topic: Option<String>,
    pub icon_key: Option<String>,
    #[serde(rename = "type")]
    pub channel_type: String,
    pub position: i32,
    pub is_nsfw: bool,
    pub slowmode_seconds: i32,
    pub last_message_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}
