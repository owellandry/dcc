use super::*;
use crate::api::servers::common::{
    ensure_server_permission, load_scope_overwrites, overwrite_payload, MANAGE_CHANNELS_PERMISSION,
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCategoryBody {
    pub name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCategoryBody {
    pub name: Option<String>,
    pub position: Option<i32>,
}

pub async fn create_category(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(server_id): Path<Uuid>,
    Json(body): Json<CreateCategoryBody>,
) -> Result<Json<Value>> {
    ensure_server_permission(
        &state,
        user_id,
        server_id,
        MANAGE_CHANNELS_PERMISSION,
        "You do not have permission to create categories in this server",
    )
    .await?;

    let name = body.name.trim().to_string();
    if name.is_empty() || name.len() > 100 {
        return Err(AppError::validation(
            "name",
            "Name must be 1-100 characters",
        ));
    }

    let position = sqlx::query_scalar!(
        "SELECT COALESCE(MAX(position) + 1, 0) FROM categories WHERE server_id = $1",
        server_id
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    let category = sqlx::query!(
        r#"INSERT INTO categories (id, server_id, name, position)
           VALUES ($1, $2, $3, $4)
           RETURNING id, server_id, name, position"#,
        Uuid::new_v4(),
        server_id,
        name,
        position,
    )
    .fetch_one(&state.db)
    .await?;

    Ok(Json(json!({
        "data": {
            "id": category.id,
            "serverId": category.server_id,
            "name": category.name,
            "position": category.position,
            "overwrites": [],
        }
    })))
}

pub async fn update_category(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(category_id): Path<Uuid>,
    Json(body): Json<UpdateCategoryBody>,
) -> Result<Json<Value>> {
    let server_id = sqlx::query_scalar!(
        "SELECT server_id FROM categories WHERE id = $1",
        category_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Category not found".into()))?;

    ensure_server_permission(
        &state,
        user_id,
        server_id,
        MANAGE_CHANNELS_PERMISSION,
        "You do not have permission to update categories in this server",
    )
    .await?;

    let category = sqlx::query!(
        r#"UPDATE categories
           SET name = COALESCE($2, name),
               position = COALESCE($3, position)
           WHERE id = $1
           RETURNING id, server_id, name, position"#,
        category_id,
        body.name,
        body.position,
    )
    .fetch_one(&state.db)
    .await?;

    let overwrites = load_scope_overwrites(&state, Some(category_id), None).await?;

    Ok(Json(json!({
        "data": {
            "id": category.id,
            "serverId": category.server_id,
            "name": category.name,
            "position": category.position,
            "overwrites": overwrites.iter().map(overwrite_payload).collect::<Vec<_>>(),
        }
    })))
}

pub async fn delete_category(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(category_id): Path<Uuid>,
) -> Result<Json<Value>> {
    let server_id = sqlx::query_scalar!(
        "SELECT server_id FROM categories WHERE id = $1",
        category_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Category not found".into()))?;

    ensure_server_permission(
        &state,
        user_id,
        server_id,
        MANAGE_CHANNELS_PERMISSION,
        "You do not have permission to delete categories in this server",
    )
    .await?;

    sqlx::query!("DELETE FROM categories WHERE id = $1", category_id)
        .execute(&state.db)
        .await?;

    Ok(Json(json!({ "data": null })))
}
