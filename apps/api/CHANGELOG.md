# Changelog - DCC API Backend

Todos los cambios notables en la API de DCC serán documentados en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-03-31

### Added
- **Sistema de permisos granular con overwrites** (fd0d15e)
  - Tabla `permission_overwrites` para permisos por canal/categoría
  - Overwrites aplicables a roles (`role_id`) y miembros (`member_id` → `user_id`)
  - Campos `allow_bits` y `deny_bits` (bitfield de 64 bits)
  - Constraints: un overwrite por (category/channel + target_type + target_id)
  - Cálculo de permisos efectivos: `(base_role_permissions & ~deny) | allow`
- **Sistema de roles de servidor** (fd0d15e)
  - CRUD completo: crear, obtener, actualizar, eliminar roles
  - Atributos: nombre, color (hex), posición (ordering), hoist (visible en sidebar), mentionable, managed, default
  - Rol `@everyone` creado automáticamente por migración (permisos base: 3587)
  - Permisos como bitfield de 53 bits (Valor por defecto: VIEW_CHANNEL | SEND_MESSAGES | READ_MESSAGE_HISTORY | CONNECT / SPEAK en voz)
- **Moderación de servidores** (fd0d15e)
  - Tabla `server_bans` para baneos por servidor (con `reason`, `banned_by`, `created_at`)
  - Endpoint `POST /servers/:server_id/bans` — Banear usuario
  - Endpoint `DELETE /servers/:server_id/bans/:user_id` — Desbanear
  - Nuevo módulo `servers/moderation.rs` con handlers
  - Integración en `ServerSettingsModal` > pestaña Moderation
- **Gestión mejorada de categorías** (fd0d15e)
  - Overwrites de categoría (PUT `/categories/:id/overwrites`)
  - Campos: `name`, `position`, `icon_key` (nuevo en migración)
  - Ordenamiento de categorías (position)
- **API de estructura de servidores** (fd0d15e)
  - Endpoint `POST /servers/:server_id/structure/reorder` para reordenar canales y categorías
  - Body: `{ categories?: [{id, position}], channels?: [{id, position, categoryId?}] }`
  - Permite mover canales entre categorías (categoryId null = sin categoría)
- **Mejoras en autenticación** (fd0d15e)
  - **OAuth 2.0** con Google y GitHub
    - Endpoints: `/auth/oauth/google`, `/auth/oauth/google/callback`, `/auth/oauth/github`, `/auth/oauth/github/callback`
    - Configurable con `GOOGLE_CLIENT_*`, `GITHUB_CLIENT_*` en .env
    - Login automático post-OAuth, linking de cuentas existentes
  - **Two-Factor Authentication (2FA)** opcional
    - Setup: `POST /users/@me/two-factor/setup` → genera secreto TOTP, URL otpauth, QR code data URL
    - Enable: `POST /users/@me/two-factor/enable` con código TOTP + contraseña actual
    - Disable: `POST /users/@me/two-factor/disable` con código TOTP + contraseña actual
    - Campos en tabla `users`: `two_factor_secret`, `two_factor_backup_codes`
    - Validación en login: requiere `twoFactorCode` si 2FA habilitado
  - **Verificación de email** con códigos únicos (tabla `email_verifications` implícita)
    - Endpoint `POST /auth/verify-email` con token
    - Endpoint `POST /auth/resend-verification` para reenviar
- **Mejoras en gestión de miembros** (fd0d15e)

### Added (2026-04-01)
- **Full-text Search API** (`GET /v1/search`)
  - Búsqueda de usuarios y servidores con PostgreSQL `tsvector`
  - Ordenamiento por relevancia (`ts_rank`)
  - Filtrado por tipo: `users`, `servers`, o `all`
  - Paginación con `limit` y `offset`
  - Funciones SQL: `search_users()`, `search_servers()`
