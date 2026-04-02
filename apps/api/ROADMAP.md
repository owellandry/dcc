# Roadmap - DCC API Backend

Visión de largo plazo para la API de DCC. Este documento describe los objetivos de desarrollo organizados por horizonte temporal.

## Estado Actual (v0.1.0)

✅ **Completado**:
- Autenticación completa (JWT + OAuth + 2FA)
- Sistema de servidores, canales, categorías
- Roles y permisos granulares con overwrites
- Mensajería en tiempo real via WebSocket
- Moderación (bans, kicks)
- Sistema de amigos y DMs
- Presence y typing indicators
- Voice signaling (WebRTC relay)
- Uploads de avatares/banners

---

## Objetivos a Corto Plazo (1-2 meses)

### Feature Completeness
- [ ] **Search**: Búsqueda global de usuarios y servidores
  - `GET /search?q=<query>` con resultados mixtos
  - Índices de texto en PostgreSQL (GIN)
- [ ] **Threads**: Hilos de conversación dentro de canales
  - Tabla `threads` vinculada a `messages` (parent_message_id)
  - Operaciones: archivar, desarchivar, seguir/unfollow
- [ ] **Polls**: Encuestas en mensajes
  - Campo `poll` en `messages` (JSON: question, options, votes, multiple_choice)
  - Eventos de voto en tiempo real
- [ ] **Guild Templates**: Plantillas de servidores
  - CRUD de templates (exportar/importar estructura)
  - `POST /servers/:id/template` → generaplantilla

### Mejoras de Performance
- [ ] **Caching layer** con Redis más agresivo
  - Cache de servidores populares (TTL 5min)
  - Cache de user profiles (30min)
  - Invalidation automático ante cambios
- [ ] **Database query optimization**
  - Índices compuestos para queries frecuentes
  - Materialized views para member counts, last message
  - Connection pool tuning (idle timeout, max_lifetime)
- [ ] **WebSocket batching**
  - Agrupar eventos tipo typing en lotes de 100ms
  - Throttling de presence updates (max 1 por segundo por usuario)

### Seguridad y Producción
- [ ] **Rate limiting** por endpoint/IP/user
  - Implementar `tower-http` limit middleware + Redis storage
  - Límites: auth (5/min), messages (10/sec), uploads (10/min)
- [ ] **Content moderation** (opcional)
  - Palabras prohibidas (filtro de texto)
  - Reportes de usuario/mensaje
  - Automod: spam detection, raid protection
- [ ] **Audit logging**
  - Tabla `audit_logs` con: actor_id, action, target_type, target_id, metadata
  - Log de cambios importantes (ban, delete channel, role edit)

---

## Objetivos a Mediano Plazo (3-6 meses)

### Feature Updates
- [ ] **Scheduled messages**: Mensajes programados
  - Campo `scheduled_at` en `messages`
  - Worker de cron que dispara a la hora programada
  - Cancelación/edición hasta envío
- [ ] **Advanced permissions**: Permisos más finos
  - Permisos por categoría de edad (NSFW)
  - Permisos de aplicación (external apps, integrations)
  - Auditoría de cambios de permisos
- [ ] **Server analytics**: Métricas de servidor
  - Mensajes por día, miembros activos, canales más activos
  - Dashboard endpoints para owners
- [ ] **Bulk operations**: Operaciones en lote
  - `POST /servers/:id/members/bulk` (añadir múltiples)
  - `POST /servers/:id/channels/bulk` (crear/delete múltiples)
  - `POST /roles/:id/permissions/bulk` (asignar permisos)

### Voice & Media
- [ ] **Screen sharing**: Compartir pantalla en voz
  - Video track WebRTC adicional
  - Señalización de video en `VOICE_SIGNAL`
  - UI toggle en frontend
- [ ] **Video channels**: Canales de video
  - Tipo de canal `video` (además de `text`, `voice`)
  - Multiparty WebRTC (SFU approach)
  - Grid view de participantes
- [ ] **Media transcoding** (backend)
  - Servicio de transcodificación de audio (ffmpeg) para normalizar formatos
  - Opcional: transcodificación de video (costoso)

### Integraciones & Extensibilidad
- [ ] **Webhooks**: Hook de eventos a URLs externas
  - `POST /webhooks/:token/payload` para recibir eventos
  - Eventos suscritos por webhook configurable
  - Retry con backoff, signature verification
- [ ] **Slash commands** (bot-like)
  - Registro de commands en BD
  - Interceptor global `/` en mensajes
  - Autocomplete de comandos
  - Por servidor o global
- [ ] **Application commands** (como Discord)
  - Comandos de usuario (/user) y de aplicación (/app)
  - Subcomandos, opciones (string, integer, boolean, channel, user)
  - Interactions con ACK + followup messages

---

## Objetivos a Largo Plazo (6+ meses)

### Escala y Confiabilidad
- [ ] **Horizontal scaling** con stateless API
  - Separar WebSocket gateway por shard (por usuario hash)
  - Redis shared state entre workers
  - Load balancer sticky sessions o connection routing
- [ ] **Multi-region deployment**
  - DB replicas (read replicas para queries)
  - Redis cluster o sentinel
  - Edge deployment de frontend + API routing
- [ ] **Database sharding** (si escala massive)
  - Shard por guild_id o user_id
  - Cross-shard queries limitadas
  - Migration strategy

