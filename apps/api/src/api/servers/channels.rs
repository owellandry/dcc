use super::*;
use crate::api::servers::common::ensure_member;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateChannelBody {
    pub name: String,
    #[serde(rename = "type")]
    pub channel_type: Option<String>,
    pub category_id: Option<Uuid>,
}

pub async fn create_channel(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(server_id): Path<Uuid>,
    Json(body): Json<CreateChannelBody>,
) -> Result<Json<Value>> {
    ensure_member(&state, user_id, server_id).await?;

    let name = body.name.trim().to_lowercase().replace(' ', "-");
    if name.is_empty() || name.len() > 100 {
        return Err(AppError::validation("name", "Name must be 1–100 characters"));
    }
    let channel_type = body.channel_type.unwrap_or_else(|| "text".to_string());

    let position: i32 = sqlx::query_scalar!(
        "SELECT COALESCE(MAX(position) + 1, 0) FROM channels WHERE server_id = $1",
        server_id
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    let c = sqlx::query!(
        r#"INSERT INTO channels (id, server_id, category_id, name, channel_type, position)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, server_id, category_id, name, topic, channel_type,
                     position, is_nsfw, slowmode_seconds, last_message_id, created_at"#,
        Uuid::new_v4(),
        server_id,
        body.category_id,
        name,
        channel_type,
        position,
    )
    .fetch_one(&state.db)
    .await?;

    Ok(Json(json!({
        "data": {
            "id": c.id,
            "serverId": c.server_id,
            "categoryId": c.category_id,
            "name": c.name,
            "topic": c.topic,
            "type": c.channel_type,
            "position": c.position,
            "isNsfw": c.is_nsfw,
            "slowmodeSeconds": c.slowmode_seconds,
            "lastMessageId": c.last_message_id,
            "createdAt": c.created_at,
        }
    })))
}