- **Redis Caching Layer**
  - Cache de servidores (TTL 5 min) con invalidación automática
  - Cache de perfiles de usuario (TTL 30 min)
  - Invalidación en updates: servidor, avatar, banner, member count changes
  - Módulo `services/cache` con `get_or_fetch_*` helpers
- **Content Moderation (Básico)**
  - Filtro de palabras prohibidas (lista configurable)
  - Detección y bloqueo de URLs maliciosas
  - Validación integrada en endpoint `POST /channels/:id/messages`
  - Módulo `services/moderation`
- **Performance Improvements**
  - Optimización de logging: spans incluyen `request_id` y `user_id`
  - Mejor manejo de errores en gateway (eliminado `unwrap()` críticos)
  - Invalidación de cache coordinada entre servicios
  - Asignación de roles: `PUT /servers/:server_id/members/:user_id/roles` (reemplaza lista de role_ids)
  - Kick de miembros: `POST /servers/:server_id/members/:user_id/kick`
  - Listado de miembros: `GET /servers/:server_id/members` con paginación
  - Inclusión de `user` dentro de `ServerMember` en responses
- **Invitaciones a servidores mejoradas** (fd0d15e)
  - Creación: `POST /servers/:server_id/invites` con opciones `expiresInSeconds`, `maxUses`
  - Código de invite único por servidor (o múltiples invites en futuro)
  - Join: `POST /invites/:code/join` crea membership automáticamente
  - Info de invite: `GET /invites/:code` devuelve `{ server, inviteCode }`
  - Integración en `ServerSettingsModal` > pestaña Invites
- **Sistema de canales mejorado** (fd0d15e)
  - Nuevos tipos en tabla `channels`: icon_key, is_nsfw, rate_limit_per_user (slowmode)
  - Actualización de nombre y topic: PATCH `/channels/:id`
  - Overwrites de canal: PUT `/channels/:id/overwrites`
  - Server channels: POST `/servers/:server_id/channels` con parámetros `name`, `type`, `categoryId`, `topic`, `iconKey`, `isNsfw`, `slowmodeSeconds`
- **Endpoint de link preview mejorado** (fd0d15e)
  - GET `/utils/link-preview` devuelve Open Graph metadata: `title`, `description`, `image`, `siteName`, `hostname`
  - Cache en backend (Redis) si es necesario
- **WebSocket Gateway mejorado** (fd0d15e, 5f8ce3e)
  - Eventos de typing: `typing_start`, `typing_stop` (broadcast a canal)
  - Eventos de presence: `presence_update` (status, custom_status, actividades)
  - Eventos de servidor/canal: `server_update`, `channel_update`, `member_join`, `member_leave`
  - Mejor manejo de rooms y broadcast (por canal, por servidor, global)
  - Corrección de URL de WS para producción con `NEXT_PUBLIC_WS_URL` correcto
- **Configuración de producción mejorada** (5f8ce3e, 25afc2e)
  - Variables `APP_URLS` y `API_URLS` para múltiples orígenes
  - Lógica de selección de URL primaria (prefiere HTTPS público)
  - CORS origins normalizados (merge automático de APP_URL en CORS_ORIGIN)
  - Normalización de URLs: strip trailing slashes, scheme-only authority, manejo de private IPs
- **Migraciones de base de datos** (fd0d15e)
  - Migración `0006_server_permissions.sql`:
    - Añade columnas a `roles`: `is_mentionable`, `is_default`
    - Añade columna a `channels`: `icon_key`
    - Crea tabla `permission_overwrites` con índices unique parciales
    - Crea tabla `server_bans`
    - **Seed**: crea rol `@everyone` por servidor si no existe
    - **Seed**: crea overwrites por defecto deny de `SEND_MESSAGES` en categorías "información/info"
- **Mejoras en errores y validación** (fd0d15e)
  - Detallado de errores de validación con `validator` crate (field-level errors)
  - Respuestas de error estandarizadas: `{ error: { code, details: [{field, message}] } }`
  - Mejor logging en handlers con `tracing`
