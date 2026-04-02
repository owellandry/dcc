use super::*;
use crate::api::servers::common::{
    ensure_server_permission, resolve_channel_permissions, MANAGE_CHANNELS_PERMISSION,
    SEND_MESSAGES_PERMISSION,
};
use crate::models::channel::{is_valid_channel_font_key, is_valid_channel_font_weight};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateChannelBody {
    pub name: String,
    #[serde(rename = "type")]
    pub channel_type: Option<String>,
    pub category_id: Option<Uuid>,
    pub topic: Option<String>,
    pub icon_key: Option<String>,
    pub font_key: Option<String>,
    pub font_weight: Option<i32>,
    pub is_nsfw: Option<bool>,
    pub slowmode_seconds: Option<i32>,
}

pub async fn create_channel(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(server_id): Path<Uuid>,
    Json(body): Json<CreateChannelBody>,
) -> Result<Json<Value>> {
    let context = ensure_server_permission(
        &state,
        user_id,
        server_id,
        MANAGE_CHANNELS_PERMISSION,
        "You do not have permission to create channels in this server",
    )
    .await?;

    let name = body.name.trim().to_lowercase().replace(' ', "-");
    if name.is_empty() || name.len() > 100 {
        return Err(AppError::validation(
            "name",
            "Name must be 1-100 characters",
        ));
    }

    let channel_type = body.channel_type.unwrap_or_else(|| "text".to_string());
    if !matches!(channel_type.as_str(), "text" | "voice" | "announcement") {
        return Err(AppError::validation("type", "Invalid channel type"));
    }

    if let Some(category_id) = body.category_id {
        let category_server_id =
            sqlx::query_scalar::<_, Uuid>("SELECT server_id FROM categories WHERE id = $1")
                .bind(category_id)
                .fetch_optional(&state.db)
                .await?
                .ok_or_else(|| AppError::NotFound("Category not found".into()))?;

        if category_server_id != server_id {
            return Err(AppError::BadRequest(
                "Category does not belong to this server".into(),
            ));
        }
    }

    if let Some(font_key) = body.font_key.as_deref() {
        if !is_valid_channel_font_key(font_key) {
            return Err(AppError::validation(
                "fontKey",
                "Unsupported channel font",
            ));
        }
    }

    if let Some(font_weight) = body.font_weight {
        if !is_valid_channel_font_weight(font_weight) {
            return Err(AppError::validation(
                "fontWeight",
                "Unsupported channel font weight",
            ));
        }
    }

    let position: i32 = sqlx::query_scalar(
        r#"SELECT COALESCE(MAX(position) + 1, 0)
           FROM channels
           WHERE server_id = $1
             AND (($2::uuid IS NULL AND category_id IS NULL) OR category_id = $2)"#,
    )
    .bind(server_id)
    .bind(body.category_id)
    .fetch_one(&state.db)
    .await?;

    #[derive(sqlx::FromRow)]
    struct ChannelRow {
        id: Uuid,
        server_id: Uuid,
        category_id: Option<Uuid>,
        name: String,
        topic: Option<String>,
        icon_key: Option<String>,
        font_key: Option<String>,
        font_weight: Option<i32>,
        channel_type: String,
        position: i32,
        is_nsfw: bool,
        slowmode_seconds: i32,
        last_message_id: Option<Uuid>,
        created_at: chrono::DateTime<chrono::Utc>,
    }

    let c = sqlx::query_as::<_, ChannelRow>(
        r#"INSERT INTO channels (
                id, server_id, category_id, name, topic, icon_key, font_key, font_weight, channel_type, position, is_nsfw, slowmode_seconds
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, FALSE), COALESCE($12, 0))
           RETURNING id, server_id, category_id, name, topic, icon_key, font_key, font_weight, channel_type,
                     position, is_nsfw, slowmode_seconds, last_message_id, created_at"#,
    )
    .bind(Uuid::new_v4())
    .bind(server_id)
    .bind(body.category_id)
    .bind(name)
    .bind(body.topic)
    .bind(body.icon_key)
    .bind(body.font_key)
    .bind(body.font_weight)
    .bind(channel_type)
    .bind(position)
    .bind(body.is_nsfw)
    .bind(body.slowmode_seconds)
    .fetch_one(&state.db)
    .await?;

    let permissions = resolve_channel_permissions(&state, &context, c.category_id, c.id).await?;

    Ok(Json(json!({
        "data": {
            "id": c.id,
            "serverId": c.server_id,
            "categoryId": c.category_id,
            "name": c.name,
            "topic": c.topic,
            "iconKey": c.icon_key,
            "fontKey": c.font_key,
            "fontWeight": c.font_weight,
            "type": c.channel_type,
            "position": c.position,
            "isNsfw": c.is_nsfw,
            "slowmodeSeconds": c.slowmode_seconds,
            "lastMessageId": c.last_message_id,
            "createdAt": c.created_at,
            "canSendMessages": (permissions & SEND_MESSAGES_PERMISSION) == SEND_MESSAGES_PERMISSION,
            "overwrites": [],
        }
    })))
}
