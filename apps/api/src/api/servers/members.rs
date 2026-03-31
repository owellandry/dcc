use std::collections::HashMap;

use super::*;
use crate::api::servers::common::{ensure_member, load_member_roles, role_payload};

#[derive(Deserialize)]
pub struct MembersQuery {
    pub limit: Option<i64>,
    pub after: Option<Uuid>,
}

pub async fn list_members(
    AuthUser(user_id): AuthUser,
    State(state): State<AppState>,
    Path(server_id): Path<Uuid>,
    Query(q): Query<MembersQuery>,
) -> Result<Json<Value>> {
    ensure_member(&state, user_id, server_id).await?;

    let limit = q.limit.unwrap_or(50).min(100);

    use crate::models::server::ServerMemberRow;
    let rows = sqlx::query_as::<_, ServerMemberRow>(
        r#"SELECT sm.server_id, sm.user_id, sm.nickname, sm.joined_at,
                  u.username, u.discriminator, u.avatar_url, u.banner_url,
                  u.bio, u.status, u.custom_status, u.is_verified, u.badges, u.created_at as user_created_at
           FROM server_members sm
           JOIN users u ON u.id = sm.user_id
           WHERE sm.server_id = $1
             AND ($2::uuid IS NULL OR sm.joined_at > (
                 SELECT joined_at FROM server_members WHERE server_id = $1 AND user_id = $2
             ))
           ORDER BY sm.joined_at ASC
           LIMIT $3"#,
    )
    .bind(server_id)
    .bind(q.after)
    .bind(limit + 1)
    .fetch_all(&state.db)
    .await?;

    let has_more = rows.len() as i64 > limit;
    let rows = if has_more {
        &rows[..limit as usize]
    } else {
        &rows[..]
    };
    let next_cursor = rows.last().map(|r| r.user_id.to_string());

    let mut roles_by_user = HashMap::<Uuid, Vec<Value>>::new();
    for row in rows {
        let roles = load_member_roles(&state, row.server_id, row.user_id).await?;
        roles_by_user.insert(row.user_id, roles.iter().map(role_payload).collect());
    }

    let members: Vec<Value> = rows
        .iter()
        .map(|r| {
            json!({
                "serverId": r.server_id,
                "userId": r.user_id,
                "nickname": r.nickname,
                "joinedAt": r.joined_at,
                "roles": roles_by_user.get(&r.user_id).cloned().unwrap_or_default(),
                "user": {
                    "id": r.user_id,
                    "username": r.username,
                    "discriminator": r.discriminator,
                    "avatarUrl": r.avatar_url,
                    "bannerUrl": r.banner_url,
                    "bio": r.bio,
                    "status": r.status,
                    "customStatus": r.custom_status,
                    "isVerified": r.is_verified,
                    "badges": r.badges,
                    "createdAt": r.user_created_at,
                }
            })
        })
        .collect();

    Ok(Json(json!({
        "data": members,
        "meta": {
            "hasMore": has_more,
            "nextCursor": next_cursor,
            "prevCursor": null,
        }
    })))
}