- **Servicio de upload optimizado** (fd0d15e)
  - Uploads de avatares y banners con multer (axum::extract::multipart)
  - Almacenamiento local en `uploads/` (desarrollo) o S3/R2 (producción según `S3_*` vars)
  - URLs resueltas dinámicamente vía `resolveMediaUrl` en frontend
- **Performance y SEO** (fd0d15e)
  - Consola de gateway optimizada: menos allocations, batching de eventos
  - Queries N+1 reducidas en listados de servidores/miembros (JOINs apropiados)
  - Índices en tablas nuevas: `permission_overwrites` sobre `server_id`, `category_id`, `channel_id`

### Fixed
- **WebSocket URL en producción** (5f8ce3e)
  - `ws_handler` ahora respeta `config.ws_url` (o deriva de `api_url`)
  - Fallback a `wss://` si `https://` detectado
  - El frontend usa `NEXT_PUBLIC_WS_URL` correcto
- **Anclaje del directorio de trabajo** (b3d7293)
  - `main.rs` establece `CARGO_MANIFEST_DIR` como CWD para rutas relativas (migrations, uploads)
  - Funciona desde workspace root o API crate aislado
- **Routes de servidores** (b3d7293)
  - Correcciones en `servers/channels.rs` y `servers/roles.rs` para paths correctos
  - Redirección a `/ws` con query param `token` correcto
- **CORS origin handling** (25afc2e)
  - `config.rs` normaliza orígenes CORS (quita trailing slashes, paths)
  - Mix de `AllowOrigin::exact` vs `AllowOrigin::list` según número de orígenes
  - `credentials: true` requiere origins explícitos (no wildcard)
- **Production config normalization** (25afc2e, 5f8ce3e)
  - Unificación de `app_urls`, `api_urls`, `cors_origins` en `Config`
  - Función `pick_primary_url` para elegir URL canónica (prioriza HTTPS público)
  - Detección de IPs privadas/loopback para dev vs prod behavior

### Removed
- **Código muerto en gateway** (fd0d15e)
  - Simplificación de `handler.rs`, remoción de eventos no utilizados
  - Consolidación de tipos de eventos en `events.rs`

---

## [0.1.0] - 2026-03-28 (Initial Release)

### Added
- **Axum 0.7 HTTP server** (f2f0ed3)
  - Router en `/v1` para API REST
  - Endpoint `/ws` para WebSocket Gateway
  - Static serving en `/uploads` (avatars, banners)
  - Middlewares: CORS, Trace, Timeout (30s)
- **Base de datos PostgreSQL** (f2f0ed3, fd0d15e)
  - `sqlx` con `postgres` + `uuid` + `json` features
  - Pool de 20 conexiones máximo
  - Migraciones automáticas en startup (`sqlx::migrate!`)
- **Redis pub/sub** (f2f0ed3)
  - `redis::aio::ConnectionManager` para pub/sub
  - Usado en Gateway para broadcast de eventos
- **Autenticación JWT** (f2f0ed3 → fd0d15e)
  - `jsonwebtoken` para access tokens (15 min exp) y refresh tokens (30 días)
  - Refresh token en cookie HTTP-only (`Set-Cookie` con `HttpOnly`, `Secure`, `SameSite=Strict`)
  - Login, registro, logout, refresh endpoints
  - Middleware `auth::require_auth` para proteger rutas
  - Middleware `auth::optional_auth` para rutas que aceptan anónimos
- **Modelos de datos SQLx** (f2f0ed3 → fd0d15e)
  - Tablas principales: `users`, `servers`, `channels`, `messages`, `friendships`, `server_members`
  - Tabla de关系中多: `message_reactions`, `channel_category` (implícita en categories), `permission_overwrites`, `server_bans`
  - UUIDs como primary keys
  - Timestamps: `created_at`, `updated_at` (auto-set en triggers o Rust)
  - Foreign keys con `ON DELETE CASCADE` apropiado
