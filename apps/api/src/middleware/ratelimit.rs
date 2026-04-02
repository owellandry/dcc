use axum::{
    body::Body,
    http::{
        header::{
            ACCESS_CONTROL_ALLOW_CREDENTIALS, ACCESS_CONTROL_ALLOW_HEADERS,
            ACCESS_CONTROL_ALLOW_METHODS, ACCESS_CONTROL_ALLOW_ORIGIN, ORIGIN, VARY,
        },
        HeaderMap, HeaderValue, Method, Request, Response, StatusCode,
    },
    middleware::Next,
    response::IntoResponse,
};
use redis::AsyncCommands;
use tracing::warn;

use crate::state::AppState;

/// Rate limiting middleware using Redis INCR with TTL
/// Format of keys: "ratelimit:{scope}:{identifier}"
/// Example: "ratelimit:user:12345" for authenticated user
///          "ratelimit:ip:192.168.1.1" for anonymous
pub async fn rate_limit_middleware(
    state: &AppState,
    req: Request<Body>,
    next: Next,
) -> Response<Body> {
    let path = req.uri().path().to_string();
    let method = req.method().clone();

    // Determine limits based on path
    let config = match get_rate_limit_config(&method, &path) {
        Some(cfg) => cfg,
        None => {
            // No rate limit for this path (e.g., WebSocket, health checks)
            return next.run(req).await;
        }
    };

    let request_origin = req.headers().get(ORIGIN).cloned();

    // Get identifier: user_id if authenticated, else IP
    let identifier = if let Some(user_id) = req.extensions().get::<uuid::Uuid>() {
        format!("user:{user_id}")
    } else {
        // Use remote address (behind proxy, configure X-Forwarded-For in production)
        // For now, we accept any connection (no IP extractor in extensions yet)
        // We'll use a placeholder; in production, add IP extraction middleware
        "anonymous".to_string()
    };

    let key = format!("ratelimit:{}:{}", config.scope, identifier);
    let mut redis = state.redis.clone();

    // Check current count
    let current: Option<u32> = match redis.get(&key).await {
        Ok(v) => v,
        Err(e) => {
            warn!("Redis error in rate limit: {}", e);
            // Fail open: allow request if Redis is down
            return next.run(req).await;
        }
    };

    let current = current.unwrap_or(0);

    if current >= config.max_requests {
        warn!(
            "Rate limit exceeded: {} requests in {}s for {}",
            config.max_requests, config.window_secs, identifier
        );

        let mut response = (StatusCode::TOO_MANY_REQUESTS, "Too Many Requests").into_response();
        let headers = response.headers_mut();
        apply_rate_limit_headers(headers, &config, current);
        apply_cors_headers(headers, request_origin.as_ref());
        return response;
    }

    // Increment counter, set TTL if first request
    let _: u32 = redis.incr(&key, 1).await.unwrap_or(0);
    if current == 0 {
        let _: () = redis
            .expire(&key, config.window_secs as i64)
            .await
            .unwrap_or(());
    }

    // Continue to next middleware/handler
    let response = next.run(req).await;

    // Add rate limit headers to response
    let (mut parts, body) = response.into_parts();
    apply_rate_limit_headers(&mut parts.headers, &config, current);
    apply_cors_headers(&mut parts.headers, request_origin.as_ref());

    Response::from_parts(parts, body)
}

/// Rate limit configuration per endpoint scope
#[derive(Clone, Copy)]
pub struct RateLimitConfig {
    pub max_requests: u32,
    pub window_secs: u64,
    pub scope: &'static str,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            max_requests: 100,
            window_secs: 60,
            scope: "general",
        }
    }
}

/// Determine rate limit config based on request path and method
fn get_rate_limit_config(method: &Method, path: &str) -> Option<RateLimitConfig> {
    // Skip rate limiting for these paths
    if path.starts_with("/ws") || path.starts_with("/health") || path.starts_with("/ready") {
        return None;
    }

    // Refresh is called automatically by the client and needs a looser bucket
    if path == "/v1/auth/refresh" {
        return Some(RateLimitConfig {
            max_requests: 60,
            window_secs: 60,
            scope: "refresh",
        });
    }

    // Authentication endpoints: stricter
    if path.starts_with("/v1/auth/") {
        return Some(RateLimitConfig {
            max_requests: 5,
            window_secs: 60,
            scope: "auth",
        });
    }

    // Message creation: 10 per second
    if method == Method::POST && path.starts_with("/v1/channels/") && path.ends_with("/messages") {
        return Some(RateLimitConfig {
            max_requests: 10,
            window_secs: 1,
            scope: "messages",
        });
    }

    // Upload endpoints: 10 per minute
    if method == Method::POST
        && (path.ends_with("/avatar")
            || path.ends_with("/avatar-decoration")
            || path.ends_with("/banner")
            || path.ends_with("/icon"))
    {
        return Some(RateLimitConfig {
            max_requests: 10,
            window_secs: 60,
            scope: "uploads",
        });
    }

    // Server moderation (kicks, bans, role changes): 30 per minute
    if path.contains("/servers/")
        && (path.ends_with("/kick")
            || path.contains("/bans")
            || path.contains("/roles")
            || path.contains("/overwrites"))
    {
        return Some(RateLimitConfig {
            max_requests: 30,
            window_secs: 60,
            scope: "admin",
        });
    }

    // General API: 100 requests per minute
    if path.starts_with("/v1/") {
        return Some(RateLimitConfig {
            max_requests: 100,
            window_secs: 60,
            scope: "general",
        });
    }

    // Unknown paths: no rate limit
    None
}

fn apply_rate_limit_headers(headers: &mut HeaderMap, config: &RateLimitConfig, current: u32) {
    headers.insert(
        "X-RateLimit-Limit",
        config.max_requests.to_string().parse().unwrap(),
    );
    headers.insert(
        "X-RateLimit-Remaining",
        config
            .max_requests
            .saturating_sub(current + 1)
            .to_string()
            .parse()
            .unwrap(),
    );
}

fn apply_cors_headers(headers: &mut HeaderMap, request_origin: Option<&HeaderValue>) {
    if let Some(origin) = request_origin {
        headers.insert(ACCESS_CONTROL_ALLOW_ORIGIN, origin.clone());
        headers.insert(ACCESS_CONTROL_ALLOW_CREDENTIALS, HeaderValue::from_static("true"));
        headers.insert(
            ACCESS_CONTROL_ALLOW_METHODS,
            HeaderValue::from_static("GET, POST, PUT, PATCH, DELETE, OPTIONS"),
        );
        headers.insert(
            ACCESS_CONTROL_ALLOW_HEADERS,
            HeaderValue::from_static("Authorization, Content-Type, Accept, Origin"),
        );
        headers.insert(VARY, HeaderValue::from_static("Origin"));
    }
}