### Features Competitivas
- [ ] **Stage channels**: Canales de escenario (eventos en vivo)
  - Permisos especiales: manage stage, create events
  - Event scheduling con fecha/hora
  - Auto-pause cuando no hay speakers
- [ ] **Events platform**: Calendario de eventos
  - Creación de eventos (título, descripción, fecha, recurrencia)
  - RSVP (going/maybe/not)
  - Reminders automáticos
- [ ] **Monetización** (opcional)
  - Nitro-like: emojis personalizados, HD uploads, animated avatars
  - Server boosting: perks de servidor (más emoji slots, calidad audio)
  - Pagos integrados (Stripe/PayPal)
- [ ] **Marketplace**: Apps y integraciones
  - OAuth2 server-side (para bots/integraciones)
  - App directory por servidor
  - API tokens con scopes

### Mobile & Desktop
- [ ] **React Native app** (o Expo)
  - Reutilización de lógica de negocio (API client igual)
  - Native WebSocket handling
  - Push notifications (APNs, FCM)
- [ ] **Electron desktop app**
  - Notificaciones nativas
  - Auto-start, tray icon
  - Voice input nativo
- [ ] **PWA enhancements**
  - Offline mode (cache de mensajes recientes)
  - Background sync
  - Installability metrics

---

## Mejoras Técnicas (Sprint Técnico Continuo)

### Database
- [ ] Migrar a `uuid` deentes la mayoría (ya usan)
- [ ] Particionar tablas grandes (`messages` por `channel_id` + time)
- [ ] Archive old messages a storage frío (S3) después de 1 año
- [ ] Implementar soft-deletes (deleted_at) para recovery

### API
- [ ] **OpenAPI/Swagger spec** generada automáticamente
- [ ] **GraphQL endpoint** alternativo (opcional)
- [ ] **gRPC-Web** para servicios internos (microservicios futuros)
- [ ] **Request validation** mejorada (custom validators)
- [ ] **Response compression** (brotli/gzip) — ya en tower-http

### Observability
- [ ] **Metrics** (Prometheus exporter)
  - Request latency, throughput, error rates
  - WebSocket connections count, messages/sec
  - Redis latency, DB pool stats
- [ ] **Tracing** (OpenTelemetry)
  - Traces across services (API → DB → Redis)
  - Sampling策略
- [ ] **Structured logging** aarchivo + syslog + Stackdriver

### Testing
- [ ] Unit tests (cargo test) coverage > 80%
- [ ] Integration tests (testcontainers-rs para Postgres/Redis)
- [ ] End-to-end API tests (con reqwest)
- [ ] Load testing (k6 o artillery) → 10k concurrent WS connections

### CI/CD
- [ ] GitHub Actions: test, clippy, fmt, build
- [ ] Automatic releases (git tag → cargo publish + docker push)
- [ ] Security scanning (cargo audit, osv-scanner)
- [ ] Dependency updates (dependabot/config)

---

## Ideas & Requests (Backlog)

**De la comunidad**:
- Voice activity detection (VAD) con métricas
- Nitro-like nitro features (custom emojis, animated avatars)
- Server discovery / directorio público
- Content filters (imágenes, lenguaje)
- Export/import de datos (GDPR compliance)
- Admin panel para moderación global
- Advanced admin tools (sudo, impersonation)
- User notes (privadas por moderator)
- Timeout/mute temporal (no solo ban/kick)
- Message stickers y GIFs integrados
- Collaborative whiteboard (canvas compartido)
- Code snippets con syntax highlighting
- Integrated voice messages
- File attachments con previews (PDF, video thumbnails)
- Server-wide announcements (pin en todos canales)
- Mass @everyone/@here con rate limit
- Integration IFTTT/Zapier
- RSS/Atom feed de canales
- Calendario integrado (Google Calendar sync)
- Voting/polls en canales (ya mencionado)
- Eventos de servidor con recordatorios

---

## Priorización

**High**:
1. Search (utilidad básica)
2. Threads (Discord esencial)
3. Rate limiting (seguridad)
4. Audit logs (compliance)
5. Caching (performance)

**Medium**:
1. Scheduled messages
2. Bulk operations
3. Screen sharing
4. Webhooks
5. Slash commands

**Low**:
1. Monetización features
2. Marketplace
3. Multi-region (aún temprano)
4. Stage channels (nicho)

---

## Dependencias y Bloqueos

- **Search** requiere full-text search en PostgreSQL (pg_trgm, tsvector) o Elasticsearch/Meili
- **Threads** requiere修改 messages schema y new table `thread_participants`
- **Polls** necesita campo JSONB en messages y votes table
- **Screen sharing** requiere cambios frontend significativos + WebRTC data channels
- **Rate limiting** necesita Redis keys con TTL; elegir algoritmo (token bucket, fixed window)
- **Webhooks** requiere background queue worker (no bloquear response)
- **Slash commands** requiere parser y dispatcher pattern

---

## Métricas de Éxito

- API availability > 99.9%
- P95 latency < 200ms para REST, < 50ms para WS events
- Concurrent WS connections > 10,000 por instancia
- Message delivery < 100ms (p99)
- Search results en < 500ms para índices optimizados

---

*Este roadmap es vivo. Se actualiza quarterly o tras releases mayores.*
