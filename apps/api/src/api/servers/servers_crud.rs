use super::*;
use crate::api::servers::common::{
    apply_overwrites, ensure_owner, ensure_owner_or_manage_server, load_all_overwrites_for_server,
    load_server_permissions_context, load_server_roles, overwrite_payload, role_payload,
    DEFAULT_EVERYONE_PERMISSIONS, SEND_MESSAGES_PERMISSION, VIEW_CHANNEL_PERMISSION,
};
use crate::services::cache;

#[derive(Deserialize)]
pub struct CreateServerBody {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateServerBody {
    pub name: Option<String>,
    pub description: Option<String>,
    pub is_public: Option<bool>,
    pub icon_url: Option<String>,
    pub banner_url: Option<String>,
    pub invite_code: Option<String>,
}

#[derive(Debug, sqlx::FromRow)]
struct ServerCategoryRow {
    id: Uuid,
    server_id: Uuid,
    name: String,
    position: i32,
}

#[derive(Debug, sqlx::FromRow)]
struct ServerChannelRow {
    id: Uuid,
    server_id: Option<Uuid>,
    category_id: Option<Uuid>,
    name: Option<String>,
    topic: Option<String>,
    icon_key: Option<String>,
    channel_type: String,
    position: i32,
    is_nsfw: bool,
    slowmode_seconds: i32,
    last_message_id: Option<Uuid>,
    created_at: chrono::DateTime<Utc>,
}

pub async fn list_my_servers(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
) -> Result<Json<Value>> {
    let servers = sqlx::query_as::<_, crate::models::server::Server>(
        r#"SELECT s.id, s.name, s.description, s.icon_url, s.banner_url,
                  s.owner_id, s.invite_code, s.is_public, s.member_count, s.created_at
           FROM servers s
           JOIN server_members sm ON sm.server_id = s.id
           WHERE sm.user_id = $1
           ORDER BY sm.joined_at ASC"#,
    )
    .bind(user_id)
    .fetch_all(&state.db)
    .await?;

    let data: Vec<Value> = servers
        .into_iter()
        .map(|s| {
            json!({
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "iconUrl": s.icon_url,
                "bannerUrl": s.banner_url,
                "ownerId": s.owner_id,
                "inviteCode": s.invite_code,
                "isPublic": s.is_public,
                "memberCount": s.member_count,
                "createdAt": s.created_at,
            })
        })
        .collect();

    Ok(Json(json!({ "data": data })))
}

pub async fn get_server(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(server_id): Path<Uuid>,
) -> Result<Json<Value>> {
    let context = load_server_permissions_context(&state, user_id, server_id).await?;

    // Try cache first, or fetch and cache
    let mut redis = state.redis.clone();
    let s = cache::get_or_fetch_server(&mut redis, server_id, async {
        let server = sqlx::query_as::<_, crate::models::server::Server>(
            r#"SELECT id, name, description, icon_url, banner_url,
                      owner_id, invite_code, is_public, member_count, created_at
               FROM servers WHERE id = $1"#,
        )
        .bind(server_id)
        .fetch_optional(&state.db)
        .await?;
        Ok(server)
    })
    .await?
    .ok_or_else(|| AppError::NotFound("Server not found".into()))?;

    let categories = sqlx::query_as::<_, ServerCategoryRow>(
        r#"SELECT id, server_id, name, position
           FROM categories
           WHERE server_id = $1
           ORDER BY position ASC, created_at ASC"#,
    )
    .bind(server_id)
    .fetch_all(&state.db)
    .await?;

    let channels = sqlx::query_as::<_, ServerChannelRow>(
        r#"SELECT id, server_id, category_id, name, topic, icon_key, channel_type, position,
                  is_nsfw, slowmode_seconds, last_message_id, created_at
           FROM channels
           WHERE server_id = $1
           ORDER BY category_id NULLS FIRST, position ASC, created_at ASC"#,
    )
    .bind(server_id)
    .fetch_all(&state.db)
    .await?;

    let roles = load_server_roles(&state, server_id).await?;
    let roles_payload: Vec<Value> = roles.iter().map(role_payload).collect();

    // Cargar todos los permission overwrites del servidor en una sola query (elimina N+1)
    let overwrites_batch = load_all_overwrites_for_server(&state, server_id).await?;

    let mut visible_category_ids = std::collections::HashSet::new();
    let mut channel_payloads = Vec::new();
    for channel in channels {
        // Calcular permisos efectivos usando el batch (sin queries)
        let mut permissions = context.base_permissions;
        if let Some(category_id) = channel.category_id {
            if let Some(overwrites) = overwrites_batch.by_category.get(&category_id) {
                permissions = apply_overwrites(permissions, &context, overwrites);
            }
        }
        if let Some(overwrites) = overwrites_batch.by_channel.get(&channel.id) {
            permissions = apply_overwrites(permissions, &context, overwrites);
        }

        if (permissions & VIEW_CHANNEL_PERMISSION) != VIEW_CHANNEL_PERMISSION {
            continue;
        }

        if let Some(category_id) = channel.category_id {
            visible_category_ids.insert(category_id);
        }

        let channel_overwrites = overwrites_batch
            .by_channel
            .get(&channel.id)
            .cloned()
            .unwrap_or_default();
        channel_payloads.push(json!({
            "id": channel.id,
            "serverId": channel.server_id,
            "categoryId": channel.category_id,
            "name": channel.name,
            "topic": channel.topic,
            "iconKey": channel.icon_key,
            "type": channel.channel_type,
            "position": channel.position,
            "isNsfw": channel.is_nsfw,
            "slowmodeSeconds": channel.slowmode_seconds,
            "lastMessageId": channel.last_message_id,
            "createdAt": channel.created_at,
            "canSendMessages": (permissions & SEND_MESSAGES_PERMISSION) == SEND_MESSAGES_PERMISSION,
            "overwrites": channel_overwrites.iter().map(overwrite_payload).collect::<Vec<_>>(),
        }));
    }

    let mut category_payloads = Vec::new();
    for category in categories {
        let has_uncategorized_visibility = channel_payloads.iter().any(|channel| {
            channel
                .get("categoryId")
                .and_then(Value::as_str)
                .and_then(|raw| Uuid::parse_str(raw).ok())
                == Some(category.id)
        });
        if !visible_category_ids.contains(&category.id) && !has_uncategorized_visibility {
            continue;
        }

        let category_overwrites = overwrites_batch
            .by_category
            .get(&category.id)
            .cloned()
            .unwrap_or_default();
        category_payloads.push(json!({
            "id": category.id,
            "serverId": category.server_id,
            "name": category.name,
            "position": category.position,
            "overwrites": category_overwrites.iter().map(overwrite_payload).collect::<Vec<_>>(),
        }));
    }

    Ok(Json(json!({
        "data": {
            "server": {
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "iconUrl": s.icon_url,
                "bannerUrl": s.banner_url,
                "ownerId": s.owner_id,
                "inviteCode": s.invite_code,
                "isPublic": s.is_public,
                "memberCount": s.member_count,
                "createdAt": s.created_at,
            },
            "categories": category_payloads,
            "channels": channel_payloads,
            "roles": roles_payload,
        }
    })))
}

pub async fn create_server(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Json(body): Json<CreateServerBody>,
) -> Result<Json<Value>> {
    let name = body.name.trim().to_string();
    if name.is_empty() || name.len() > 100 {
        return Err(AppError::validation(
            "name",
            "Name must be 1-100 characters",
        ));
    }

    let invite_code = generate_invite_code();
    let server_id = Uuid::new_v4();
    let everyone_role_id = Uuid::new_v4();
    let cat_info_id = Uuid::new_v4();
    let cat_gen_id = Uuid::new_v4();
    let ch_reglas_id = Uuid::new_v4();
    let ch_bienvenida_id = Uuid::new_v4();
    let ch_general_id = Uuid::new_v4();
    let ch_voz_id = Uuid::new_v4();

    let mut tx = state.db.begin().await?;

    sqlx::query(
        r#"INSERT INTO servers (id, name, description, owner_id, invite_code)
           VALUES ($1, $2, $3, $4, $5)"#,
    )
    .bind(server_id)
    .bind(&name)
    .bind(body.description)
    .bind(user_id)
    .bind(&invite_code)
    .execute(&mut *tx)
    .await?;

    sqlx::query("INSERT INTO server_members (server_id, user_id) VALUES ($1, $2)")
        .bind(server_id)
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    sqlx::query(
        r#"INSERT INTO roles (
                id, server_id, name, permissions, position, is_hoisted,
                is_managed, is_mentionable, is_default
           )
           VALUES ($1, $2, '@everyone', $3, -1, FALSE, FALSE, FALSE, TRUE)"#,
    )
    .bind(everyone_role_id)
    .bind(server_id)
    .bind(DEFAULT_EVERYONE_PERMISSIONS)
    .execute(&mut *tx)
    .await?;

