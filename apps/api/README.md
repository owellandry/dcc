# DCC API - Discord Clone Backend

API REST + WebSocket para DCC (Discord Clone), escrita en Rust con Axum, PostgreSQL y Redis.

## Stack Tecnológico

- **Lenguaje**: Rust 2021 edition
- **Framework HTTP**: Axum 0.7
- **Base de datos**: PostgreSQL con `sqlx` (migrations en `/migrations`)
- **Cache/Colas**: Redis (pub/sub para eventos en tiempo real)
- **Autenticación**: JWT + OAuth 2.0 (Google, GitHub) + 2FA optional
- **Serialización**: Serde + Serde JSON
- **Validación**: `validator` crate
- **Logging**: `tracing` + `tracing-subscriber`

## Estructura del Proyecto

```
apps/api/
├── src/
│   ├── main.rs              # Punto de entrada, configuración de servidor
│   ├── config.rs            # Gestión de configuración desde .env
│   ├── error.rs             # Tipos de error personalizados
│   ├── state.rs             # Estado compartido (AppState)
│   ├── api/                 # Módulos de endpoints REST
│   │   ├── mod.rs           # Router principal que une todos los endpoints
│   │   ├── auth.rs          # Registro, login, logout, refresh, OAuth
│   │   ├── users.rs         # Perfil de usuario, avatares, banners, 2FA
│   │   ├── servers.rs       # Router de servidores (nested)
│   │   │   ├── servers_crud.rs  # Crear, obtener, actualizar, eliminar
│   │   │   ├── members.rs       # Listar, gestionar miembros
│   │   │   ├── invites.rs       # Crear invites, unirse con código
│   │   │   ├── roles.rs         # CRUD de roles de servidor
│   │   │   ├── channels.rs      # Crear canales en servidor
│   │   │   ├── categories.rs    # Categorías de canales
│   │   │   ├── overwrites.rs    # Permisos por canal/categoría/rol
│   │   │   ├── moderation.rs    # Bans, kicks
│   │   │   └── structure.rs     # Reordenar canales/categorías
│   │   ├── channels.rs      # CRUD de canales directos
│   │   ├── messages.rs      # Enviar, editar, eliminar mensajes, reacciones
│   │   ├── dms.rs           # Listar DMs, abrir/cerrar conversaciones
│   │   ├── friends.rs       # Solicitudes, lista de amigos
│   │   └── link_preview.rs  # Preview de enlaces (OG tags)
│   ├── gateway/
│   │   ├── handler.rs       # WebSocket handler
│   │   └── events.rs        # Tipos de eventos, serialización
│   ├── middleware/
│   │   ├── mod.rs
│   │   └── auth.rs          # Middleware de autenticación JWT
│   ├── models/              # Structs de datos (SQLx)
│   │   ├── mod.rs
│   │   ├── user.rs
│   │   ├── server.rs
│   │   ├── channel.rs
│   │   ├── message.rs
│   │   └── friendship.rs
│   └── services/
│       ├── mod.rs
│       ├── auth.rs          # Lógica de autenticación
│       └── pubsub.rs        # Wrapper de Redis pub/sub
├── migrations/              # Migraciones SQL (sqlx)
├── uploads/                 # Archivos subidos (avatars, banners)
├── .env.example             # Variables de entorno de ejemplo
└── Cargo.toml
```

## Configuración

### Variables de Entorno

Copia `.env.example` a `.env` y configura:

```bash
# Servidor
HOST=0.0.0.0
PORT=8080

# Base de datos
DATABASE_URL=postgres://user:pass@localhost/dcc
REDIS_URL=redis://localhost:6379

# JWT (usaropenssl rand -hex 32 para generar)
JWT_SECRET=tu_clave_secreta_muy_larga_y_segura
ACCESS_TOKEN_EXPIRY_MINUTES=15
REFRESH_TOKEN_EXPIRY_DAYS=30

# CORS (separados por comas)
CORS_ORIGIN=http://localhost:3000,https://tu-app.com
APP_URL=http://localhost:3000
API_URL=http://localhost:8080

# OAuth (opcional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=

# Email (SMTP) - Para verificación de email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=no-reply@example.com
SMTP_PASS=
EMAIL_FROM="DCC <no-reply@example.com>"

# Storage (Cloudflare R2 / S3) - Para uploads en producción
S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_PUBLIC_URL=
```

### Instalación y Ejecución

1. **Iniciar infraestructura (Docker)**:
   ```bash
   docker-compose up -d  # Desde la raíz del repo
   ```

2. **Ejecutar en desarrollo**:
   ```bash
   cargo run
   ```

Servidor escucha en `http://0.0.0.0:8080`:
- API REST: `/v1/...`
- WebSocket: `ws://localhost:8080/ws?token=<accessToken>`
- Archivos estáticos: `/uploads/...`

## API REST - Endpoints