- **API endpoints básicos** (f2f0ed3)
  - Auth: `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh`
  - Users: `/users/@me`, `/users/:id`, `/uploads/avatar`, `/uploads/banner`
  - Servers: CRUD básico, listado `GET /servers/@me`
  - Canales: `GET /channels/:id`, `PATCH /channels/:id`, `DELETE /channels/:id`
  - Mensajes: listar y enviar en canal, editar/eliminar, reacciones
  - DMs: listar, abrir, cerrar
  - Friends: listar, enviar/aceptar/declinar/eliminar solicitudes
  - Link preview: `GET /utils/link-preview`
- **WebSocket Gateway** (f2f0ed3 → fd0d15e)
  - Handshake: `GET /ws?token=<accessToken>` valida JWT
  - Conexión upgrades a WebSocket (tungstenite/axum::ws)
  - **Eventos recibidos**:
    - `message_create`, `message_edit`, `message_delete`
    - `reaction_add`, `reaction_remove`
    - `typing_start`, `typing_stop` (fd0d15e)
  - **Eventos enviados**:
    - `ready` con datos iniciales (user, servers, channels, friends)
    - `message_create`, `message_edit`, `message_delete`
    - `reaction_add`, `reaction_remove`
    - `typing_start`, `typing_stop`
    - `presence_update` (fd0d15e)
  - Broadcast por canal (`channel_id`) o servidor según evento
- **Configuración por entorno** (f2f0ed3 → 25afc2e)
  - `Config` struct desde `.env`
  - Variables: `HOST`, `PORT`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `CORS_ORIGIN(S)`, `APP_URL(S)`, `API_URL(S)`, OAuth vars
  - Normalización de URLs (strip trailing slash, scheme parsing)
  - Detección de IPs locales/privadas para dev behavior
- **Logging y monitoreo** (f2f0ed3)
  - `tracing-subscriber` con `EnvFilter`
  - Log levels: `dcc_api`, `tower_http`, `dcc_api::gateway`
  - JSON o pretty según config
- **Error handling estandarizado** (f2f0ed3 → fd0d15e)
  - `error.rs` con `ApiError`, `Result<T>` type alias
  - `thiserror` para errores específicos
  - Respuestas JSON consistentes `{ error: { code, message, details? } }`
  - Mapeo de errores de BD, validación, auth, not found
- **Validación de inputs** (f2f0ed3)
  - `validator` crate en structs de request (ej: `RegisterRequest`, `UpdateProfile`)
  - Constraints: email format, password length, username characters
  - Personal errors para campos requeridos
- **Servicios modulares** (f2f0ed3)
  - `services/auth.rs` — lógica de login, registro, tokens
  - `services/pubsub.rs` — wrapper de Redis pub/sub para gateway
- **Middleware de autenticación** (f2f0ed3)
  - `middleware/auth.rs` — extrae token de `Authorization: Bearer`, valida JWT
  - Sets `extensions` con `user_id`
- **Archivos estáticos** (f2f0ed3)
  - `/uploads/*` servidos por `tower_http::services::ServeDir`
  - Subida de avatares/banners con nombres únicos (`uuid_v4()` + original extension)

---

## [0.0.1] - 2026-02 (Prehistory)

### Added
- **Primer esqueleto de Axum**
- **Conexión a PostgreSQL básica**
- **Configuración inicial de proyecto**

---

## Commit Reference

| Hash | Type | Description | Files Changed |
|------|------|-------------|---------------|
| fd0d15e | feat | roles, permissions, server moderation and frontend improvements | 23 files (2564 ins/793 del) |
| 5f8ce3e | fix | correct WebSocket URL and production config for Cloudflare deployment | 3 files (174 ins/12 del) |
| 25afc2e | fix | update production URLs and CORS origin normalization | 2 files (26 ins/4 del) |
| b3d7293 | fix | anchor working directory to API crate and patch server routes | 3 files (9 ins/6 del) |
| e225e70 | chore | remove unused patch-wrangler script | 1 file |
| a4938fc | docs | rewrite README with full project overview | 2 files |
| f2f0ed3 | feat | Initial commit — Discord clone (DCC) full-stack | 50+ files |