    sqlx::query("INSERT INTO categories (id, server_id, name, position) VALUES ($1, $2, $3, $4)")
        .bind(cat_info_id)
        .bind(server_id)
        .bind("INFORMACION")
        .bind(0_i32)
        .execute(&mut *tx)
        .await?;

    sqlx::query("INSERT INTO categories (id, server_id, name, position) VALUES ($1, $2, $3, $4)")
        .bind(cat_gen_id)
        .bind(server_id)
        .bind("GENERAL")
        .bind(1_i32)
        .execute(&mut *tx)
        .await?;

    sqlx::query(
        r#"INSERT INTO channels (id, server_id, category_id, name, channel_type, position)
           VALUES ($1, $2, $3, 'reglas', 'text', 0)"#,
    )
    .bind(ch_reglas_id)
    .bind(server_id)
    .bind(cat_info_id)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        r#"INSERT INTO channels (id, server_id, category_id, name, channel_type, position)
           VALUES ($1, $2, $3, 'bienvenida', 'text', 1)"#,
    )
    .bind(ch_bienvenida_id)
    .bind(server_id)
    .bind(cat_info_id)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        r#"INSERT INTO channels (id, server_id, category_id, name, channel_type, position)
           VALUES ($1, $2, $3, 'chat-general', 'text', 0)"#,
    )
    .bind(ch_general_id)
    .bind(server_id)
    .bind(cat_gen_id)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        r#"INSERT INTO channels (id, server_id, category_id, name, channel_type, position)
           VALUES ($1, $2, $3, 'voz-general', 'voice', 1)"#,
    )
    .bind(ch_voz_id)
    .bind(server_id)
    .bind(cat_gen_id)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        r#"INSERT INTO permission_overwrites (
                id, server_id, category_id, target_type, target_id, allow_bits, deny_bits
           )
           VALUES ($1, $2, $3, 'role', $4, 0, $5)"#,
    )
    .bind(Uuid::new_v4())
    .bind(server_id)
    .bind(cat_info_id)
    .bind(everyone_role_id)
    .bind(SEND_MESSAGES_PERMISSION)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    let s = sqlx::query_as::<_, crate::models::server::Server>(
        r#"SELECT id, name, description, icon_url, banner_url,
                  owner_id, invite_code, is_public, member_count, created_at
           FROM servers WHERE id = $1"#,
    )
    .bind(server_id)
    .fetch_one(&state.db)
    .await?;

    let roles = load_server_roles(&state, server_id).await?;
    let categories = sqlx::query_as::<_, ServerCategoryRow>(
        r#"SELECT id, server_id, name, position
           FROM categories
           WHERE server_id = $1
           ORDER BY position ASC, created_at ASC"#,
    )
    .bind(server_id)
    .fetch_all(&state.db)
    .await?;
    let channels = sqlx::query_as::<_, ServerChannelRow>(
        r#"SELECT id, server_id, category_id, name, topic, icon_key, channel_type, position,
                  is_nsfw, slowmode_seconds, last_message_id, created_at
           FROM channels
           WHERE server_id = $1
           ORDER BY category_id NULLS FIRST, position ASC, created_at ASC"#,
    )
    .bind(server_id)
    .fetch_all(&state.db)
    .await?;

    let roles_payload: Vec<Value> = roles.iter().map(role_payload).collect();
    let category_payloads: Vec<Value> = categories
        .into_iter()
        .map(|category| {
            json!({
                "id": category.id,
                "serverId": category.server_id,
                "name": category.name,
                "position": category.position,
            })
        })
        .collect();
    let channel_payloads: Vec<Value> = channels
        .into_iter()
        .map(|channel| {
            json!({
                "id": channel.id,
                "serverId": channel.server_id,
                "categoryId": channel.category_id,
                "name": channel.name,
                "topic": channel.topic,
                "iconKey": channel.icon_key,
                "type": channel.channel_type,
                "position": channel.position,
                "isNsfw": channel.is_nsfw,
                "slowmodeSeconds": channel.slowmode_seconds,
                "lastMessageId": channel.last_message_id,
                "createdAt": channel.created_at,
                "canSendMessages": channel.category_id != Some(cat_info_id),
            })
        })
        .collect();

    Ok(Json(json!({
        "data": {
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "iconUrl": s.icon_url,
            "bannerUrl": s.banner_url,
            "ownerId": s.owner_id,
            "inviteCode": s.invite_code,
            "isPublic": s.is_public,
            "memberCount": s.member_count,
            "createdAt": s.created_at,
            "channels": channel_payloads,
            "categories": category_payloads,
            "roles": roles_payload,
        }
    })))
}

