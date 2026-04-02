use std::collections::{HashMap, HashSet};

use serde_json::{json, Value};
use sqlx::FromRow;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    state::AppState,
};

pub(crate) const VIEW_CHANNEL_PERMISSION: i64 = 1 << 0;
pub(crate) const SEND_MESSAGES_PERMISSION: i64 = 1 << 1;
pub(crate) const MANAGE_MESSAGES_PERMISSION: i64 = 1 << 2;
pub(crate) const MANAGE_CHANNELS_PERMISSION: i64 = 1 << 3;
pub(crate) const MANAGE_ROLES_PERMISSION: i64 = 1 << 4;
pub(crate) const KICK_MEMBERS_PERMISSION: i64 = 1 << 5;
pub(crate) const BAN_MEMBERS_PERMISSION: i64 = 1 << 6;
pub(crate) const MANAGE_SERVER_PERMISSION: i64 = 1 << 7;
pub(crate) const MENTION_EVERYONE_PERMISSION: i64 = 1 << 8;
pub(crate) const ADD_REACTIONS_PERMISSION: i64 = 1 << 9;
pub(crate) const ATTACH_FILES_PERMISSION: i64 = 1 << 10;
pub(crate) const READ_MESSAGE_HISTORY_PERMISSION: i64 = 1 << 11;
pub(crate) const ADMINISTRATOR_PERMISSION: i64 = 1 << 12;
pub(crate) const DEFAULT_EVERYONE_PERMISSIONS: i64 = VIEW_CHANNEL_PERMISSION
    | SEND_MESSAGES_PERMISSION
    | ADD_REACTIONS_PERMISSION
    | ATTACH_FILES_PERMISSION
    | READ_MESSAGE_HISTORY_PERMISSION;
pub(crate) const ALL_KNOWN_PERMISSIONS: i64 = VIEW_CHANNEL_PERMISSION
    | SEND_MESSAGES_PERMISSION
    | MANAGE_MESSAGES_PERMISSION
    | MANAGE_CHANNELS_PERMISSION
    | MANAGE_ROLES_PERMISSION
    | KICK_MEMBERS_PERMISSION
    | BAN_MEMBERS_PERMISSION
    | MANAGE_SERVER_PERMISSION
    | MENTION_EVERYONE_PERMISSION
    | ADD_REACTIONS_PERMISSION
    | ATTACH_FILES_PERMISSION
    | READ_MESSAGE_HISTORY_PERMISSION
    | ADMINISTRATOR_PERMISSION;

#[derive(Debug, Clone, FromRow)]
pub(crate) struct RoleRecord {
    pub id: Uuid,
    pub server_id: Uuid,
    pub name: String,
    pub color: Option<i32>,
    pub permissions: i64,
    pub position: i32,
    pub is_hoisted: bool,
    pub is_managed: bool,
    pub is_mentionable: bool,
    pub is_default: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, FromRow)]
pub(crate) struct PermissionOverwriteRecord {
    pub id: Uuid,
    pub server_id: Uuid,
    pub category_id: Option<Uuid>,
    pub channel_id: Option<Uuid>,
    pub target_type: String,
    pub target_id: Uuid,
    pub allow_bits: i64,
    pub deny_bits: i64,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone)]
pub(crate) struct ServerPermissionsContext {
    pub server_id: Uuid,
    pub user_id: Uuid,
    pub owner_id: Uuid,
    pub is_owner: bool,
    pub default_role: RoleRecord,
    pub roles: Vec<RoleRecord>,
    pub base_permissions: i64,
    pub highest_role_position: i32,
}

#[derive(Debug, Clone)]
pub(crate) struct ChannelAccess {
    pub channel_id: Uuid,
    pub server_id: Option<Uuid>,
    pub category_id: Option<Uuid>,
    pub permissions: i64,
}

#[derive(Debug, Clone, FromRow)]
struct ChannelLocationRow {
    id: Uuid,
    server_id: Option<Uuid>,
    category_id: Option<Uuid>,
}

