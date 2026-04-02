# TODO - DCC API Backend

Lista de tareas pendientes organizadas por categoría y prioridad.

## 🔥 High Priority

### Seguridad
- [x] **Implementar rate limiting** generalizado
  - [x] Limitar auth endpoints (5 intentos por minuto por IP)
  - [x] Limitar mensajes (10 por segundo por usuario)
  - [x] Limitar uploads (10 por minuto)
  - Implementado: middleware `tower-http::limit` + Redis backend
- [ ] **Auditar JWT implementation**
  - [ ] Revisar algoritmo (actualmente probable HS256)
  - [ ] Asegurar `aud` y `iss` claims si es necesario
  - [ ] Rotación de claves (key id kid)
- [x] **Content moderation básico**
  - [x] Filtro de palabras prohibidas (list estática)
  - [x] Detección de enlaces maliciosos (URL scanner)
  - [ ] Rate limit por canal para anti-spam (pendiente: ya hay rate limit global por endpoint)

### Escalabilidad
- [x] **Redis caching** para datos frecuentes
  - [x] Cache de perfil de usuario (30 min TTL)
  - [x] Cache de servidores (5 min TTL, invalidar en update)
  - [x] Cache de member lists (pendiente: se puede añadir después)
  - Implementado: módulo `services/cache` con invalidación automática
- [x] **Database indexes** faltantes
  - [x] Índice en `messages.created_at DESC` para queries paginadas
  - [x] Índice compuesto en `messages(channel_id, created_at)`
  - [x] Índice en `server_members(user_id, server_id)`
  - [x] Índice en `friendships(requester_id, status)` y `(addressee_id, status)`
  - [x] Índices en `permission_overwrites` ya creados en migración ✅
  - Migración: 0007 ✅
- [x] **Connection pool tuning**
  - [x] Ajustar `max_connections` según RAM disponible (configurable via env)
  - [x] Configurar `idle_timeout` (evitar conexiones zombies)
  - [ ] Añadir `pool.prepare_threshold` para reducir roundtrips

### Bugs/Issues Conocidas
- [ ] **Verificar WebSocket reconexión automática**
  - [ ] Frontend debe detectar cierre WS y re-intentar con backoff
  - [ ] Backend debe limpiar canales Redis订阅 al desconectar
  - [ ] Sincronizar estado tras reconexión (missed events?)
- [ ] **Paginación de mensajes** - confirmar que `before` y `after` usan `created_at`
- [ ] **Uploads en producción** - implementar S3/R2 en lugar de filesystem local
- [ ] **CORS preflight** - manejar OPTIONS requests correctamente (tower-http ya lo hace?)

### Bugs/Issues Conocidas
- [ ] **Verificar WebSocket reconexión automática**
  - [ ] Frontend debe detectar cierre WS y re-intentar con backoff
  - [ ] Backend debe limpiar canales Redis订阅 al desconectar
  - [ ] Sincronizar estado tras reconexión (missed events?)
- [ ] **Paginación de mensajes** - confirmar que `before` y `after` usan `created_at`
- [ ] **Uploads en producción** - implementar S3/R2 en lugar de filesystem local
- [ ] **CORS preflight** - manejar OPTIONS requests correctamente (tower-http ya lo hace?)

---

## 🟡 Medium Priority

### Features Nuevas
- [x] **Search API**
  - [x] `GET /search?q=query&type=(users|servers)` (messages pendiente)
  - [x] Usar PostgreSQL full-text search (tsvector)
  - [ ] Resultados con highlight (pendiente: se devuelve texto plano)
  - Implementado: Funciones SQL `search_users()`, `search_servers()`; índices GIN
- [x] **Threads** (parcial)
  - [x] `messages` tabla añadir `parent_message_id UUID NULL` (migración 0009)
  - [x] Nueva tabla `threads` (id, channel_id, first_message_id, is_archived, timestamps)
  - [x] API: `POST /messages/:id/thread` para crear hilo
  - [x] API: `PATCH /threads/:id/archive`
  - [ ] WS events: `THREAD_CREATE`, `THREAD_UPDATE`, `THREAD_DELETE` (pendiente)
  - [ ] List thread participants/messages (pendiente)
