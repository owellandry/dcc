//! Caching service using Redis
//! Provides TTL-based caching for frequently accessed data.

use redis::AsyncCommands;
use uuid::Uuid;

/// User profile cache key format: "cache:user:{user_id}"
pub fn user_cache_key(user_id: Uuid) -> String {
    format!("cache:user:{}", user_id)
}

/// Server cache key format: "cache:server:{server_id}"
pub fn server_cache_key(server_id: Uuid) -> String {
    format!("cache:server:{}", server_id)
}

/// Server members list cache key format: "cache:server:{server_id}:members"
pub fn server_members_cache_key(server_id: Uuid) -> String {
    format!("cache:server:{}:members", server_id)
}

/// Cache TTLs (in seconds)
pub const USER_CACHE_TTL: usize = 30 * 60; // 30 minutes
pub const SERVER_CACHE_TTL: usize = 5 * 60; // 5 minutes
pub const SERVER_MEMBERS_TTL: usize = 60; // 1 minute

/// Get a cached value by key
pub async fn get<T: for<'de> serde::Deserialize<'de>>(
    redis: &mut redis::aio::ConnectionManager,
    key: &str,
) -> redis::RedisResult<Option<T>> {
    let data: Option<Vec<u8>> = redis.get(key).await?;
    match data {
        Some(bytes) => {
            let value = bincode::deserialize(&bytes).map_err(|e| {
                redis::RedisError::from((
                    redis::ErrorKind::TypeError,
                    "Failed to deserialize cached value",
                    format!("{e}"),
                ))
            })?;
            Ok(Some(value))
        }
        None => Ok(None),
    }
}

/// Set a cached value with TTL
pub async fn set<T: serde::Serialize>(
    redis: &mut redis::aio::ConnectionManager,
    key: &str,
    value: &T,
    ttl_secs: usize,
) -> redis::RedisResult<()> {
    let data = bincode::serialize(value).map_err(|e| {
        redis::RedisError::from((
            redis::ErrorKind::TypeError,
            "Failed to serialize value for cache",
            format!("{e}"),
        ))
    })?;
    redis.set::<_, _, ()>(key, data).await?;
    // Evita el fallback del tipo `!` en Rust 2024.
    redis.expire::<_, ()>(key, ttl_secs as i64).await?;
    Ok(())
}

/// Delete a cached key
pub async fn delete(redis: &mut redis::aio::ConnectionManager, key: &str) -> redis::RedisResult<()> {
    redis.del::<_, ()>(key).await?;
    Ok(())
}

/// Invalidate user profile cache
pub async fn invalidate_user(redis: &mut redis::aio::ConnectionManager, user_id: Uuid) {
    let key = user_cache_key(user_id);
    let _ = delete(redis, &key).await;
}

/// Invalidate server cache (and related members cache)
pub async fn invalidate_server(
    redis: &mut redis::aio::ConnectionManager,
    server_id: Uuid,
) {
    let server_key = server_cache_key(server_id);
    let members_key = server_members_cache_key(server_id);
    let _ = redis.del::<_, ()>(&server_key).await;
    let _ = delete(redis, &members_key).await;
}

/// Get cached user profile (public view), or fetch and cache if missing
pub async fn get_or_fetch_user_public<F>(
    redis: &mut redis::aio::ConnectionManager,
    user_id: Uuid,
    fetch_fn: F,
) -> Result<Option<crate::models::user::UserPublic>, crate::error::AppError>
where
    F: std::future::Future<Output = Result<Option<crate::models::user::UserPublic>, crate::error::AppError>>,
{
    let cache_key = user_cache_key(user_id);

    // Try to get from cache first
    if let Some(profile) = get::<crate::models::user::UserPublic>(redis, &cache_key).await.map_err(|e| {
        crate::error::AppError::Internal(anyhow::anyhow!("Redis cache error: {}", e))
    })? {
        return Ok(Some(profile));
    }

    // Cache miss: fetch from source
    let Some(profile) = fetch_fn.await? else {
        return Ok(None);
    };

    // Cache the result (clone needed because profile is moved)
    let profile_clone = profile.clone();
    if let Err(e) = set(redis, &cache_key, &profile_clone, USER_CACHE_TTL).await {
        tracing::warn!("Failed to cache user profile: {}", e);
    }

    Ok(Some(profile))
}

/// Get cached user (private view with email), or fetch and cache if missing
pub async fn get_or_fetch_user_me<F>(
    redis: &mut redis::aio::ConnectionManager,
    user_id: Uuid,
    fetch_fn: F,
) -> Result<Option<crate::models::user::UserMe>, crate::error::AppError>
where
    F: std::future::Future<Output = Result<Option<crate::models::user::UserMe>, crate::error::AppError>>,
{
    let cache_key = user_cache_key(user_id);

    if let Some(profile) = get::<crate::models::user::UserMe>(redis, &cache_key).await.map_err(|e| {
        crate::error::AppError::Internal(anyhow::anyhow!("Redis cache error: {}", e))
    })? {
        return Ok(Some(profile));
    }

    let Some(profile) = fetch_fn.await? else {
        return Ok(None);
    };

    let profile_clone = profile.clone();
    if let Err(e) = set(redis, &cache_key, &profile_clone, USER_CACHE_TTL).await {
        tracing::warn!("Failed to cache user profile: {}", e);
    }

    Ok(Some(profile))
}

/// Get cached server, or fetch and cache if missing
pub async fn get_or_fetch_server<F>(
    redis: &mut redis::aio::ConnectionManager,
    server_id: Uuid,
    fetch_fn: F,
) -> Result<Option<crate::models::server::Server>, crate::error::AppError>
where
    F: std::future::Future<Output = Result<Option<crate::models::server::Server>, crate::error::AppError>>,
{
    let cache_key = server_cache_key(server_id);

    // Try cache first
    if let Some(server) = get::<crate::models::server::Server>(redis, &cache_key).await.map_err(|e| {
        crate::error::AppError::Internal(anyhow::anyhow!("Redis cache error: {}", e))
    })? {
        return Ok(Some(server));
    }

    // Cache miss: fetch
    let Some(server) = fetch_fn.await? else {
        return Ok(None);
    };

    let server_clone = server.clone();
    if let Err(e) = set(redis, &cache_key, &server_clone, SERVER_CACHE_TTL).await {
        tracing::warn!("Failed to cache server: {}", e);
    }

    Ok(Some(server))
}
