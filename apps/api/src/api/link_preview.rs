use std::time::Duration;

use axum::{
    extract::{Query, State},
    Json,
};
use regex::Regex;
use serde::Deserialize;
use serde_json::{json, Value};

use crate::{
    error::{AppError, Result},
    middleware::AuthUser,
    state::AppState,
};

#[derive(Deserialize)]
pub struct LinkPreviewQuery {
    pub url: String,
}

pub async fn get_link_preview(
    AuthUser(_user_id): AuthUser,
    State(_state): State<AppState>,
    Query(query): Query<LinkPreviewQuery>,
) -> Result<Json<Value>> {
    let raw_url = query.url.trim();
    if raw_url.is_empty() {
        return Err(AppError::BadRequest("URL requerida".into()));
    }
    if raw_url.len() > 2048 {
        return Err(AppError::BadRequest("URL demasiado larga".into()));
    }

    let parsed_url = reqwest::Url::parse(raw_url).map_err(|_| AppError::BadRequest("URL inválida".into()))?;
    if parsed_url.scheme() != "http" && parsed_url.scheme() != "https" {
        return Err(AppError::BadRequest("Solo se permiten URLs http/https".into()));
    }
    if parsed_url.host_str().is_none() {
        return Err(AppError::BadRequest("La URL debe incluir un dominio válido".into()));
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(7))
        .redirect(reqwest::redirect::Policy::limited(5))
        .build()
        .map_err(|e| AppError::Internal(e.into()))?;

    let response = client
        .get(parsed_url.clone())
        .header(
            reqwest::header::USER_AGENT,
            "Mozilla/5.0 (compatible; DCC-LinkPreview/1.0; +https://cordlang.com)",
        )
        .send()
        .await
        .map_err(|_| AppError::BadRequest("No se pudo consultar la URL".into()))?;

    if !response.status().is_success() {
        return Err(AppError::BadRequest("La URL respondió con error".into()));
    }

    let final_url = response.url().to_string();
    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("")
        .to_lowercase();

    if !content_type.contains("text/html") {
        return Err(AppError::BadRequest("La URL no contiene HTML para previsualizar".into()));
    }

    let html = response
        .text()
        .await
        .map_err(|_| AppError::BadRequest("No se pudo leer el contenido del enlace".into()))?;

    let title = extract_meta(&html, "og:title")
        .or_else(|| extract_meta(&html, "twitter:title"))
        .or_else(|| extract_title_tag(&html));
    let description = extract_meta(&html, "og:description")
        .or_else(|| extract_meta(&html, "twitter:description"))
        .or_else(|| extract_meta(&html, "description"));
    let image = extract_meta(&html, "og:image")
        .or_else(|| extract_meta(&html, "twitter:image"))
        .and_then(|value| absolutize_url(&final_url, &value));
    let hostname = reqwest::Url::parse(&final_url)
        .ok()
        .and_then(|url| url.host_str().map(|host| host.to_string()));
    let site_name = extract_meta(&html, "og:site_name").or_else(|| hostname.clone());

    Ok(Json(json!({
        "data": {
            "url": final_url,
            "title": title,
            "description": description,
            "image": image,
            "siteName": site_name,
            "hostname": hostname
        }
    })))
}

fn extract_meta(html: &str, key: &str) -> Option<String> {
    let escaped_key = regex::escape(key);
    let pattern_property_content = format!(
        r#"(?is)<meta[^>]+(?:property|name)\s*=\s*["']{}["'][^>]*content\s*=\s*["']([^"']+)["'][^>]*>"#,
        escaped_key
    );
    if let Some(value) = extract_with_pattern(html, &pattern_property_content) {
        return Some(value);
    }

    let pattern_content_property = format!(
        r#"(?is)<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]*(?:property|name)\s*=\s*["']{}["'][^>]*>"#,
        escaped_key
    );
    extract_with_pattern(html, &pattern_content_property)
}

fn extract_title_tag(html: &str) -> Option<String> {
    extract_with_pattern(html, r#"(?is)<title[^>]*>(.*?)</title>"#)
}

fn extract_with_pattern(html: &str, pattern: &str) -> Option<String> {
    let regex = Regex::new(pattern).ok()?;
    let captures = regex.captures(html)?;
    let value = captures.get(1)?.as_str();
    let normalized = value
        .replace('\n', " ")
        .replace('\r', " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    if normalized.is_empty() {
        None
    } else {
        Some(normalized.chars().take(300).collect())
    }
}

fn absolutize_url(base_url: &str, value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }
    if let Ok(url) = reqwest::Url::parse(trimmed) {
        if url.scheme() == "http" || url.scheme() == "https" {
            return Some(url.to_string());
        }
        return None;
    }
    let base = reqwest::Url::parse(base_url).ok()?;
    let joined = base.join(trimmed).ok()?;
    if joined.scheme() == "http" || joined.scheme() == "https" {
        Some(joined.to_string())
    } else {
        None
    }
}