- [ ] **Polls en mensajes**
  - [ ] Añadir campo `poll` (JSONB) en `messages` (question, options[], votes{}, multiple)
  - [ ] Nueva tabla `poll_votes` (message_id, user_id, option_index)
  - [ ] API: `POST /messages/:id/poll/vote`, `GET /messages/:id/poll/results`
  - [ ] Validación: un voto por usuario (o múltiple si multiple_choice)
- [ ] **Scheduled messages**
  - [ ] Añadir `scheduled_at TIMESTAMPTZ NULL` en `messages`
  - [ ] Worker de cron (cada minuto) que publica mensajes scheduled
  - [ ] API: `POST /messages/:channel_id/schedule` con `{ content, scheduled_at }`
  - [ ] Cancelar: `DELETE /messages/:id/scheduled`
- [ ] **Server analytics** (endpoints para owners)
  - [ ] `GET /servers/:id/analytics/messages?period=day|week|month`
  - [ ] `GET /servers/:id/analytics/members?period=...`
  - [ ] `GET /servers/:id/analytics/channels?period=...`
  - Usar materialized views o queries agregados
- [ ] **Bulk operations**
  - [ ] `POST /servers/:id/members/bulk` con `{ userIds: string[], roleIds?: string[] }`
  - [ ] `POST /servers/:id/channels/bulk` con `{ operations: [{op: 'create'|'delete', ...}] }`
  - [ ] Validación: límites (max 100 por request)
- [ ] **Guild templates**
  - [ ] Nueva tabla `guild_templates` (id, server_id, creator_id, name, description, serialized_structure)
  - [ ] Serializar servidor a JSON: channels, categories, roles, overwrites
  - [ ] API: `POST /servers/:id/template`, `GET /templates/:code`, `POST /templates/:code/apply`
- [ ] **Webhooks**
  - [ ] Tabla `webhooks` (id, server_id, creator_id, token, events[], url, enabled)
  - [ ] Dispatcher de eventos async (enqueue en Redis queue o tokio task spawn)
  - [ ] Retry logic con exponential backoff (max 3 intentos)
  - [ ] Signature verification HMAC
  - [ ] `POST /servers/:id/webhooks` (create), `PATCH /webhooks/:id` (edit), `POST /webhooks/:id/test` (ping)
- [ ] **Slash commands** (bots)
  - [ ] Tabla `slash_commands` (id, server_id?, name, description, options JSON, default_permission)
  - [ ] Tabla `slash_command_permissions` (command_id, role_id?, user_id?, allowed)
  - [ ] Endpoint `POST /interactions` para handle interactions (verify signature)
  - [ ] Types: `APPLICATION_COMMAND`, `MESSAGE_COMPONENT`, `MODAL_SUBMIT`
  - [ ] Autocomplete endpoint `GET /commands/autocomplete`
- [ ] **Message stickers** (como Discord)
  - [ ] Tabla `stickers` (id, server_id?, name, url, description, tags)
  - [ ] Campo `sticker_id` en `messages`
  - [ ] Picker UI en frontend
  - [ ] Permisos: quién puede subir stickers?
- [ ] **Forum channels** (canales tipo foro)
  - [ ] Agregar `ForumChannel` subtype (tags, theme, rate_limit)
  - [ ] Tags: crear/editar/eliminar por moderators
  - [ ] Posts: cada thread es un post con tags asociadas
  - [ ] Picker de tags en UI
- [ ] **User notes** (privadas por moderador)
  - [ ] Tabla `user_notes` (id, server_id?, user_id, moderator_id, content, created_at)
  - [ ] CRUD por moderators en ese servidor
  - [ ] API: `GET /servers/:server_id/users/:user_id/notes`, `POST .../notes`, `PATCH .../notes/:id`, `DELETE .../notes/:id`
  - [ ] Permiso: `VIEW_AUDIT_LOG` o similar

### Mejoras Técnicas
- [ ] **OpenAPI spec** generado automáticamente
  - Usar `utoipa` crate o similar
  - Documentar todos los endpoints con doc comments
  - Servir en `/docs` (Swagger UI) y `/openapi.json`
