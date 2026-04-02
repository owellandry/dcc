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
    pub font_key: Option<String>,
    pub font_weight: Option<i32>,
    #[serde(rename = "type")]
    pub channel_type: String,
    pub position: i32,
    pub is_nsfw: bool,
    pub slowmode_seconds: i32,
    pub last_message_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

pub const VALID_CHANNEL_FONT_KEYS: &[&str] = &["k2d", "manrope", "space-grotesk", "jetbrains-mono"];
pub const VALID_CHANNEL_FONT_WEIGHTS: &[i32] = &[300, 400, 500, 600, 700, 800];

pub fn is_valid_channel_font_key(value: &str) -> bool {
    VALID_CHANNEL_FONT_KEYS.contains(&value)
}

pub fn is_valid_channel_font_weight(value: i32) -> bool {
    VALID_CHANNEL_FONT_WEIGHTS.contains(&value)
}
