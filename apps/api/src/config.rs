use std::env;
use std::net::{IpAddr, Ipv6Addr};

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
    pub app_urls: Vec<String>,
    pub app_url: String,
    pub api_urls: Vec<String>,
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
        let app_urls = read_url_list(&["APP_URL"], "http://localhost:3000");
        let api_urls = read_url_list(&["API_URL"], "http://localhost:8080");
        let mut cors_origins = read_url_list(
            &["CORS_ORIGIN", "CORS_ORIGINS"],
            "http://localhost:3000,http://localhost:5173",
        );
        merge_unique(&mut cors_origins, app_urls.iter().cloned());

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
            cors_origins,
            app_url: pick_primary_url(&app_urls, "http://localhost:3000"),
            app_urls,
            api_url: pick_primary_url(&api_urls, "http://localhost:8080"),
            api_urls,
            google_client_id: env::var("GOOGLE_CLIENT_ID").unwrap_or_default(),
            google_client_secret: env::var("GOOGLE_CLIENT_SECRET").unwrap_or_default(),
            google_redirect_uri: env::var("GOOGLE_REDIRECT_URI").unwrap_or_default(),
            github_client_id: env::var("GITHUB_CLIENT_ID").unwrap_or_default(),
            github_client_secret: env::var("GITHUB_CLIENT_SECRET").unwrap_or_default(),
            github_redirect_uri: env::var("GITHUB_REDIRECT_URI").unwrap_or_default(),
        }
    }
}

fn read_url_list(keys: &[&str], fallback: &str) -> Vec<String> {
    let raw = keys
        .iter()
        .find_map(|key| env::var(key).ok())
        .unwrap_or_else(|| fallback.to_owned());

    let urls = raw.split(',').filter_map(normalize_origin).collect::<Vec<_>>();
    if urls.is_empty() {
        fallback
            .split(',')
            .filter_map(normalize_origin)
            .collect::<Vec<_>>()
    } else {
        urls
    }
}

fn pick_primary_url(urls: &[String], fallback: &str) -> String {
    urls.iter()
        .min_by_key(|url| primary_url_rank(url))
        .cloned()
        .or_else(|| normalize_origin(fallback))
        .unwrap_or_else(|| fallback.trim().to_owned())
}

fn primary_url_rank(url: &str) -> (u8, u8) {
    let is_https = url.starts_with("https://");
    let is_public = !is_localish_url(url);

    match (is_public, is_https) {
        (true, true) => (0, 0),
        (true, false) => (1, 0),
        (false, true) => (2, 0),
        (false, false) => (3, 0),
    }
}

fn is_localish_url(url: &str) -> bool {
    let Some((_, rest)) = url.split_once("://") else {
        return false;
    };

    let authority = rest.split(['/', '?', '#']).next().unwrap_or_default();
    let host = authority
        .trim()
        .trim_start_matches('[')
        .trim_end_matches(']')
        .split(':')
        .next()
        .unwrap_or_default();

    if host.eq_ignore_ascii_case("localhost") {
        return true;
    }

    match host.parse::<IpAddr>() {
        Ok(IpAddr::V4(ip)) => {
            ip.is_loopback() || ip.is_private() || ip.is_link_local() || ip.is_unspecified()
        }
        Ok(IpAddr::V6(ip)) => {
            ip.is_loopback()
                || ip.is_unspecified()
                || ip.is_unique_local()
                || ip.is_unicast_link_local()
                || ip == Ipv6Addr::LOCALHOST
        }
        Err(_) => false,
    }
}

fn merge_unique(target: &mut Vec<String>, values: impl IntoIterator<Item = String>) {
    for value in values {
        if !target.iter().any(|existing| existing == &value) {
            target.push(value);
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

#[cfg(test)]
mod tests {
    use super::{is_localish_url, normalize_origin, pick_primary_url};

    #[test]
    fn normalize_origin_strips_paths_queries_and_trailing_slashes() {
        assert_eq!(
            normalize_origin("https://example.com/foo/bar/?a=1#x"),
            Some("https://example.com".to_string())
        );
    }

    #[test]
    fn pick_primary_url_prefers_public_https() {
        let urls = vec![
            "http://192.168.1.23:3000".to_string(),
            "http://144.225.147.11:8080".to_string(),
            "https://dcc-web.rury.workers.dev".to_string(),
        ];

        assert_eq!(
            pick_primary_url(&urls, "http://localhost:3000"),
            "https://dcc-web.rury.workers.dev"
        );
    }

    #[test]
    fn localish_detection_marks_private_hosts_as_local() {
        assert!(is_localish_url("http://localhost:3000"));
        assert!(is_localish_url("http://127.0.0.1:8080"));
        assert!(is_localish_url("http://192.168.1.23:3000"));
        assert!(!is_localish_url("https://vbtsoybxichbrqgmwimzzxsgabdco.servgrid.xyz"));
    }
}