pub async fn update_server(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(server_id): Path<Uuid>,
    Json(body): Json<UpdateServerBody>,
) -> Result<Json<Value>> {
    ensure_owner_or_manage_server(&state, user_id, server_id).await?;

    let invite_code = if let Some(raw_invite_code) = body.invite_code {
        let normalized = raw_invite_code.trim().to_ascii_lowercase();
        if normalized.is_empty() {
            return Err(AppError::validation(
                "inviteCode",
                "Invite code cannot be empty",
            ));
        }
        if normalized.len() < 3 || normalized.len() > 32 {
            return Err(AppError::validation(
                "inviteCode",
                "Invite code must be between 3 and 32 characters",
            ));
        }
        if !normalized
            .chars()
            .all(|ch| ch.is_ascii_lowercase() || ch.is_ascii_digit() || ch == '-' || ch == '_')
        {
            return Err(AppError::validation(
                "inviteCode",
                "Use only lowercase letters, numbers, '-' and '_'",
            ));
        }

        let is_taken: bool = sqlx::query_scalar(
            r#"SELECT EXISTS(
                SELECT 1
                FROM servers
                WHERE invite_code = $1
                  AND id <> $2
            )"#,
        )
        .bind(&normalized)
        .bind(server_id)
        .fetch_one(&state.db)
        .await?;

        if is_taken {
            return Err(AppError::Conflict(
                "El codigo de invitacion ya esta en uso.".into(),
            ));
        }

        Some(normalized)
    } else {
        None
    };

    let s = sqlx::query_as::<_, crate::models::server::Server>(
        r#"UPDATE servers
           SET name        = COALESCE($2, name),
               description = COALESCE($3, description),
               is_public   = COALESCE($4, is_public),
               icon_url    = COALESCE($5, icon_url),
               banner_url  = COALESCE($6, banner_url),
               invite_code = COALESCE($7, invite_code)
           WHERE id = $1
           RETURNING id, name, description, icon_url, banner_url,
                     owner_id, invite_code, is_public, member_count, created_at"#,
    )
    .bind(server_id)
    .bind(body.name)
    .bind(body.description)
    .bind(body.is_public)
    .bind(body.icon_url)
    .bind(body.banner_url)
    .bind(invite_code)
    .fetch_one(&state.db)
    .await?;

    // Invalidate server cache after successful update
    let mut redis = state.redis.clone();
    cache::invalidate_server(&mut redis, server_id).await;

    Ok(Json(json!({
        "data": {
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "iconUrl": s.icon_url,
            "bannerUrl": s.banner_url,
            "ownerId": s.owner_id,
            "inviteCode": s.invite_code,
            "isPublic": s.is_public,
            "memberCount": s.member_count,
            "createdAt": s.created_at,
        }
    })))
}

