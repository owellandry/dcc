use std::sync::Arc;
use sqlx::PgPool;
use redis::aio::ConnectionManager;
use redis::Client;
use crate::config::Config;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub redis_client: Client,
    pub redis: ConnectionManager,
    pub config: Arc<Config>,
}

impl AppState {
    pub fn new(db: PgPool, redis_client: Client, redis: ConnectionManager, config: Config) -> Self {
        Self {
            db,
            redis_client,
            redis,
            config: Arc::new(config),
        }
    }
}
