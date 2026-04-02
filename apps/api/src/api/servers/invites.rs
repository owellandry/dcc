use super::*;
use crate::api::servers::common::{ensure_server_permission, MANAGE_SERVER_PERMISSION};
use crate::middleware::AuthUser;
use crate::services::cache;
use serde_json::Value;

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CreateInviteBody {
    pub expires_in_seconds: Option<i64>,
    pub max_uses: Option<i32>,
}

struct ResolvedInviteServer {
    id: Uuid,
    name: String,
    description: Option<String>,
    icon_url: Option<String>,
    banner_url: Option<String>,
    owner_id: Uuid,
    invite_code: String,
    is_public: bool,
    member_count: i32,
    created_at: chrono::DateTime<Utc>,
    resolved_invite_code: String,
    tracked_invite: bool,
}

#[derive(sqlx::FromRow)]
struct ServerRow {
    id: Uuid,
    name: String,
    description: Option<String>,
    icon_url: Option<String>,
    banner_url: Option<String>,
    owner_id: Uuid,
    invite_code: String,
    is_public: bool,
    member_count: i32,
    created_at: chrono::DateTime<Utc>,
}

async fn resolve_invite_server(state: &AppState, code: &str) -> Result<ResolvedInviteServer> {
    let tracked = sqlx::query_as::<_, ServerRow>(
        r#"SELECT s.id, s.name, s.description, s.icon_url, s.banner_url,
                  s.owner_id, s.invite_code, s.is_public, s.member_count, s.created_at
           FROM server_invites i
           JOIN servers s ON s.id = i.server_id
           WHERE i.code = $1
             AND (i.expires_at IS NULL OR i.expires_at > NOW())
             AND (i.max_uses IS NULL OR i.uses < i.max_uses)"#,
    )
    .bind(code)
    .fetch_optional(&state.db)
    .await?;

    if let Some(row) = tracked {
        return Ok(ResolvedInviteServer {
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
            resolved_invite_code: code.to_string(),
            tracked_invite: true,
        });
    }

    let permanent = sqlx::query_as::<_, ServerRow>(
        r#"SELECT id, name, description, icon_url, banner_url,
                  owner_id, invite_code, is_public, member_count, created_at
           FROM servers
           WHERE invite_code = $1"#,
    )
    .bind(code)
    .fetch_optional(&state.db)
    .await?;

    if let Some(row) = permanent {
        let resolved_invite_code = row.invite_code.clone();
        return Ok(ResolvedInviteServer {
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
            resolved_invite_code,
            tracked_invite: false,
        });
    }

    Err(AppError::NotFound("Invite not found or expired".into()))
}

pub async fn create_invite(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(server_id): Path<Uuid>,
    body: Option<Json<CreateInviteBody>>,
) -> Result<Json<Value>> {
    ensure_server_permission(
        &state,
        user_id,
        server_id,
        MANAGE_SERVER_PERMISSION,
        "You do not have permission to create invites for this server",
    )
    .await?;

    let body = body.map(|Json(v)| v).unwrap_or_default();

    if let Some(expires_in_seconds) = body.expires_in_seconds {
        if expires_in_seconds <= 0 {
            return Err(AppError::validation(
                "expiresInSeconds",
                "Must be a positive number",
            ));
        }
    }

    if let Some(max_uses) = body.max_uses {
        if max_uses <= 0 {
            return Err(AppError::validation("maxUses", "Must be a positive number"));
        }
    }

    let expires_at = body
        .expires_in_seconds
        .and_then(|seconds| Utc::now().checked_add_signed(Duration::seconds(seconds)));

    let code = generate_invite_code();

    sqlx::query(
        r#"INSERT INTO server_invites (code, server_id, creator_id, expires_at, max_uses)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING"#,
    )
    .bind(&code)
    .bind(server_id)
    .bind(user_id)
    .bind(expires_at)
    .bind(body.max_uses)
    .execute(&state.db)
    .await?;

    Ok(Json(json!({ "data": { "code": code } })))
}

pub async fn get_invite(
    _auth: AuthUser,
    State(state): State<AppState>,
    Path(code): Path<String>,
) -> Result<Json<Value>> {
    let row = resolve_invite_server(&state, &code).await?;

    Ok(Json(json!({
        "data": {
            "inviteCode": row.resolved_invite_code,
            "server": {
                "id": row.id,
                "name": row.name,
                "description": row.description,
                "iconUrl": row.icon_url,
                "bannerUrl": row.banner_url,
                "ownerId": row.owner_id,
                "inviteCode": row.invite_code,
                "isPublic": row.is_public,
                "memberCount": row.member_count,
                "createdAt": row.created_at,
            }
        }
    })))
}