pub async fn upload_server_icon(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(server_id): Path<Uuid>,
    mut multipart: Multipart,
) -> Result<Json<Value>> {
    ensure_owner(&state, user_id, server_id).await?;

    let mut file_data: Option<(Vec<u8>, String)> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("Multipart error: {e}")))?
    {
        let name = field.name().unwrap_or("").to_string();
        if name == "icon" {
            let content_type = field
                .content_type()
                .map(|ct| ct.to_string())
                .unwrap_or_else(|| "application/octet-stream".to_string());
            let allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
            if !allowed.contains(&content_type.as_str()) {
                return Err(AppError::BadRequest(
                    "Only JPEG, PNG, GIF, and WebP images are allowed".into(),
                ));
            }
            let bytes = field
                .bytes()
                .await
                .map_err(|e| AppError::BadRequest(format!("Failed to read file: {e}")))?;
            if bytes.len() > 8 * 1024 * 1024 {
                return Err(AppError::BadRequest("Icon must be under 8MB".into()));
            }
            file_data = Some((bytes.to_vec(), content_type));
        }
    }

    let (bytes, content_type) =
        file_data.ok_or_else(|| AppError::BadRequest("Missing icon field".into()))?;

    let ext = match content_type.as_str() {
        "image/jpeg" => "jpg",
        "image/png" => "png",
        "image/gif" => "gif",
        "image/webp" => "webp",
        _ => "bin",
    };
    let filename = format!("{}.{}", Uuid::new_v4(), ext);

    let uploads_dir = std::path::Path::new("uploads/server-icons");
    tokio::fs::create_dir_all(uploads_dir)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to create uploads dir: {e}")))?;
    let path = uploads_dir.join(&filename);
    tokio::fs::write(&path, &bytes)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to write icon: {e}")))?;

    let icon_url = format!("/uploads/server-icons/{}", filename);

    sqlx::query("UPDATE servers SET icon_url = $1 WHERE id = $2")
        .bind(&icon_url)
        .bind(server_id)
        .execute(&state.db)
        .await?;

    // Invalidate cache
    let mut redis = state.redis.clone();
    cache::invalidate_server(&mut redis, server_id).await;

    Ok(Json(json!({ "data": { "iconUrl": icon_url } })))
}

