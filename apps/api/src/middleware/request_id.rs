use axum::{
    body::Body,
    http::{Request, Response},
    middleware::Next,
};
use std::sync::atomic::{AtomicU64, Ordering};
use tracing::{info_span, Instrument};

// Global counter for request IDs (simple, not cryptographically secure)
static REQUEST_ID_COUNTER: AtomicU64 = AtomicU64::new(1);

/// Middleware function that adds a unique X-Request-ID to each request and sets up tracing spans.
pub async fn request_id_middleware(mut req: Request<Body>, next: Next) -> Response<Body> {
    // Generate request ID
    let request_id = REQUEST_ID_COUNTER.fetch_add(1, Ordering::Relaxed);

    // Insert into request extensions for downstream use
    req.extensions_mut().insert(request_id);

    // Build span with context
    let method = req.method().clone();
    let uri = req.uri().clone();
    let span = info_span!(
        "request",
        %request_id,
        method = %method,
        uri = %uri,
        user_id = extract_user_id(&req)
    );

    // Execute request within span
    let res = next.run(req).instrument(span).await;

    // Add request ID to response headers (for debugging)
    let mut headers = res.headers().clone();
    headers.insert("X-Request-ID", format!("{}", request_id).parse().unwrap());

    let (parts, body) = res.into_parts();
    Response::from_parts(parts, body)
}

fn extract_user_id(req: &Request<Body>) -> Option<u64> {
    // Try to extract user_id from extensions (set by auth middleware)
    req.extensions().get::<uuid::Uuid>().map(|id| {
        // Convert UUID to a numeric representation for logging (first 8 bytes)
        let bytes = id.as_bytes();
        let mut value: u64 = 0;
        for (i, &b) in bytes[0..8].iter().enumerate() {
            value |= (b as u64) << (i * 8);
        }
        value
    })
}
