//! Search API endpoints
//! Supports full-text search across users and servers

use axum::{
    extract::{Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::FromRow;
use uuid::Uuid;

use crate::{error::Result, state::AppState};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchQuery {
    /// Search query text (required)
    pub q: Option<String>,
    /// Type filter: "all", "users", "servers"
    #[serde(default = "default_search_type")]
    pub type_: String,
    /// Pagination limit (max 100)
    #[serde(default)]
    pub limit: Option<i64>,
    /// Pagination offset
    #[serde(default)]
    pub offset: Option<i64>,
}

fn default_search_type() -> String {
    "all".to_string()
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    /// Result type: "user" or "server"
    pub r#type: String,
    /// Relevance score (0-1)
    pub relevance: f64,
    /// User data (when type = "user")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user: Option<UserSearchResult>,
    /// Server data (when type = "server")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub server: Option<ServerSearchResult>,
}

#[derive(Serialize, FromRow)]
pub struct UserSearchRow {
    pub id: Uuid,
    pub username: String,
    pub discriminator: String,
    pub avatar_url: Option<String>,
    pub avatar_decoration_url: Option<String>,
    pub banner_url: Option<String>,
    pub bio: Option<String>,
    pub status: String,
    pub custom_status: Option<String>,
    pub is_verified: bool,
    pub badges: Vec<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub relevance: f64,
}

#[derive(Serialize)]
pub struct UserSearchResult {
    pub id: Uuid,
    pub username: String,
    pub discriminator: String,
    pub avatar_url: Option<String>,
    pub avatar_decoration_url: Option<String>,
    pub banner_url: Option<String>,
    pub bio: Option<String>,
    pub status: String,
    pub custom_status: Option<String>,
    pub is_verified: bool,
    pub badges: Vec<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub relevance: f64,
}

#[derive(Serialize, FromRow)]
pub struct ServerSearchRow {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub icon_url: Option<String>,
    pub banner_url: Option<String>,
    pub owner_id: Uuid,
    pub invite_code: String,
    pub is_public: bool,
    pub member_count: i32,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub relevance: f64,
}

#[derive(Serialize)]
pub struct ServerSearchResult {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub icon_url: Option<String>,
    pub banner_url: Option<String>,
    pub owner_id: Uuid,
    pub invite_code: String,
    pub is_public: bool,
    pub member_count: i32,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub relevance: f64,
}

pub async fn search(
    Query(query): Query<SearchQuery>,
    State(state): State<AppState>,
) -> Result<Json<Value>> {
    let search_text = match query.q {
        Some(text) if !text.trim().is_empty() => text.trim().to_string(),
        _ => {
            return Ok(Json(json!({
                "data": [],
                "meta": {
                    "total": 0,
                    "hasMore": false,
                }
            })));
        }
    };

    let limit = query.limit.unwrap_or(20).min(100).max(1) as i64;
    let offset = query.offset.unwrap_or(0).max(0) as i64;

    let type_filter = query.type_.to_lowercase();
    let mut results = Vec::new();

    // Search users if requested
    if type_filter == "all" || type_filter == "users" {
        let user_rows =
            sqlx::query_as::<_, UserSearchRow>("SELECT * FROM search_users($1, $2, $3)")
                .bind(&search_text)
                .bind(limit as i32)
                .bind(offset as i32)
                .fetch_all(&state.db)
                .await?;

        for row in user_rows {
            results.push(SearchResult {
                r#type: "user".to_string(),
                relevance: row.relevance,
                user: Some(UserSearchResult {
                    id: row.id,
                    username: row.username,
                    discriminator: row.discriminator,
                    avatar_url: row.avatar_url,
                    avatar_decoration_url: row.avatar_decoration_url,
                    banner_url: row.banner_url,
                    bio: row.bio,
                    status: row.status,
                    custom_status: row.custom_status,
                    is_verified: row.is_verified,
                    badges: row.badges,
                    created_at: row.created_at,
                    relevance: row.relevance,
                }),
                server: None,
            });
        }
    }

    // Search servers if requested
    if type_filter == "all" || type_filter == "servers" {
        let server_rows =
            sqlx::query_as::<_, ServerSearchRow>("SELECT * FROM search_servers($1, $2, $3)")
                .bind(&search_text)
                .bind(limit as i32)
                .bind(offset as i32)
                .fetch_all(&state.db)
                .await?;

        for row in server_rows {
            results.push(SearchResult {
                r#type: "server".to_string(),
                relevance: row.relevance,
                user: None,
                server: Some(ServerSearchResult {
                    id: row.id,
                    name: row.name,
                    description: row.description,
                    icon_url: row.icon_url,
                    banner_url: row.banner_url,
                    owner_id: row.owner_id,
                    invite_code: row.invite_code,
                    is_public: row.is_public,
                    member_count: row.member_count,
                    created_at: row.created_at,
                    relevance: row.relevance,
                }),
            });
        }
    }

    // Sort by relevance descending, then by type (users before servers if equal relevance)
    results.sort_by(|a, b| {
        b.relevance
            .partial_cmp(&a.relevance)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    // Apply limit/offset to combined results
    let start = offset as usize;
    let end = start + limit as usize;
    let paginated_results = if start < results.len() {
        &results[start..std::cmp::min(end, results.len())]
    } else {
        &[]
    };

    Ok(Json(json!({
        "data": paginated_results,
        "meta": {
            "total": results.len(),
            "hasMore": end < results.len(),
            "limit": limit,
            "offset": offset,
        }
    })))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_search_query_defaults() {
        let query = SearchQuery {
            q: Some("test".to_string()),
            type_: "all".to_string(),
            limit: None,
            offset: None,
        };
        assert_eq!(query.limit, None);
        assert_eq!(query.offset, None);
    }
}