pub async fn join_server(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(code): Path<String>,
) -> Result<Json<Value>> {
    let row = resolve_invite_server(&state, &code).await?;

    let is_banned: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM server_bans WHERE server_id = $1 AND user_id = $2)",
    )
    .bind(row.id)
    .bind(user_id)
    .fetch_one(&state.db)
    .await?;

    if is_banned {
        return Err(AppError::Forbidden(
            "You are banned from this server".into(),
        ));
    }

    let join_result = sqlx::query(
        r#"INSERT INTO server_members (server_id, user_id)
           VALUES ($1, $2)
           ON CONFLICT (server_id, user_id) DO NOTHING"#,
    )
    .bind(row.id)
    .bind(user_id)
    .execute(&state.db)
    .await?;

    if join_result.rows_affected() > 0 {
        if row.tracked_invite {
            sqlx::query("UPDATE server_invites SET uses = uses + 1 WHERE code = $1")
                .bind(&code)
                .execute(&state.db)
                .await?;
        }

        sqlx::query(
            "UPDATE servers SET member_count = (SELECT COUNT(*) FROM server_members WHERE server_id = $1) WHERE id = $1",
        )
        .bind(row.id)
        .execute(&state.db)
        .await?;

        // Invalidate server cache after member count change
        let mut redis = state.redis.clone();
        cache::invalidate_server(&mut redis, row.id).await;

        let first_text_channel = sqlx::query_scalar::<_, Uuid>(
            r#"SELECT id
               FROM channels
               WHERE server_id = $1 AND channel_type = 'text'
               ORDER BY
                 CASE
                   WHEN translate(lower(name), 'áéíóúü', 'aeiouu') LIKE '%bienvenida%'
                     OR lower(name) LIKE '%welcome%' THEN 0
                   WHEN translate(lower(name), 'áéíóúü', 'aeiouu') LIKE '%regla%'
                     OR lower(name) LIKE '%rule%' THEN 2
                   ELSE 1
                 END,
                 position ASC,
                 created_at ASC
               LIMIT 1"#,
        )
        .bind(row.id)
        .fetch_optional(&state.db)
        .await?;

        if let Some(channel_id) = first_text_channel {
            #[derive(sqlx::FromRow)]
            struct JoinedUserRow {
                username: String,
                display_name: Option<String>,
                discriminator: String,
                avatar_url: Option<String>,
                avatar_decoration_url: Option<String>,
                banner_url: Option<String>,
                bio: Option<String>,
                status: Option<String>,
                custom_status: Option<String>,
                is_verified: bool,
                created_at: chrono::DateTime<Utc>,
            }

            let joined_user = sqlx::query_as::<_, JoinedUserRow>(
                r#"SELECT username, display_name, discriminator, avatar_url, avatar_decoration_url, banner_url, bio, status,
                          custom_status, is_verified, created_at
                   FROM users
                   WHERE id = $1"#,
            )
            .bind(user_id)
            .fetch_optional(&state.db)
            .await?;

            if let Some(joined_user) = joined_user {
                let message_id = Uuid::new_v4();
                let welcome_name = joined_user
                    .display_name
                    .as_deref()
                    .unwrap_or(joined_user.username.as_str());
                let welcome_content = format!("{} joined the server. Welcome!", welcome_name);

                let created_at = sqlx::query_scalar::<_, chrono::DateTime<Utc>>(
                    r#"INSERT INTO messages (id, channel_id, author_id, content, message_type)
                       VALUES ($1, $2, $3, $4, 'system')
                       RETURNING created_at"#,
                )
                .bind(message_id)
                .bind(channel_id)
                .bind(user_id)
                .bind(&welcome_content)
                .fetch_one(&state.db)
                .await?;

                sqlx::query("UPDATE channels SET last_message_id = $1 WHERE id = $2")
                    .bind(message_id)
                    .bind(channel_id)
                    .execute(&state.db)
                    .await?;

                let event = json!({
                    "t": "MESSAGE_CREATE",
                    "d": {
                        "id": message_id,
                        "channelId": channel_id,
                        "author": {
                            "id": user_id,
                            "username": joined_user.username,
                            "displayName": joined_user.display_name,
                            "discriminator": joined_user.discriminator,
                            "avatarUrl": joined_user.avatar_url,
                            "avatarDecorationUrl": joined_user.avatar_decoration_url,
                            "bannerUrl": joined_user.banner_url,
                            "bio": joined_user.bio,
                            "status": joined_user.status,
                            "customStatus": joined_user.custom_status,
                            "isVerified": joined_user.is_verified,
                            "createdAt": joined_user.created_at,
                        },
                        "content": welcome_content,
                        "type": "system",
                        "replyTo": null,
                        "attachments": [],
                        "reactions": [],
                        "isEdited": false,
                        "createdAt": created_at,
                        "editedAt": null,
                    }
                });
                let pub_channel = guild_channel(row.id);
                let _ = publish(&state.redis.clone(), &pub_channel, &event.to_string()).await;
            }
        }
    }

    Ok(Json(json!({
        "data": {
            "id": row.id,
            "name": row.name,
            "description": row.description,
            "iconUrl": row.icon_url,
            "bannerUrl": row.banner_url,
            "ownerId": row.owner_id,
            "inviteCode": row.invite_code,
            "isPublic": row.is_public,
            "memberCount": row.member_count,
            "createdAt": row.created_at,
        }
    })))
}