- [ ] **Structured logging** a archivo
  - Configurar `tracing-subscriber` con `fmt::Layer` a rolling file (sentry-tracing o log4rs)
  - JSON format para ingestion en ELK/Grafana Loki
- [ ] **Health checks**
  - `GET /health` → verifica DB y Redis connectivity
  - `GET /ready` → verifica migrations y pool listo
  - `GET /live` → simple 200 OK
- [ ] **Metrics endpoint** (Prometheus)
  - `GET /metrics` con counters: requests_total, duration_seconds, ws_connections, db_pool_wait_time
  - Usar `prometheus` crate
- [ ] **Graceful shutdown**
  - Capturar SIGTERM/SIGINT
  - Cerrar listener, dejar de aceptar nuevas conexiones
  - Esperar conexiones existientes (WS keep-alive timeout)
  - Drain Redis pub/sub, cerrar pool de DB
- [ ] **Request ID tracing**
  - Middleware que genera `x-request-id` si no existe
  - Logging incluye request_id en todos los logs
  - Reutilizar request_id en downstream calls (DB, Redis)

---

## 🟢 Low Priority / Nice to Have

### Features Menores
- [ ] **Message reactions limit** por usuario (max 20 emojis distintos por mensaje)
- [ ] **Channel slowmode improvements** (exempt roles)
- [ ] **User status scheduling** (set status automático por horario)
- [ ] **Custom user profile fields** (JSONB extra: location, social links, birthday)
- [ ] **Server emoji** subida de imágenes, managed por moderators
- [ ] **Invite jump links** (URLs con `?invite=code` que redirigen a login si necesario)
- [ ] **Account swipe links** (conectar múltiples OAuth al mismo usuario)
- [ ] **Password reset flow** (email con token)
- [ ] **Email change verification** (confirmar nuevo email)
- [ ] **Account deletion** (soft-delete con 30 days grace)
- [ ] **Export user data** (GDPR compliance) → ZIP con JSON
- [ ] **Import/Export server** (plantilla JSON completa)

### UX/API improvements
- [ ] **Sorting** en listados: `?sort=name|position|created_at&order=asc|desc`
- [ ] **Filtering** avanzado: `?status=online&q=username`
- [ ] **Bulk ack** para messages (mark many as read)
- [ ] **Read receipts** por canal (last read message id por usuario)
- [ ] **Server insights** (owner-only) - gráficos de activity
- [ ] **Push notifications** (APNs/FCM) para mobile
- [ ] **RSS/Atom feed** para canales públicos
- [ ] **Export/Import** de datos de usuario

---

## 🐛 Bugs / Technical Debt

### Database
- [ ] **Soft deletes** en lugar de borrado físico
  - Añadir `deleted_at TIMESTAMPTZ NULL` a tablas principales
  - Foreign keys con `ON DELETE SET NULL` donde aplica
  - Queries excluyen `WHERE deleted_at IS NULL`
- [ ] **Partitioning** de tabla `messages` por `channel_id` hash (muy grande)
- [ ] **Archive old data** → mover mensajes > 1 año a tabla archive o S3
- [ ] **Vacuum & Analyze** cron job (diario en hora baja)
- [ ] **Reevaluate foreign keys** (algunos ON DELETE CASCADE pueden ser demasiado agresivos)

### API
- [ ] **Duplicate code** en handlers de servidores—refactorizar common patterns
  - Extraer `get_server_with_members` helper
  - Extraer `ensure_member` middleware reusable
- [ ] **Error handling** inconsistente—normalizar a `ApiError` en todos los endpoints
- [ ] **Validation** repetida—crear custom validators reutilizables
- [ ] **Deprecation warnings**—marcar endpoints obsoletos si los reemplazamos
- [ ] **Logging**—añadir contexto (user_id, server_id, channel_id) en todos los logs

### Gateway (WebSocket)
- [ ] **Session cleanup**—al desconectar, limpiar canales Redis suscritos
- [ ] **Event deduplication**—evitar enviar mismo evento múltiples veces
- [ ] **Backpressure handling**—si WS send buffer lleno, drop o bufferizar
- [ ] **Room management**—extraer a struct dedicated `ConnectionManager`
- [ ] **Voice signaling**—proteger con auth (verify target_user_id belongs to channel)
- [ ] **Graceful reconnect**—frontend debe re-suscribirse a topics correctos tras reconnect

