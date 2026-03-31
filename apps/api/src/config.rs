use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub redis_url: String,
    pub jwt_secret: String,
    pub access_token_expiry_minutes: i64,
    pub refresh_token_expiry_days: i64,
    pub cors_origins: Vec<String>,
    pub app_url: String,
    pub api_url: String,
    pub google_client_id: String,
    pub google_client_secret: String,
    pub google_redirect_uri: String,
    pub github_client_id: String,
    pub github_client_secret: String,
    pub github_redirect_uri: String,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".into()),
            port: env::var("PORT")
                .unwrap_or_else(|_| "8080".into())
                .parse()
                .expect("PORT must be a valid number"),
            database_url: env::var("DATABASE_URL").expect("DATABASE_URL is required"),
            redis_url: env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".into()),
            jwt_secret: env::var("JWT_SECRET").expect("JWT_SECRET is required"),
            access_token_expiry_minutes: env::var("ACCESS_TOKEN_EXPIRY_MINUTES")
                .unwrap_or_else(|_| "15".into())
                .parse()
                .unwrap_or(15),
            refresh_token_expiry_days: env::var("REFRESH_TOKEN_EXPIRY_DAYS")
                .unwrap_or_else(|_| "30".into())
                .parse()
                .unwrap_or(30),
            cors_origins: env::var("CORS_ORIGIN")
                .or_else(|_| env::var("CORS_ORIGINS"))
                .unwrap_or_else(|_| "http://localhost:3000,http://localhost:5173".into())
                .split(',')
                .filter_map(normalize_origin)
                .collect(),
            app_url: env::var("APP_URL").unwrap_or_else(|_| "http://localhost:3000".into()),
            api_url: env::var("API_URL").unwrap_or_else(|_| "http://localhost:8080".into()),
            google_client_id: env::var("GOOGLE_CLIENT_ID").unwrap_or_default(),
            google_client_secret: env::var("GOOGLE_CLIENT_SECRET").unwrap_or_default(),
            google_redirect_uri: env::var("GOOGLE_REDIRECT_URI").unwrap_or_default(),
            github_client_id: env::var("GITHUB_CLIENT_ID").unwrap_or_default(),
            github_client_secret: env::var("GITHUB_CLIENT_SECRET").unwrap_or_default(),
            github_redirect_uri: env::var("GITHUB_REDIRECT_URI").unwrap_or_default(),
        }
    }
}

fn normalize_origin(value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }

    let without_trailing_slash = trimmed.trim_end_matches('/');
    let Some((scheme, rest)) = without_trailing_slash.split_once("://") else {
        return Some(without_trailing_slash.to_owned());
    };

    let authority = rest
        .split(['/', '?', '#'])
        .next()
        .unwrap_or_default()
        .trim_end_matches('/');

    if authority.is_empty() {
        None
    } else {
        Some(format!("{scheme}://{authority}"))
    }
}
