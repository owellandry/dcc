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

use axum::{http::HeaderValue, routing::get, Router};
use tower_http::{
    cors::{AllowOrigin, CorsLayer},
    timeout::TimeoutLayer,
    trace::TraceLayer,
};
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

use config::Config;
use state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Keep runtime-relative files anchored to the API crate even when launched from the workspace root.
    std::env::set_current_dir(env!("CARGO_MANIFEST_DIR"))?;

    // Load .env
    dotenvy::dotenv().ok();

    // Tracing
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "dcc_api=debug,tower_http=debug".into()))
        .with(fmt::layer())
        .init();

    let config = Config::from_env();

    // Database pool
    let db = sqlx::postgres::PgPoolOptions::new()
        .max_connections(20)
        .acquire_timeout(Duration::from_secs(10))
        .connect(&config.database_url)
        .await?;

    tracing::info!("Connected to PostgreSQL");

    // Run migrations
    sqlx::migrate!("./migrations").run(&db).await?;
    tracing::info!("Migrations applied");

    // Redis connection manager
    let redis_client = redis::Client::open(config.redis_url.as_str())?;
    let redis = redis::aio::ConnectionManager::new(redis_client).await?;
    tracing::info!("Connected to Redis");

    let state = AppState::new(db, redis, config.clone());
    let allowed_origins = config
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
        .layer(TraceLayer::new_for_http())
        .layer(TimeoutLayer::new(Duration::from_secs(30)))
        .with_state(state);

    let addr: SocketAddr = format!("{}:{}", config.host, config.port).parse()?;
    tracing::info!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