pub async fn upload_server_banner(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(server_id): Path<Uuid>,
    mut multipart: Multipart,
) -> Result<Json<Value>> {
    ensure_owner(&state, user_id, server_id).await?;

    let mut file_data: Option<(Vec<u8>, String)> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("Multipart error: {e}")))?
    {
        let name = field.name().unwrap_or("").to_string();
        if name == "banner" {
            let content_type = field
                .content_type()
                .map(|ct| ct.to_string())
                .unwrap_or_else(|| "application/octet-stream".to_string());
            let allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
            if !allowed.contains(&content_type.as_str()) {
                return Err(AppError::BadRequest(
                    "Only JPEG, PNG, GIF, and WebP images are allowed".into(),
                ));
            }
            let bytes = field
                .bytes()
                .await
                .map_err(|e| AppError::BadRequest(format!("Failed to read file: {e}")))?;
            if bytes.len() > 12 * 1024 * 1024 {
                return Err(AppError::BadRequest("Banner must be under 12MB".into()));
            }
            file_data = Some((bytes.to_vec(), content_type));
        }
    }

    let (bytes, content_type) =
        file_data.ok_or_else(|| AppError::BadRequest("Missing banner field".into()))?;

    let ext = match content_type.as_str() {
        "image/jpeg" => "jpg",
        "image/png" => "png",
        "image/gif" => "gif",
        "image/webp" => "webp",
        _ => "bin",
    };
    let filename = format!("{}.{}", Uuid::new_v4(), ext);

    let uploads_dir = std::path::Path::new("uploads/server-banners");
    tokio::fs::create_dir_all(uploads_dir)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to create uploads dir: {e}")))?;
    let path = uploads_dir.join(&filename);
    tokio::fs::write(&path, &bytes)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to write banner: {e}")))?;

    let banner_url = format!("/uploads/server-banners/{}", filename);

    sqlx::query("UPDATE servers SET banner_url = $1 WHERE id = $2")
        .bind(&banner_url)
        .bind(server_id)
        .execute(&state.db)
        .await?;

    // Invalidate cache
    let mut redis = state.redis.clone();
    cache::invalidate_server(&mut redis, server_id).await;

    Ok(Json(json!({ "data": { "bannerUrl": banner_url } })))
}

pub async fn delete_server(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(server_id): Path<Uuid>,
) -> Result<Json<Value>> {
    ensure_owner(&state, user_id, server_id).await?;

    sqlx::query("DELETE FROM servers WHERE id = $1")
        .bind(server_id)
        .execute(&state.db)
        .await?;

    // Invalidate cache
    let mut redis = state.redis.clone();
    cache::invalidate_server(&mut redis, server_id).await;

    Ok(Json(json!({ "data": null })))
}