### Autenticación (`/v1/auth`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/register` | Registro con email/password |
| POST | `/auth/login` | Inicio de sesión |
| POST | `/auth/logout` | Cerrar sesión (invalidar refresh token) |
| POST | `/auth/refresh` | Renovar access token |
| POST | `/auth/verify-email` | Verificar email (con código) |
| POST | `/auth/resend-verification` | Reenviar código de verificación |
| GET | `/auth/oauth/google` | Redirige a Google OAuth |
| GET | `/auth/oauth/google/callback` | Callback de Google |
| GET | `/auth/oauth/github` | Redirige a GitHub OAuth |
| GET | `/auth/oauth/github/callback` | Callback de GitHub |

### Usuarios (`/v1/users`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/users/@me` | Obtener perfil propio |
| PATCH | `/users/@me` | Actualizar perfil propio |
| POST | `/users/@me/two-factor/setup` | Generar secreto 2FA |
| POST | `/users/@me/two-factor/enable` | Activar 2FA con código |
| POST | `/users/@me/two-factor/disable` | Desactivar 2FA |
| GET | `/users/:id` | Obtener perfil de otro usuario |
| POST | `/uploads/avatar` | Subir avatar (multipart) |
| POST | `/uploads/banner` | Subir banner (multipart) |

### Servidores (`/v1/servers`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/servers/@me` | Listar servidores del usuario |
| POST | `/servers` | Crear servidor |
| GET | `/servers/:id` | Obtener info del servidor |
| PATCH | `/servers/:id` | Actualizar servidor (nombre, descripción, etc.) |
| DELETE | `/servers/:id` | Eliminar servidor |
| POST | `/servers/:id/icon` | Subir icono del servidor |
| POST | `/servers/:id/banner` | Subir banner del servidor |
| POST | `/servers/:id/categories` | Crear categoría |
| PATCH | `/categories/:id` | Actualizar categoría |
| DELETE | `/categories/:id` | Eliminar categoría |
| POST | `/servers/:server_id/channels` | Crear canal |
| GET | `/servers/:server_id/members` | Listar miembros |
| PUT | `/servers/:server_id/members/:user_id/roles` | Reemplazar roles de miembro |
| POST | `/servers/:server_id/members/:user_id/kick` | Expulsar miembro |
| POST | `/servers/:server_id/bans` | Banear usuario |
| DELETE | `/servers/:server_id/bans/:user_id` | Desbanear |
| POST | `/servers/:server_id/invites` | Crear invite |
| POST | `/servers/:server_id/roles` | Crear rol |
| PATCH | `/roles/:id` | Actualizar rol |
| DELETE | `/roles/:id` | Eliminar rol |
| POST | `/servers/:server_id/structure/reorder` | Reordenar canales/categorías |
| PUT | `/channels/:id/overwrites` | Overwrites de canal |
| PUT | `/categories/:id/overwrites` | Overwrites de categoría |
| GET | `/invites/:code` | Obtener info de invite |
| POST | `/invites/:code/join` | Unirse a servidor con invite |

### Canales (`/v1/channels`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/channels/:id` | Obtener canal |
| PATCH | `/channels/:id` | Actualizar canal (nombre, tema, rate limit) |
| DELETE | `/channels/:id` | Eliminar canal |

### Mensajes (`/v1/messages`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/channels/:channel_id/messages` | Listar mensajes del canal (paginado) |
| POST | `/channels/:channel_id/messages` | Enviar mensaje al canal |
| PATCH | `/messages/:message_id` | Editar mensaje propio |
| DELETE | `/messages/:message_id` | Eliminar mensaje propio |
| POST | `/messages/:message_id/reactions/:emoji` | Añadir reacción |
| DELETE | `/messages/:message_id/reactions/:emoji` | Quitar reacción |

### DMs (`/v1/dms`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/dms` | Listar conversaciones DM |
| POST | `/dms/:user_id` | Abrir DM con usuario |
| DELETE | `/dms/c/:channel_id` | Cerrar DM (archivar) |

### Amigos (`/v1/friends`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/friends` | Lista de amigos |
| POST | `/friends/:user_id` | Enviar solicitud |
| PATCH | `/friends/:user_id` | Aceptar/rechazar solicitud |
| DELETE | `/friends/:user_id` | Eliminar amigo |