---

## Notas importantes

### Sistema de Permisos (fd0d15e)

El sistema de permisos se basa en **bitfields** de 64 bits:

- Cada permiso tiene un bit position (0–52, 53 permisos definidos actualmente)
- `Role.permissions` es el bitfield base para ese rol
- `PermissionOverwrite` tiene `allow_bits` y `deny_bits`
- Cálculo por canal/categoría por usuario:
  1. Obtener roles del usuario en el servidor
  2. Base = OR de `permissions` de todos los roles
  3. Aplicar overwrites de roles: `base = (base & ~deny) | allow`
  4. Aplicar overwrites de miembro (si existen): sobreescribe paso 3
  5. Resultado = Permisos efectivos

Bits definidos (ver código fuente en `src/models/` o comments en `overwrites.rs`):
```rust
const VIEW_CHANNEL: i64 = 1 << 0;      // Ver canal/categoría
const SEND_MESSAGES: i64 = 1 << 1;    // Enviar mensajes
const SEND_TTS_MESSAGES: i64 = 1 << 2;
const MANAGE_MESSAGES: i64 = 1 << 3;   // Eliminar/editar mensajes ajenos
const EMBED_LINKS: i64 = 1 << 4;
const ATTACH_FILES: i64 = 1 << 5;
const READ_MESSAGE_HISTORY: i64 = 1 << 6;
const MENTION_EVERYONE: i64 = 1 << 7;
const USE_EXTERNAL_EMOJIS: i64 = 1 << 8;
const VIEW_GUILD_INSIGHTS: i64 = 1 << 9;
const CONNECT: i64 = 1 << 10;          // Conectar a canal de voz
const SPEAK: i64 = 1 << 11;            // Hablar en voz
const MUTE_MEMBERS: i64 = 1 << 12;
const DEAFEN_MEMBERS: i64 = 1 << 13;
const MOVE_MEMBERS: i64 = 1 << 14;
const USE_VAD: i64 = 1 << 15;          // Voice Activity Detection
const PRIORITY_SPEAKER: i64 = 1 << 16;
// ... etc hasta 52
```

### Migraciones

Para agregar una nueva migración:

```bash
cd apps/api
sqlx migrate add add_something_new
# editar .sql
cargo sqlx prepare  # actualizar cache .sqlx/
```

**IMPORTANTE**: Las migraciones son secuenciales y atómicas. No editar migraciones ya aplicadas en producción.

### Deploy en Cloudflare Workers (b3d7293, 5f8ce3e)

- **Build**: `vinext build` produce assets en `dist/`
- **Deploy**: `npx wrangler deploy` (o `npm run deploy`)
- **Entrypoint**: Worker script debe ser `dist/index.js` o similar (ver `wrangler.toml`)
- **Bindings**: Configurar `KV`, `D1`, `R2` en `wrangler.toml` si se usan
- **Environment vars**: Usar `wrangler secret put VAR_NAME` o `wrangler.toml [vars]`
- **Limitations**: 
  - Workers tienen límites de CPU/time (30s CPU por request)
  - Postgres debe ser externo (Cloudflare D1 o RDS Supabase, Neon)
  - Redis externo (Upstash, Cloudflare KV con pub/sub limitado)

### API Versioning

La API está versionada en `/v1`. Cambios backwards-incompatible deben bump de versión mayor (`/v2`).

Para cambios menores (nuevos endpoints, campos adicionales), mantener `/v1`.

### Rate Limiting

Actualmente **no implementado**. Considerar agregar `tower-http` limit middleware o Redis-based rate limiter si se expose al público.

### Testing

No hay tests unitarios/integración configurados. Sugerido:
- `cargo test` con `sqlx::test` para tests contra DB temporal
- Mock de Redis para tests de gateway
- API integration tests con `wiremock` o testcontainers

---

Para más detalles sobre el deployment y configuración, ver `README.md` en este directorio.