pub(crate) async fn ensure_member(state: &AppState, user_id: Uuid, server_id: Uuid) -> Result<()> {
    let exists = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM server_members WHERE server_id = $1 AND user_id = $2)",
        server_id,
        user_id
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(false);

    if !exists {
        return Err(AppError::Forbidden("Not a member of this server".into()));
    }
    Ok(())
}

pub(crate) async fn ensure_owner(state: &AppState, user_id: Uuid, server_id: Uuid) -> Result<()> {
    let owner_id = fetch_server_owner_id(state, server_id).await?;
    if owner_id != user_id {
        return Err(AppError::Forbidden(
            "Only the server owner can do this".into(),
        ));
    }
    Ok(())
}

pub(crate) async fn fetch_server_owner_id(state: &AppState, server_id: Uuid) -> Result<Uuid> {
    sqlx::query_scalar!("SELECT owner_id FROM servers WHERE id = $1", server_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Server not found".into()))
}

pub(crate) async fn fetch_default_role(state: &AppState, server_id: Uuid) -> Result<RoleRecord> {
    sqlx::query_as::<_, RoleRecord>(
        r#"SELECT id, server_id, name, color, permissions, position, is_hoisted, is_managed,
                  is_mentionable, is_default, created_at
           FROM roles
           WHERE server_id = $1
             AND is_default = TRUE
           ORDER BY position ASC
           LIMIT 1"#,
    )
    .bind(server_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| {
        AppError::Internal(anyhow::anyhow!(
            "Missing default role for server {}",
            server_id
        ))
    })
}

pub(crate) async fn load_server_roles(
    state: &AppState,
    server_id: Uuid,
) -> Result<Vec<RoleRecord>> {
    sqlx::query_as::<_, RoleRecord>(
        r#"SELECT id, server_id, name, color, permissions, position, is_hoisted, is_managed,
                  is_mentionable, is_default, created_at
           FROM roles
           WHERE server_id = $1
           ORDER BY is_default ASC, position DESC, created_at ASC"#,
    )
    .bind(server_id)
    .fetch_all(&state.db)
    .await
    .map_err(Into::into)
}

pub(crate) async fn load_member_roles(
    state: &AppState,
    server_id: Uuid,
    user_id: Uuid,
) -> Result<Vec<RoleRecord>> {
    sqlx::query_as::<_, RoleRecord>(
        r#"SELECT r.id, r.server_id, r.name, r.color, r.permissions, r.position, r.is_hoisted,
                  r.is_managed, r.is_mentionable, r.is_default, r.created_at
           FROM member_roles mr
           JOIN roles r ON r.id = mr.role_id
           WHERE mr.server_id = $1
             AND mr.user_id = $2
           ORDER BY r.position DESC, r.created_at ASC"#,
    )
    .bind(server_id)
    .bind(user_id)
    .fetch_all(&state.db)
    .await
    .map_err(Into::into)
}

pub(crate) async fn load_server_permissions_context(
    state: &AppState,
    user_id: Uuid,
    server_id: Uuid,
) -> Result<ServerPermissionsContext> {
    // Combined query: obtain owner_id and verify membership in a single DB roundtrip
    let row = sqlx::query!(
        "SELECT s.owner_id, (sm.user_id IS NOT NULL) as \"is_member!\"
         FROM servers s
         LEFT JOIN server_members sm ON sm.server_id = s.id AND sm.user_id = $2
         WHERE s.id = $1",
        server_id,
        user_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Server not found".into()))?;

    if !row.is_member {
        return Err(AppError::Forbidden("Not a member of this server".into()));
    }

    let owner_id = row.owner_id;

    let default_role = fetch_default_role(state, server_id).await?;
    let roles = load_member_roles(state, server_id, user_id).await?;
    let base_permissions = roles.iter().fold(default_role.permissions, |bits, role| {
        bits | role.permissions
    });
    let highest_role_position = roles
        .iter()
        .map(|role| role.position)
        .max()
        .unwrap_or(default_role.position);

    Ok(ServerPermissionsContext {
        server_id,
        user_id,
        owner_id,
        is_owner: owner_id == user_id,
        default_role,
        roles,
        base_permissions,
        highest_role_position,
    })
}

pub(crate) fn has_permission(bits: i64, permission: i64) -> bool {
    if (bits & ADMINISTRATOR_PERMISSION) == ADMINISTRATOR_PERMISSION {
        return true;
    }
    (bits & permission) == permission
}

pub(crate) fn context_has_permission(context: &ServerPermissionsContext, permission: i64) -> bool {
    context.is_owner || has_permission(context.base_permissions, permission)
}

pub(crate) async fn ensure_server_permission(
    state: &AppState,
    user_id: Uuid,
    server_id: Uuid,
    permission: i64,
    message: &str,
) -> Result<ServerPermissionsContext> {
    let context = load_server_permissions_context(state, user_id, server_id).await?;
    if context_has_permission(&context, permission) {
        return Ok(context);
    }

    Err(AppError::Forbidden(message.into()))
}

pub(crate) async fn ensure_owner_or_manage_server(
    state: &AppState,
    user_id: Uuid,
    server_id: Uuid,
) -> Result<ServerPermissionsContext> {
    ensure_server_permission(
        state,
        user_id,
        server_id,
        MANAGE_SERVER_PERMISSION,
        "Only the server owner or members with MANAGE_SERVER can do this",
    )
    .await
}

pub(crate) async fn load_role(state: &AppState, role_id: Uuid) -> Result<RoleRecord> {
    sqlx::query_as::<_, RoleRecord>(
        r#"SELECT id, server_id, name, color, permissions, position, is_hoisted, is_managed,
                  is_mentionable, is_default, created_at
           FROM roles
           WHERE id = $1"#,
    )
    .bind(role_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Role not found".into()))
}

pub(crate) async fn load_member_highest_role_position(
    state: &AppState,
    server_id: Uuid,
    user_id: Uuid,
) -> Result<i32> {
    let default_role = fetch_default_role(state, server_id).await?;
    let highest = sqlx::query_scalar!(
        r#"SELECT MAX(r.position) as "max_position?"
           FROM member_roles mr
           JOIN roles r ON r.id = mr.role_id
           WHERE mr.server_id = $1
             AND mr.user_id = $2"#,
        server_id,
        user_id
    )
    .fetch_one(&state.db)
    .await?;

    Ok(highest.unwrap_or(default_role.position))
}

pub(crate) async fn ensure_manageable_member_target(
    state: &AppState,
    actor: &ServerPermissionsContext,
    target_user_id: Uuid,
) -> Result<()> {
    if actor.owner_id == target_user_id {
        return Err(AppError::Forbidden(
            "The server owner cannot be moderated or removed".into(),
        ));
    }

    if actor.is_owner {
        return Ok(());
    }

    ensure_member(state, target_user_id, actor.server_id).await?;
    let target_highest =
        load_member_highest_role_position(state, actor.server_id, target_user_id).await?;

    if actor.highest_role_position <= target_highest {
        return Err(AppError::Forbidden(
            "You cannot manage a member with an equal or higher role".into(),
        ));
    }

    Ok(())
}

pub(crate) fn ensure_manageable_role_target(
    actor: &ServerPermissionsContext,
    role: &RoleRecord,
) -> Result<()> {
    if role.is_default {
        return Err(AppError::Forbidden(
            "The default @everyone role cannot be modified here".into(),
        ));
    }

    if actor.is_owner {
        return Ok(());
    }

    if actor.highest_role_position <= role.position {
        return Err(AppError::Forbidden(
            "You cannot manage a role that is equal or higher than your highest role".into(),
        ));
    }

    Ok(())
}

pub(crate) fn ensure_assignable_roles(
    actor: &ServerPermissionsContext,
    roles: &[RoleRecord],
) -> Result<()> {
    if actor.is_owner {
        return Ok(());
    }

    if roles.iter().any(|role| role.is_default) {
        return Err(AppError::Forbidden(
            "The default @everyone role is assigned implicitly and cannot be changed".into(),
        ));
    }

    if roles
        .iter()
        .any(|role| role.position >= actor.highest_role_position)
    {
        return Err(AppError::Forbidden(
            "You cannot assign roles that are equal or higher than your highest role".into(),
        ));
    }

    Ok(())
}

pub(crate) async fn load_channel_access(
    state: &AppState,
    user_id: Uuid,
    channel_id: Uuid,
) -> Result<ChannelAccess> {
    let location = sqlx::query_as::<_, ChannelLocationRow>(
        r#"SELECT id, server_id, category_id
           FROM channels
           WHERE id = $1"#,
    )
    .bind(channel_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Channel not found".into()))?;

    let Some(server_id) = location.server_id else {
        let in_dm = sqlx::query_scalar!(
            "SELECT EXISTS(SELECT 1 FROM dm_participants WHERE channel_id = $1 AND user_id = $2)",
            channel_id,
            user_id
        )
        .fetch_one(&state.db)
        .await?
        .unwrap_or(false);

        if !in_dm {
            return Err(AppError::Forbidden("Not a participant of this DM".into()));
        }

        return Ok(ChannelAccess {
            channel_id,
            server_id: None,
            category_id: None,
            permissions: ALL_KNOWN_PERMISSIONS,
        });
    };

    let context = load_server_permissions_context(state, user_id, server_id).await?;
    let permissions =
        resolve_channel_permissions(state, &context, location.category_id, location.id).await?;

    Ok(ChannelAccess {
        channel_id,
        server_id: Some(server_id),
        category_id: location.category_id,
        permissions,
    })
}

pub(crate) async fn ensure_channel_view_access(
    state: &AppState,
    user_id: Uuid,
    channel_id: Uuid,
) -> Result<ChannelAccess> {
    let access = load_channel_access(state, user_id, channel_id).await?;
    if access.server_id.is_some() && !has_permission(access.permissions, VIEW_CHANNEL_PERMISSION) {
        return Err(AppError::Forbidden(
            "You do not have access to this channel".into(),
        ));
    }
    Ok(access)
}

pub(crate) async fn resolve_channel_permissions(
    state: &AppState,
    context: &ServerPermissionsContext,
    category_id: Option<Uuid>,
    channel_id: Uuid,
) -> Result<i64> {
    if context.is_owner || has_permission(context.base_permissions, ADMINISTRATOR_PERMISSION) {
        return Ok(ALL_KNOWN_PERMISSIONS);
    }

    let mut permissions = context.base_permissions;
    if let Some(category_id) = category_id {
        let overwrites = load_scope_overwrites(state, Some(category_id), None).await?;
        permissions = apply_overwrites(permissions, context, &overwrites);
    }

    let overwrites = load_scope_overwrites(state, None, Some(channel_id)).await?;
    Ok(apply_overwrites(permissions, context, &overwrites))
}

pub(crate) async fn load_scope_overwrites(
    state: &AppState,
    category_id: Option<Uuid>,
    channel_id: Option<Uuid>,
) -> Result<Vec<PermissionOverwriteRecord>> {
    match (category_id, channel_id) {
        (Some(category_id), None) => sqlx::query_as::<_, PermissionOverwriteRecord>(
            r#"SELECT id, server_id, category_id, channel_id, target_type, target_id, allow_bits,
                      deny_bits, created_at
               FROM permission_overwrites
               WHERE category_id = $1
               ORDER BY created_at ASC"#,
        )
        .bind(category_id)
        .fetch_all(&state.db)
        .await
        .map_err(Into::into),
        (None, Some(channel_id)) => sqlx::query_as::<_, PermissionOverwriteRecord>(
            r#"SELECT id, server_id, category_id, channel_id, target_type, target_id, allow_bits,
                      deny_bits, created_at
               FROM permission_overwrites
               WHERE channel_id = $1
               ORDER BY created_at ASC"#,
        )
        .bind(channel_id)
        .fetch_all(&state.db)
        .await
        .map_err(Into::into),
        _ => Ok(Vec::new()),
    }
}

pub fn apply_overwrites(
    mut permissions: i64,
    context: &ServerPermissionsContext,
    overwrites: &[PermissionOverwriteRecord],
) -> i64 {
    let role_ids: HashSet<Uuid> = context.roles.iter().map(|role| role.id).collect();

    let (everyone_deny, everyone_allow) = aggregate_overwrites(overwrites, |overwrite| {
        overwrite.target_type == "role" && overwrite.target_id == context.default_role.id
    });
    permissions &= !everyone_deny;
    permissions |= everyone_allow;

    let (roles_deny, roles_allow) = aggregate_overwrites(overwrites, |overwrite| {
        overwrite.target_type == "role" && role_ids.contains(&overwrite.target_id)
    });
    permissions &= !roles_deny;
    permissions |= roles_allow;

    let (member_deny, member_allow) = aggregate_overwrites(overwrites, |overwrite| {
        overwrite.target_type == "member" && overwrite.target_id == context.user_id
    });
    permissions &= !member_deny;
    permissions |= member_allow;

    permissions
}

fn aggregate_overwrites<F>(overwrites: &[PermissionOverwriteRecord], predicate: F) -> (i64, i64)
where
    F: Fn(&PermissionOverwriteRecord) -> bool,
{
    overwrites
        .iter()
        .filter(|overwrite| predicate(overwrite))
        .fold((0_i64, 0_i64), |(deny, allow), overwrite| {
            (deny | overwrite.deny_bits, allow | overwrite.allow_bits)
        })
}

pub(crate) fn role_payload(role: &RoleRecord) -> Value {
    json!({
        "id": role.id,
        "serverId": role.server_id,
        "name": role.name,
        "color": role.color,
        "permissions": role.permissions,
        "position": role.position,
        "isHoisted": role.is_hoisted,
        "isManaged": role.is_managed,
        "isMentionable": role.is_mentionable,
        "isDefault": role.is_default,
        "createdAt": role.created_at,
    })
}

pub(crate) fn overwrite_payload(overwrite: &PermissionOverwriteRecord) -> Value {
    json!({
        "id": overwrite.id,
        "serverId": overwrite.server_id,
        "categoryId": overwrite.category_id,
        "channelId": overwrite.channel_id,
        "targetType": overwrite.target_type,
        "targetId": overwrite.target_id,
        "allowBits": overwrite.allow_bits,
        "denyBits": overwrite.deny_bits,
        "createdAt": overwrite.created_at,
    })
}

/// Batch de overwrites cargados para un servidor.
/// Permite acceso O(1) por channel_id o category_id, evitando N+1 queries.
#[derive(Clone)]
pub(crate) struct OverwritesBatch {
    pub by_channel: HashMap<Uuid, Vec<PermissionOverwriteRecord>>,
    pub by_category: HashMap<Uuid, Vec<PermissionOverwriteRecord>>,
}

/// Carga todos los permission overwrites de un servidor en una sola query.
/// Retorna un batch organizado por channel_id y category_id.
pub(crate) async fn load_all_overwrites_for_server(
    state: &AppState,
    server_id: Uuid,
) -> Result<OverwritesBatch> {
    let rows = sqlx::query_as::<_, PermissionOverwriteRecord>(
        r#"SELECT id, server_id, category_id, channel_id, target_type, target_id, allow_bits,
                  deny_bits, created_at
           FROM permission_overwrites
           WHERE server_id = $1
           ORDER BY created_at ASC"#
    )
    .bind(server_id)
    .fetch_all(&state.db)
    .await?;

    let mut by_channel: HashMap<Uuid, Vec<PermissionOverwriteRecord>> = HashMap::new();
    let mut by_category: HashMap<Uuid, Vec<PermissionOverwriteRecord>> = HashMap::new();

    for row in rows {
        if let Some(channel_id) = row.channel_id {
            by_channel.entry(channel_id).or_default().push(row);
        } else if let Some(category_id) = row.category_id {
            by_category.entry(category_id).or_default().push(row);
        }
    }

    Ok(OverwritesBatch { by_channel, by_category })
}