### Utilidades

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/utils/link-preview` | Obtener Open Graph preview de URL |

## WebSocket Gateway

**Handshake**: `GET /ws?token=<access_token>`

Una vez conectado, el servidor envía eventos:

### Eventos Recibidos (Cliente → Servidor)

- `message_create`: Enviar mensaje a canal
- `message_edit`: Editar mensaje
- `message_delete`: Eliminar mensaje
- `reaction_add`: Añadir reacción
- `reaction_remove`: Quitar reacción
- `typing_start`: Empezar a escribir
- `typing_stop`: Dejar de escribir
- `presence_update`: Actualizar estado/actividad

### Eventos Enviados (Servidor → Cliente)

- `ready`: Conexión establecida, datos iniciales
- `message_create`: Nuevo mensaje en canal
- `message_edit`: Mensaje editado
- `message_delete`: Mensaje eliminado
- `reaction_add`: Reacción añadida
- `reaction_remove`: Reacción removida
- `typing_start`: Usuario empezando a escribir
- `typing_stop`: Usuario dejó de escribir
- `presence_update`: Estado de usuario cambió
- `server_update`: Info de servidor actualizada
- `channel_update`: Canal modificado
- `member_join`: Miembro entró al servidor
- `member_leave`: Miembro salió

## Modelos de Datos Principales

### User
```rust
id: UUID
username: String
discriminator: String (4 dígitos)
email: String (verificado: bool)
avatar: Option<String> (URL o hash)
banner: Option<String>
status: UserStatus (online/idle/dnd/offline)
bio: Option<String>
two_factor_enabled: bool
created_at, updated_at: DateTime<Utc>
```

### Server
```rust
id: UUID
owner_id: UUID (references User)
name: String
description: Option<String>
icon: Option<String>
banner: Option<String>
default_channel_id: Option<UUID>
default_role_id: Option<UUID>
```

### Channel
```rust
id: UUID
server_id: UUID (opcional, None = DM)
channel_type: ChannelType (Text, Voice)
position: i32
name: String
topic: Option<String>
rate_limit_per_user: Option<i32>
parent_id: Option<UUID> (categoría)
```

### Message
```rust
id: UUID
channel_id: UUID
author_id: UUID (references User)
content: String
edited_at: Option<DateTime<Utc>>
reference_id: Option<UUID> (respuesta a otro mensaje)
```

### Role (servidor)
```rust
id: UUID
server_id: UUID
name: String (ej: "@everyone", "Moderator")
color: i32 (hex)
hoist: bool (separado en sidebar)
position: i32
permissions: i64 (bitfield)
mentionable: bool
```

### Permission Overwrites
Se aplican a:
- Roles (role_id)
- Miembros (member_id → user_id)
A nivel:
- Categoría (category_id)
- Canal (channel_id)

Permisos: bitfield de 53 bits (nombre legible → bit position).

## Sistema de Permisos

Bits de permiso (enumerados en `src/models/permissions.rs` teóricamente, o en lógica de overwrites):

Cada overwrite tiene flags:
- `allow: i64` — bits concedidos explícitamente
- `deny: i64` — bits denegados explícitamente

Cálculo final: `(base_role_permissions & ~deny) | allow`

## Migraciones

Las migraciones están en `/migrations`. Para añadir una nueva:

```bash
sqlx migrate add add_column_to_users
# editar el archivo SQL generado
cargo sqlx prepare  # actualizar cache
```

## Desarrollo

### Hot reload
```bash
cargo install cargo-watch
cargo watch -x run
```

### Testing
```bash
cargo test
```

### Linting
```bash
cargo clippy -- -D warnings
```

### Formato
```bash
cargo fmt
```

## Logs

Los logs usan `tracing`. Niveles (seleccionables con `RUST_LOG`):

- `dcc_api=debug` (por defecto)
- `tower_http=debug` (requests HTTP)
- `dcc_api::gateway=debug` (eventos WS)
- `dcc_api::services::auth=debug`

Ejemplo:
```bash
RUST_LOG=dcc_api=info,tower_http=debug cargo run
```

## Consideraciones de Producción

- **HTTPS**: Usar reverse proxy (Cloudflare, nginx, Caddy) con TLS termination
- **CORS**: Configurar `CORS_ORIGIN` para dominios permitidos
- **JWT_SECRET**: Clave de 256 bits mínima, rotar periódicamente
- **Rate limiting**: Implementar por endpoint si es necesario (tower-middleware)
- **Email**: Configurar SMTP para verificación de email y resets de password
- **Uploads**: En producción, usar S3/Cloudflare R2 (configurar `S3_*` vars)
- **Database**: Usar connection pool (configurado a 20 max)
- **Redis**: Configurar persistencia y replica si es necesario
- **Logging**: Enviar logs a sistema centralizado (Papertrail, Logtail, etc.)
- **Monitoreo**: Configurar métricas (Prometheus + Grafana) para latencia y errores

## Estado del Proyecto

Feature-complete en su ámbito de Discord-clone básico:
- Autenticación completa con 2FA opcional
- Gestión de usuarios (perfil, avatares, banners)
- Servidores, canales, categorías
- Sistema de roles granular
- Permisos por overwrites (miembro/rol × canal/categoría)
- Mensajes + reacciones + edit/delete
- Invites por servidor
- DMs + listado
- Sistema de amigos (solicitudes)
- Presencia + estado (typing, online/idle/dnd)
- WebSocket Gateway para eventos en tiempo real

## API Contract

Para la especificación completa de endpoints (request/response schemas), ver el README del workspace raíz o la documentación OpenAPI (si existe).