### Frontend-related
- [ ] **CORS headers**—permitir `Access-Control-Expose-Headers: X-Request-ID` para debugging
- [ ] **Better 404 handling**—enrutador Axum devuelve JSON no HTML
- [ ] **Upload validation**—file size limits en servidor (no solo frontend), mime type check
- [ ] **Idempotency keys**—para POST endpoints críticos (create message, ban user)
- [ ] **Conditional requests**—ETag/If-None-Match para GETs (cache cliente)

---

## 📚 Documentation

- [ ] **API docs** (OpenAPI/Swagger) — ver métricas técnicas arriba
- [ ] **Database schema diagram** (ERD) en docs/
- [ ] **Architecture decision records (ADRs)** para:
  - [ ] Por qué Rust/Axum sobre Go/FastAPI
  - [ ] Por qué Redis pub/sub sobre RabbitMQ/Kafka
  - [ ] Por qué JWT sobre sesiones server-side
- [ ] **Deployment guide** detallado (Cloudflare Workers, Railway, Fly.io)
- [ ] **Scaling guide** (how to horizontal scale, shard strategy)
- [ ] **Contributing guide** (PR template, code style, commit conventions)
- [ ] **Security policy** (how to report vulnerabilities)

---

## 🧪 Testing

- [ ] **Unit tests**—coverage目标是 > 80%
  - [ ] Test de `auth::verify_access_token` (valido, expirado, malformed)
  - [ ] Test de permisos calculation (`calculate_permissions` helper)
  - [ ] Test de helpers URL (`resolveMediaUrl`, etc)
- [ ] **Integration tests**—con `sqlx::test` y `testcontainers`
  - [ ] Test completo de auth flow (register → login → refresh → logout)
  - [ ] Test de creación de servidor + canales + miembros
  - [ ] Test de permisos (miembro sin permiso no puede enviar mensaje)
  - [ ] Test de bans/kicks
- [ ] **WebSocket tests**
  - [ ] Conexión + identify + ready event
  - [ ] Send typing_start → receives typing_stop timeout
  - [ ] Send message → receives message_create
- [ ] **Load tests**
  - [ ] Simular 1000 concurrent usuarios enviando mensajes
  - [ ] Medir latency P95 y throughput
  - [ ] Identificar cuellos de botella (DB pool, Redis throughput)
- [ ] **Property-based testing** (con `proptest` o `quickcheck`)
  - [ ] Permissions calculation siempre produce allowed ⊆ (base | overwrites)

---

## 📦 Dependencies & Maintenance

- [ ] **Auditar crates** de Cargo.toml—quitar no usados
- [ ] **Update dependencies**—migrar a Axum 0.8 cuando sea estable
- [ ] **Replace `validator`** con `validator.rs` más mantenido o escribir custom
- [ ] **Considerar `deadpool`** sobre `sqlx::Pool` para mejor métricas
- [ ] **Upgrade Redis crate** si nueva versión trae mejoras性能
- [ ] **Monitor security advisories** (`cargo audit` en CI)

---

## Orden de Trabajo Recomendado

**Sprint 1** (2 semanas):
1. Rate limiting
2. DB indexes críticos
3. Health checks + metrics

**Sprint 2** (2 semanas):
1. Search API (full-text search básico)
2. Threads (estructuralmente simple)
3. Caching layer (perfiles + servidores)

**Sprint 3** (3 semanas):
1. Scheduled messages + worker cron
2. Polls (messages JSONB)
3. Bulk operations

**Sprint 4** (2 semanas):
1. Webhooks (essential para integraciones)
2. Slash commands (bots)
3. Audit logs

**Sprint 5** (2 semanas):
1. Server analytics
2. Guild templates
3. Mejoras gateway (session cleanup, dedup)

Post-Sprint:
- Features larger (screen sharing, video channels, stage)
- Mobile/desktop apps (separate project)
- Scaling/multi-region (when traffic justifies)

---

*Actualizado: 2026-03-31*
