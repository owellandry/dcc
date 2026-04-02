# Rate Limiting & Health Checks - Implementation Guide

**Added**: 2026-04-01
**Status**: Implemented (pending compilation)

---

## Rate Limiting

### Overview

Implementado middleware de rate limiting basado en Redis con ventanas deslizantes. Se aplica globalmente a todos los endpoints (excepto WebSocket y health checks).

### Configuration por Endpoint

Diferentes endpoints tienen límites distintos:

| Categoría | Max Requests | Ventana | Ejemplos |
|-----------|--------------|---------|----------|
| Auth | 5 | 60s | `/v1/auth/login`, `/v1/auth/register` |
| Messages | 10 | 1s | `POST /v1/channels/:id/messages` |
| Uploads | 10 | 60s | `POST /uploads/avatar`, `/banner`, `/icon` |
| Admin | 30 | 60s | `/servers/:id/kick`, `/bans`, `/roles`, `/overwrites` |
| General | 100 | 60s | Otros endpoints API |

### Algorithm

Uso de **INCR + EXPIRE** en Redis:

```text
Key: "ratelimit:{scope}:{identifier}"
  Example: "ratelimit:auth:user:12345" (si autenticado)
  Example: "ratelimit:messages:ip:192.168.1.1" (si anónimo)

- Al primer request: SET key 1 EX <window_secs>
- Subsequent: INCR key
- Si valor > max_requests → 429 Too Many Requests
```

Ventana deslizante simple (no perfecta pero suficiente para la mayoría de casos).

### Identifier Strategy

- **Usuario autenticado**: `user:{user_id}` (se obtiene de `AuthUser` extractor → extensions)
- **Usuario anónimo**: `anonymous` (placeholder, se puede mejorar con IP extraction)

Para producción, implementar middleware de IP extraction (X-Forwarded-For behind Cloudflare).

### Response Headers

Todas las responses incluyen:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
```

### Customization

Para ajustar límites, modificar `get_rate_limit_config()` en `src/middleware/ratelimit.rs`:

```rust
fn get_rate_limit_config(method: &Method, path: &str) -> Option<RateLimitConfig> {
    // Añadir excepciones o nuevas categorías aquí
}
```

### Redis Key Expiration

Las claves se auto-expiran después de la ventana. No requiere limpieza manual.

---

## Health Checks

Tres endpoints disponibles:

### `GET /live` - Liveness Probe

**Purpose**: Verificar que el proceso está vivo.
**Response**: `200 OK` con texto plano `"alive"`
**Usage**: Kubernetes livenessProbe

```yaml
livenessProbe:
  httpGet:
    path: /live
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
```

### `GET /ready` - Readiness Probe

**Purpose**: Verificar que el servidor está listo para recibir tráfico (DB connectivity).
**Response**:
- `200 OK` + `"ready"` si conexión a PostgreSQL OK
- `503 Service Unavailable` + `"not ready"` si DB no responde

**Usage**: Kubernetes readinessProbe

```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
```

### `GET /health` - Health Check (Full)

**Purpose**: Verificación completa de salud (DB + Redis).
**Response**:

```json
{
  "status": "ok",  // o "error"
  "database": "up", // o "down"
  "redis": "up"     // o "down"
}
```

**HTTP Status**:
- `200 OK` si todo OK
- `503 Service Unavailable` si algo falla

**Usage**: Monitoring (Prometheus, Datadog, uptime checks)

---

## Implementation Details

### Files Modified

- `src/main.rs`: Added health routes, compression, rate limit layer
- `src/middleware/ratelimit.rs`: New file (rate limiting)
- `src/middleware/request_id.rs`: Already created (request tracing)
- `src/middleware/mod.rs`: Export new middleware

### Dependencies

- `tower-http`: Already present, added `limit` feature
- `redis`: Already present (used for pub/sub)

### Performance Impact

- **Rate Limiting**: ~1-2ms extra por request (Redis GET + INCR)
- **Health Checks**: ~1-5ms (DB ping query)

### Notes

- Rate limit middleware is placed **after** CORS but **before** request_id and compression.
- Rate limit keys are **not** namespaced by environment (dev/prod share same Redis). In multi-environment deployments, use separate Redis DBs or key prefixes.
- Anonymous rate limiting currently uses a placeholder. Implement IP extraction from `X-Forwarded-For` or `X-Real-IP` for production.
- Consider increasing limits for `/messages` endpoint if using `typing_start` events heavily (those are separate from message send).

---

## Future Improvements

- [ ] **Token bucket algorithm** instead of INCR for smoother rate limiting
- [ ] **IP-based rate limiting** for anonymous users (extract from headers)
- [ ] **Dynamic rate limits** based on server load (adaptive)
- [ ] **Rate limit exemptions** for certain users (admins, bots)
- [ ] **Quota-based limits** (per server, per user)
- [ ] **Metrics**: Export rate limit metrics to Prometheus (`rate_limit_hits_total`, `rate_limit_exceeded_total`)
- [ ] **Admin API** to query current rate limits for a user/IP

---

*This document covers rate limiting and health checks implementation.*
