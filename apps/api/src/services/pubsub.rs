use redis::{aio::ConnectionManager, AsyncCommands};
use uuid::Uuid;

/// Publish a raw JSON string to a Redis pub/sub channel.
pub async fn publish(
    redis: &ConnectionManager,
    channel: &str,
    message: &str,
) -> anyhow::Result<()> {
    let mut conn = redis.clone();
    let _: () = conn.publish(channel, message).await?;
    Ok(())
}

/// Guild channel key — all events for a server
pub fn guild_channel(server_id: Uuid) -> String {
    format!("guild:{}", server_id)
}

/// User channel key — DMs, friend requests, etc.
pub fn user_channel(user_id: Uuid) -> String {
    format!("user:{}", user_id)
}

/// DM / group channel key
pub fn dm_channel(channel_id: Uuid) -> String {
    format!("dm:{}", channel_id)
}
