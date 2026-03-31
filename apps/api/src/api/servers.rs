use axum::{
    extract::{Path, Query, State},
    extract::Multipart,
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

mod channels;
pub(crate) mod common;
mod invites;
mod members;
mod servers_crud;

pub use channels::create_channel;
pub use invites::{create_invite, get_invite, join_server};
pub use members::list_members;
pub use servers_crud::{
    create_server,
    delete_server,
    get_server,
    list_my_servers,
    update_server,
    upload_server_banner,
    upload_server_icon,
};
