use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query, State,
    },
    response::IntoResponse,
};
use chrono::{DateTime, Utc};
use futures::{SinkExt, StreamExt};
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::sync::mpsc;
use tracing::error;
use uuid::Uuid;

use crate::{
    gateway::events::{GatewayMessage, OP_HEARTBEAT, OP_IDENTIFY, OP_VOICE_SIGNAL, OP_VOICE_STATE},
    models::{channel::Channel, server::Server, user::User},
    services::auth::verify_access_token,
    services::pubsub::{dm_channel, guild_channel, publish, user_channel},
    state::AppState,
};

#[derive(Deserialize)]
pub struct WsQuery {
    token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VoiceSession {
    server_id: Uuid,
    channel_id: Uuid,
    joined_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VoiceStatePayload {
    action: String,
    channel_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VoiceSignalPayload {
    target_user_id: Uuid,
    server_id: Uuid,
    channel_id: Uuid,
    signal_type: String,
    payload: Value,
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    Query(q): Query<WsQuery>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state, q.token))
}

async fn handle_socket(socket: WebSocket, state: AppState, token: Option<String>) {
    let (mut sender, mut receiver) = socket.split();

    // Send HELLO immediately
    let hello = GatewayMessage::hello();
    let hello_text = match serde_json::to_string(&hello) {
        Ok(s) => s,
        Err(e) => {
            error!("Failed to serialize HELLO gateway message: {}", e);
            return;
        }
    };
    if sender.send(Message::Text(hello_text)).await.is_err() {
        return;
    }

    // Wait for IDENTIFY (30s timeout)
    let user_id = loop {
        match tokio::time::timeout(std::time::Duration::from_secs(30), receiver.next()).await {
            Ok(Some(Ok(msg))) => {
                if let Some(uid) = try_identify(&msg, &state, &token) {
                    break uid;
                }
            }
            _ => return,
        }
    };

    // Subscribe to Redis channels for this user
    let guilds = get_user_guilds(&state, user_id).await;
    let dm_channels_ids = get_user_dm_channels(&state, user_id).await;

    let mut sub_channels: Vec<String> = vec![user_channel(user_id)];
    for gid in &guilds {
        sub_channels.push(guild_channel(*gid));
    }
    for cid in &dm_channels_ids {
        sub_channels.push(dm_channel(*cid));
    }

    // mpsc: Redis events → WS sender (bounded channel to prevent memory growth)
    let (event_tx, mut event_rx) = mpsc::channel(1000); // buffer de 1000 eventos

    // Spawn Redis subscriber: para PubSub necesitamos una conexión dedicada
    // (ConnectionManager no soporta PubSub).
    let redis_client = state.redis_client.clone();
    let event_tx_clone = event_tx.clone();
    let sub_channels_clone = sub_channels.clone();
    tokio::spawn(async move {
        subscribe_and_forward(redis_client, sub_channels_clone, event_tx_clone).await;
    });

    // Send READY
    let ready_data = build_ready_payload(&state, user_id).await;
    let ready_msg = GatewayMessage {
        op: crate::gateway::events::OP_READY,
        t: Some("READY".into()),
        d: Some(ready_data),
        s: Some(0),
    };
    let ready_text = match serde_json::to_string(&ready_msg) {
        Ok(s) => s,
        Err(e) => {
            error!(
                "Failed to serialize READY gateway message for user {}: {}",
                user_id, e
            );
            return;
        }
    };
    if sender.send(Message::Text(ready_text)).await.is_err() {
        return;
    }

    let seq = Arc::new(AtomicU64::new(1));
    let seq_clone = seq.clone();

    // Sender task: forward Redis events to WS (optimizado)
    tokio::spawn(async move {
        while let Some(raw) = event_rx.recv().await {
            if let Ok(mut val) = serde_json::from_str::<Value>(&raw) {
                // Check for heartbeat_ack and forward raw without modification
                if let Some("__heartbeat_ack") = val["t"].as_str() {
                    if sender.send(Message::Text(raw)).await.is_err() {
                        break;
                    }
                    continue;
                }

                // Agregar sequence number directamente al JSON sin clonar `d`
                val["s"] = serde_json::json!(seq_clone.fetch_add(1, Ordering::Relaxed));
                // Para eventos normales, serializar el JSON modificado
                if let Ok(text) = serde_json::to_string(&val) {
                    if sender.send(Message::Text(text)).await.is_err() {
                        break;
                    }
                }
            }
        }
    });

    // Main receiver loop: heartbeats and pongs
    while let Some(Ok(msg)) = receiver.next().await {
        match &msg {
            Message::Text(text) => {
                if let Ok(gm) = serde_json::from_str::<GatewayMessage>(text) {
                    match gm.op {
                        OP_HEARTBEAT => {
                            let _ = event_tx.send(r#"{"t":"__heartbeat_ack","d":null}"#.into());
                        }
                        OP_VOICE_STATE => {
                            if let Some(payload) = gm.d.as_ref() {
                                let _ = handle_voice_state_update(&state, user_id, payload).await;
                            }
                        }
                        OP_VOICE_SIGNAL => {
                            if let Some(payload) = gm.d.as_ref() {
                                let _ = handle_voice_signal(&state, user_id, payload).await;
                            }
                        }
                        _ => {}
                    }
                }
            }
            Message::Close(_) => break,
            _ => {}
        }
    }

    let _ = leave_active_voice_channel(&state, user_id).await;
}

async fn handle_voice_state_update(
    state: &AppState,
    user_id: Uuid,
    payload: &Value,
) -> anyhow::Result<()> {
    let payload: VoiceStatePayload = serde_json::from_value(payload.clone())?;

    match payload.action.as_str() {
        "join" => {
            let channel_id = match payload.channel_id {
                Some(value) => value,
                None => return Ok(()),
            };
            join_voice_channel(state, user_id, channel_id).await?;
        }
        "leave" => {
            leave_active_voice_channel(state, user_id).await?;
        }
        _ => {}
    }

    Ok(())
}

async fn handle_voice_signal(
    state: &AppState,
    user_id: Uuid,
    payload: &Value,
) -> anyhow::Result<()> {
    let payload: VoiceSignalPayload = serde_json::from_value(payload.clone())?;

    let Some(source_session) = get_active_voice_session(state, user_id).await? else {
        return Ok(());
    };

    if source_session.server_id != payload.server_id
        || source_session.channel_id != payload.channel_id
    {
        return Ok(());
    }

    let Some(target_session) = get_active_voice_session(state, payload.target_user_id).await?
    else {
        return Ok(());
    };

    if target_session.server_id != source_session.server_id
        || target_session.channel_id != source_session.channel_id
    {
        return Ok(());
    }

    let event = serde_json::json!({
        "t": "VOICE_SIGNAL",
        "d": {
            "serverId": payload.server_id,
            "channelId": payload.channel_id,
            "fromUserId": user_id,
            "signalType": payload.signal_type,
            "payload": payload.payload,
        }
    });

    publish(
        &state.redis,
        &user_channel(payload.target_user_id),
        &event.to_string(),
    )
    .await?;
    Ok(())
}

async fn join_voice_channel(
    state: &AppState,
    user_id: Uuid,
    channel_id: Uuid,
) -> anyhow::Result<()> {
    let Some(server_id) = load_joinable_voice_channel(state, user_id, channel_id).await? else {
        return Ok(());
    };

    leave_active_voice_channel(state, user_id).await?;
    let existing_participants = list_voice_participant_ids(state, channel_id).await?;

    let joined_at = Utc::now();
    let session = VoiceSession {
        server_id,
        channel_id,
        joined_at,
    };

    let mut redis = state.redis.clone();
    let session_key = voice_session_key(user_id);
    let participants_key = voice_participants_key(channel_id);
    let session_json = serde_json::to_string(&session)?;

    // Use pipeline for atomic multi-key operations + TTL (1 hour)
    let mut pipe = redis::pipe();
    pipe.set(&session_key, session_json);
    pipe.hset(
        &participants_key,
        user_id.to_string(),
        joined_at.to_rfc3339(),
    );
    pipe.expire(&session_key, 3600);
    pipe.expire(&participants_key, 3600);
    let _: () = pipe.ignore().query_async(&mut redis).await?;

    let joined_event = serde_json::json!({
        "t": "VOICE_USER_JOINED",
        "d": {
            "serverId": server_id,
            "channelId": channel_id,
            "userId": user_id,
            "joinedAt": joined_at,
        }
    });
    for participant_id in existing_participants {
        publish(
            &state.redis,
            &user_channel(participant_id),
            &joined_event.to_string(),
        )
        .await?;
    }
    publish_voice_snapshot(state, user_id, &session).await?;

    Ok(())
}

async fn leave_active_voice_channel(state: &AppState, user_id: Uuid) -> anyhow::Result<()> {
    let Some(session) = get_active_voice_session(state, user_id).await? else {
        return Ok(());
    };

    let mut redis = state.redis.clone();
    let session_key = voice_session_key(user_id);
    let participants_key = voice_participants_key(session.channel_id);

    // Use pipeline for atomic delete operations
    let mut pipe = redis::pipe();
    pipe.del(session_key);
    pipe.hdel(participants_key, user_id.to_string());
    let _: () = pipe.ignore().query_async(&mut redis).await?;

    let left_event = serde_json::json!({
        "t": "VOICE_USER_LEFT",
        "d": {
            "serverId": session.server_id,
            "channelId": session.channel_id,
            "userId": user_id,
        }
    });
    publish(
        &state.redis,
        &guild_channel(session.server_id),
        &left_event.to_string(),
    )
    .await?;

    Ok(())
}

async fn publish_voice_snapshot(
    state: &AppState,
    user_id: Uuid,
    session: &VoiceSession,
) -> anyhow::Result<()> {
    let mut redis = state.redis.clone();
    let participants: std::collections::HashMap<String, String> = redis
        .hgetall(voice_participants_key(session.channel_id))
        .await
        .unwrap_or_default();

    let participants = participants
        .into_iter()
        .filter_map(|(participant_user_id, joined_at)| {
            Some(serde_json::json!({
                "userId": Uuid::parse_str(&participant_user_id).ok()?,
                "serverId": session.server_id,
                "channelId": session.channel_id,
                "joinedAt": joined_at,
            }))
        })
        .collect::<Vec<_>>();

    let snapshot_event = serde_json::json!({
        "t": "VOICE_STATE_SNAPSHOT",
        "d": {
            "serverId": session.server_id,
            "channelId": session.channel_id,
            "participants": participants,
        }
    });

    publish(
        &state.redis,
        &user_channel(user_id),
        &snapshot_event.to_string(),
    )
    .await?;
    Ok(())
}

async fn get_active_voice_session(
    state: &AppState,
    user_id: Uuid,
) -> anyhow::Result<Option<VoiceSession>> {
    let mut redis = state.redis.clone();
    let raw: Option<String> = redis.get(voice_session_key(user_id)).await?;
    Ok(raw.and_then(|value| serde_json::from_str::<VoiceSession>(&value).ok()))
}

async fn list_voice_participant_ids(
    state: &AppState,
    channel_id: Uuid,
) -> anyhow::Result<Vec<Uuid>> {
    let mut redis = state.redis.clone();
    let participants: std::collections::HashMap<String, String> = redis
        .hgetall(voice_participants_key(channel_id))
        .await
        .unwrap_or_default();

    Ok(participants
        .into_keys()
        .filter_map(|participant_user_id| Uuid::parse_str(&participant_user_id).ok())
        .collect())
}

async fn load_joinable_voice_channel(
    state: &AppState,
    user_id: Uuid,
    channel_id: Uuid,
) -> anyhow::Result<Option<Uuid>> {
    let server_id = sqlx::query_scalar::<_, Uuid>(
        r#"SELECT c.server_id
           FROM channels c
           JOIN server_members sm
             ON sm.server_id = c.server_id
            AND sm.user_id = $2
           WHERE c.id = $1
             AND c.channel_type = 'voice'"#,
    )
    .bind(channel_id)
    .bind(user_id)
    .fetch_optional(&state.db)
    .await?;

    Ok(server_id)
}

fn voice_session_key(user_id: Uuid) -> String {
    format!("voice:user:{}", user_id)
}

fn voice_participants_key(channel_id: Uuid) -> String {
    format!("voice:channel:{}:participants", channel_id)
}

fn try_identify(
    msg: &Message,
    state: &AppState,
    token_from_query: &Option<String>,
) -> Option<Uuid> {
    let text = match msg {
        Message::Text(t) => t,
        _ => return None,
    };

    let gm: GatewayMessage = serde_json::from_str(text).ok()?;
    if gm.op != OP_IDENTIFY {
        return None;
    }

    let token =
        gm.d.as_ref()
            .and_then(|d| d["token"].as_str().map(|s| s.to_string()))
            .or_else(|| token_from_query.clone())?;

    verify_access_token(&token, &state.config.jwt_secret).ok()
}

async fn subscribe_and_forward(
    redis_client: redis::Client,
    channels: Vec<String>,
    tx: mpsc::Sender<String>,
) {
    let mut pubsub = match redis_client.get_async_pubsub().await {
        Ok(pubsub) => pubsub,
        Err(_) => return,
    };

    for ch in &channels {
        if pubsub.subscribe(ch).await.is_err() {
            return;
        }
    }

    let mut stream = pubsub.on_message();
    while let Some(msg) = stream.next().await {
        let payload: String = match msg.get_payload::<String>() {
            Ok(p) => p,
            Err(_) => continue,
        };
        if tx.send(payload).await.is_err() {
            break;
        }
    }
}

async fn get_user_guilds(state: &AppState, user_id: Uuid) -> Vec<Uuid> {
    sqlx::query_scalar::<_, Uuid>("SELECT server_id FROM server_members WHERE user_id = $1")
        .bind(user_id)
        .fetch_all(&state.db)
        .await
        .unwrap_or_default()
}

async fn get_user_dm_channels(state: &AppState, user_id: Uuid) -> Vec<Uuid> {
    sqlx::query_scalar::<_, Uuid>("SELECT channel_id FROM dm_participants WHERE user_id = $1")
        .bind(user_id)
        .fetch_all(&state.db)
        .await
        .unwrap_or_default()
}

async fn build_ready_payload(state: &AppState, user_id: Uuid) -> Value {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, username, display_name, discriminator, email, password_hash, avatar_url, avatar_decoration_url, banner_url,
                bio, status, custom_status, is_verified, badges, created_at
         FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_optional(&state.db)
    .await
    .ok()
    .flatten();

    let user_val = user
        .map(|u| {
            serde_json::json!({
                "id": u.id,
                "username": u.username,
                "displayName": u.display_name,
                "discriminator": u.discriminator,
                "email": u.email,
                "avatarUrl": u.avatar_url,
                "avatarDecorationUrl": u.avatar_decoration_url,
                "bannerUrl": u.banner_url,
                "bio": u.bio,
                "status": u.status,
                "customStatus": u.custom_status,
                "isVerified": u.is_verified,
                "badges": u.badges,
                "createdAt": u.created_at,
            })
        })
        .unwrap_or(Value::Null);

    let guilds_rows = sqlx::query_as::<_, Server>(
        "SELECT s.id, s.name, s.description, s.icon_url, s.banner_url,
                s.owner_id, s.invite_code, s.is_public, s.member_count, s.created_at
         FROM servers s
         JOIN server_members sm ON sm.server_id = s.id
         WHERE sm.user_id = $1",
    )
    .bind(user_id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let guilds: Vec<Value> = guilds_rows
        .into_iter()
        .map(|s| {
            serde_json::json!({
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

    let dm_rows = sqlx::query_as::<_, Channel>(
        "SELECT c.id, c.server_id, c.category_id, c.name, c.topic, c.icon_key, c.font_key, c.font_weight, c.channel_type,
                c.position, c.is_nsfw, c.slowmode_seconds, c.last_message_id, c.created_at
         FROM channels c
         JOIN dm_participants dp ON dp.channel_id = c.id
         WHERE dp.user_id = $1 AND c.channel_type IN ('dm', 'group_dm')",
    )
    .bind(user_id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let dm_channels: Vec<Value> = dm_rows
        .into_iter()
        .map(|c| {
            serde_json::json!({
                "id": c.id,
                "name": c.name,
                "iconKey": c.icon_key,
                "fontKey": c.font_key,
                "fontWeight": c.font_weight,
                "type": c.channel_type,
                "lastMessageId": c.last_message_id,
                "createdAt": c.created_at,
            })
        })
        .collect();

    serde_json::json!({
        "user": user_val,
        "guilds": guilds,
        "dmChannels": dm_channels,
    })
}
