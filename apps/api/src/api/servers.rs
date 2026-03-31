use axum::{
    extract::Multipart,
    extract::{Path, Query, State},
    Json,
};
use chrono::{Duration, Utc};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    middleware::AuthUser,
    services::auth::generate_invite_code,
    services::pubsub::{guild_channel, publish},
    state::AppState,
};

mod categories;
mod channels;
pub(crate) mod common;
mod invites;
mod members;
mod moderation;
mod overwrites;
mod roles;
mod servers_crud;
mod structure;

pub use categories::{create_category, delete_category, update_category};
pub use channels::create_channel;
pub use invites::{create_invite, get_invite, join_server};
pub use members::list_members;
pub use moderation::{ban_member, kick_member, replace_member_roles, unban_member};
pub use overwrites::{replace_category_overwrites, replace_channel_overwrites};
pub use roles::{create_role, delete_role, update_role};
pub use servers_crud::{
    create_server, delete_server, get_server, list_my_servers, update_server, upload_server_banner,
    upload_server_icon,
};
pub use structure::reorder_structure;
