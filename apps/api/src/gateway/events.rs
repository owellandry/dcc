use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Op codes
pub const OP_DISPATCH: u8 = 0;      // Server -> Client: named event
pub const OP_HEARTBEAT: u8 = 1;     // Client -> Server: keep-alive
pub const OP_IDENTIFY: u8 = 2;      // Client -> Server: authenticate
pub const OP_VOICE_STATE: u8 = 13;  // Client -> Server: join/leave voice channel
pub const OP_VOICE_SIGNAL: u8 = 14; // Client -> Server: relay WebRTC signaling
pub const OP_HELLO: u8 = 10;        // Server -> Client: first message
pub const OP_READY: u8 = 11;        // Server -> Client: session established
pub const OP_HEARTBEAT_ACK: u8 = 12; // Server -> Client: heartbeat acknowledged

pub const HEARTBEAT_INTERVAL_MS: u64 = 41_250;

#[derive(Debug, Serialize, Deserialize)]
pub struct GatewayMessage {
    pub op: u8,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub t: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub d: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub s: Option<u64>,
}

impl GatewayMessage {
    pub fn hello() -> Self {
        Self {
            op: OP_HELLO,
            t: None,
            d: Some(serde_json::json!({ "heartbeatInterval": HEARTBEAT_INTERVAL_MS })),
            s: None,
        }
    }

    pub fn dispatch(event_type: &str, data: Value, seq: u64) -> Self {
        Self {
            op: OP_DISPATCH,
            t: Some(event_type.to_string()),
            d: Some(data),
            s: Some(seq),
        }
    }

    pub fn heartbeat_ack() -> Self {
        Self {
            op: OP_HEARTBEAT_ACK,
            t: None,
            d: None,
            s: None,
        }
    }
}
