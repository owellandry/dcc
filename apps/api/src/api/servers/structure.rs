use super::*;
use crate::api::servers::common::{ensure_server_permission, MANAGE_CHANNELS_PERMISSION};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReorderStructureBody {
    pub categories: Option<Vec<ReorderCategoryItem>>,
    pub channels: Option<Vec<ReorderChannelItem>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReorderCategoryItem {
    pub id: Uuid,
    pub position: i32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReorderChannelItem {
    pub id: Uuid,
    pub position: i32,
    pub category_id: Option<Uuid>,
}

pub async fn reorder_structure(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(server_id): Path<Uuid>,
    Json(body): Json<ReorderStructureBody>,
) -> Result<Json<Value>> {
    ensure_server_permission(
        &state,
        user_id,
        server_id,
        MANAGE_CHANNELS_PERMISSION,
        "You do not have permission to reorder channels in this server",
    )
    .await?;

    let mut tx = state.db.begin().await?;

    if let Some(categories) = body.categories {
        for category in categories {
            let belongs_to_server = sqlx::query_scalar!(
                "SELECT EXISTS(SELECT 1 FROM categories WHERE id = $1 AND server_id = $2)",
                category.id,
                server_id
            )
            .fetch_one(&mut *tx)
            .await?
            .unwrap_or(false);

            if !belongs_to_server {
                return Err(AppError::BadRequest(
                    "Category does not belong to this server".into(),
                ));
            }

            sqlx::query!(
                "UPDATE categories SET position = $2 WHERE id = $1",
                category.id,
                category.position
            )
            .execute(&mut *tx)
            .await?;
        }
    }

    if let Some(channels) = body.channels {
        for channel in channels {
            if let Some(category_id) = channel.category_id {
                let category_server_id = sqlx::query_scalar!(
                    "SELECT server_id FROM categories WHERE id = $1",
                    category_id
                )
                .fetch_optional(&mut *tx)
                .await?
                .ok_or_else(|| AppError::BadRequest("Category does not exist".into()))?;

                if category_server_id != server_id {
                    return Err(AppError::BadRequest(
                        "Category does not belong to this server".into(),
                    ));
                }
            }

            let belongs_to_server = sqlx::query_scalar!(
                "SELECT EXISTS(SELECT 1 FROM channels WHERE id = $1 AND server_id = $2)",
                channel.id,
                server_id
            )
            .fetch_one(&mut *tx)
            .await?
            .unwrap_or(false);

            if !belongs_to_server {
                return Err(AppError::BadRequest(
                    "Channel does not belong to this server".into(),
                ));
            }

            sqlx::query!(
                "UPDATE channels SET position = $2, category_id = $3 WHERE id = $1",
                channel.id,
                channel.position,
                channel.category_id,
            )
            .execute(&mut *tx)
            .await?;
        }
    }

    tx.commit().await?;

    Ok(Json(json!({ "data": null })))
}
