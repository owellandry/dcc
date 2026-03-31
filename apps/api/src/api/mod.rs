pub mod auth;
pub mod users;
pub mod servers;
pub mod channels;
pub mod messages;
pub mod dms;
pub mod friends;
pub mod link_preview;

use axum::{routing::{delete, get, patch, post}, Router};
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        // ── Auth ─────────────────────────────────────────────────────────────
        .route("/auth/register",              post(auth::register))
        .route("/auth/login",                 post(auth::login))
        .route("/auth/logout",                post(auth::logout))
        .route("/auth/refresh",               post(auth::refresh))
        .route("/auth/verify-email",          post(auth::verify_email))
        .route("/auth/resend-verification",   post(auth::resend_verification))
        .route("/auth/oauth/google",          get(auth::oauth_google_redirect))
        .route("/auth/oauth/google/callback", get(auth::oauth_google_callback))
        .route("/auth/oauth/github",          get(auth::oauth_github_redirect))
        .route("/auth/oauth/github/callback", get(auth::oauth_github_callback))

        // ── Users ────────────────────────────────────────────────────────────
        .route("/users/@me",                  get(users::me).patch(users::update_me))
        .route("/users/@me/two-factor/setup", post(users::prepare_two_factor))
        .route("/users/@me/two-factor/enable", post(users::enable_two_factor))
        .route("/users/@me/two-factor/disable", post(users::disable_two_factor))
        .route("/users/:id",                  get(users::get_user))
        .route("/uploads/avatar",             post(users::upload_avatar))
        .route("/uploads/banner",             post(users::upload_banner))

        // ── Servers ──────────────────────────────────────────────────────────
        .route("/servers/@me",                get(servers::list_my_servers))
        .route("/servers",                    post(servers::create_server))
        .route("/servers/:id",                get(servers::get_server)
                                              .patch(servers::update_server)
                                              .delete(servers::delete_server))
        .route("/servers/:id/icon",           post(servers::upload_server_icon))
        .route("/servers/:id/banner",         post(servers::upload_server_banner))
        .route("/servers/:server_id/channels",post(servers::create_channel))
        .route("/servers/:server_id/members", get(servers::list_members))
        .route("/servers/:server_id/invites", post(servers::create_invite))
        .route("/invites/:code",              get(servers::get_invite))
        .route("/invites/:code/join",         post(servers::join_server))

        // ── Channels ─────────────────────────────────────────────────────────
        .route("/channels/:id",               get(channels::get_channel)
                                              .patch(channels::update_channel)
                                              .delete(channels::delete_channel))

        // ── Messages ─────────────────────────────────────────────────────────
        .route("/channels/:channel_id/messages",          get(messages::list_messages)
                                                          .post(messages::send_message))
        .route("/messages/:message_id",                   patch(messages::edit_message)
                                                          .delete(messages::delete_message))
        .route("/messages/:message_id/reactions/:emoji",  post(messages::add_reaction)
                                                          .delete(messages::remove_reaction))

        // ── DMs ──────────────────────────────────────────────────────────────
        .route("/dms",             get(dms::list_dms))
        .route("/dms/:user_id",    post(dms::open_dm))
        .route("/dms/c/:channel_id", delete(dms::close_dm))

        // ── Friends ──────────────────────────────────────────────────────────
        .route("/friends",              get(friends::list_friends))
        .route("/friends/:user_id",     post(friends::send_request)
                                        .patch(friends::update_friendship)
                                        .delete(friends::remove_friend))
        .route("/utils/link-preview",   get(link_preview::get_link_preview))
}
