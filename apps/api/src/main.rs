mod api;
mod config;
mod error;
mod gateway;
mod middleware;
mod models;
mod services;
mod state;

use std::net::SocketAddr;
use std::time::Duration;

use axum::{
    extract::State,
    http::HeaderValue,
    middleware as axum_middleware,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use serde_json::json;
use tower_http::{
    compression::CompressionLayer,
    cors::{AllowOrigin, CorsLayer},
    timeout::TimeoutLayer,
    trace::TraceLayer,
};
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

use config::Config;
use middleware::ratelimit::rate_limit_middleware as rate_limit;
use middleware::request_id::request_id_middleware;
use state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Keep runtime-relative files anchored to the API crate even when launched from the workspace root.
    std::env::set_current_dir(env!("CARGO_MANIFEST_DIR"))?;

    // Load .env
    dotenvy::dotenv().ok();

    // Tracing
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| "dcc_api=debug,tower_http=debug".into());

    tracing_subscriber::registry()
        .with(filter)
        .with(
            fmt::layer()
                .with_target(false)
                .with_thread_ids(false)
                .with_thread_names(false)
        )
        .init();

    let config = Config::from_env();

    // Database pool
    let max_connections: u32 = std::env::var("DB_MAX_CONNECTIONS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(20);
    let db = sqlx::postgres::PgPoolOptions::new()
        .max_connections(max_connections)
        .idle_timeout(Duration::from_secs(30)) // Close idle connections after 30s
        .acquire_timeout(Duration::from_secs(10))
        .connect(&config.database_url)
        .await?;

    tracing::info!("Connected to PostgreSQL");

    // Run migrations
    sqlx::migrate!("./migrations").run(&db).await?;
    tracing::info!("Migrations applied");

    // Redis connection manager
    let redis_client = redis::Client::open(config.redis_url.as_str())?;
    let redis = redis::aio::ConnectionManager::new(redis_client.clone()).await?;
    tracing::info!("Connected to Redis");

    let state = AppState::new(db, redis_client, redis, config.clone());
    let allowed_origins: Vec<HeaderValue> = config
        .cors_origins
        .iter()
        .filter_map(|origin| origin.parse::<HeaderValue>().ok())
        .collect::<Vec<_>>();

    // CORS — credentials requires explicit origin + headers (no wildcard)
    let cors = CorsLayer::new()
        .allow_origin(match allowed_origins.as_slice() {
            [] => AllowOrigin::exact(HeaderValue::from_static("http://localhost:3000")),
            [origin] => AllowOrigin::exact(origin.clone()),
            _ => AllowOrigin::list(allowed_origins),
        })
        .allow_methods([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::PATCH,
            axum::http::Method::DELETE,
            axum::http::Method::OPTIONS,
        ])
        .allow_headers([
            axum::http::header::AUTHORIZATION,
            axum::http::header::CONTENT_TYPE,
            axum::http::header::ACCEPT,
            axum::http::header::COOKIE,
        ])
        .allow_credentials(true);

    let app = Router::new()
        // Health checks
        .route("/health", get(health_check))
        .route("/ready", get(readiness_check))
        .route("/live", get(liveness_check))
        // API routes under /v1
        .nest("/v1", api::router())
        // WebSocket gateway
        .route("/ws", get(gateway::ws_handler))
        // Static uploads (for local avatar storage)
        .nest_service(
            "/uploads",
            tower_http::services::ServeDir::new("uploads"),
        )
        .layer(cors)
        .layer(axum_middleware::from_fn_with_state(
            state.clone(),
            |State(state): State<AppState>, req, next| async move { rate_limit(&state, req, next).await },
        ))
        .layer(axum_middleware::from_fn(request_id_middleware))
        .layer(CompressionLayer::new())
        .layer(TraceLayer::new_for_http())
        .layer(TimeoutLayer::new(Duration::from_secs(30)))
        .with_state(state);

    let addr: SocketAddr = format!("{}:{}", config.host, config.port).parse()?;
    tracing::info!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

// ── Health Checks ─────────────────────────────────────────────────────────────

/// liveness: /live returns 200 if process is alive
async fn liveness_check() -> impl IntoResponse {
    "alive"
}

/// readiness: /ready checks if DB is ready to accept connections
async fn readiness_check(State(state): State<AppState>) -> impl IntoResponse {
    match sqlx::query("SELECT 1").fetch_optional(&state.db).await {
        Ok(_) => (axum::http::StatusCode::OK, "ready").into_response(),
        Err(_) => (axum::http::StatusCode::SERVICE_UNAVAILABLE, "not ready").into_response(),
    }
}

/// health: /health checks DB and Redis connectivity
async fn health_check(State(state): State<AppState>) -> impl IntoResponse {
    let db_ok = sqlx::query("SELECT 1").fetch_optional(&state.db).await.is_ok();
    let mut redis = state.redis.clone();
    let redis_ok = redis::cmd("PING")
        .query_async::<_, String>(&mut redis)
        .await
        .is_ok();

    let status = if db_ok && redis_ok {
        axum::http::StatusCode::OK
    } else {
        axum::http::StatusCode::SERVICE_UNAVAILABLE
    };

    let body = json!({
        "status": if db_ok && redis_ok { "ok" } else { "error" },
        "database": if db_ok { "up" } else { "down" },
        "redis": if redis_ok { "up" } else { "down" },
    });

    (status, Json(body)).into_response()
}
