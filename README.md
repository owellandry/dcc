# DCC — Discord Clone

Clon funcional de Discord construido full-stack desde cero, sin servicios externos. Replica las funcionalidades principales de Discord: servidores, canales, mensajería en tiempo real, llamadas de voz, DMs, amigos y presencia de usuarios.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js · React · Zustand · Tailwind CSS |
| Backend | Rust · Axum · SQLx |
| Base de datos | PostgreSQL 16 |
| Caché / Pub-Sub | Redis 7 |
| Deploy frontend | Cloudflare Workers (Wrangler) |

## Funcionalidades

### Autenticación
- Registro con verificación por email
- Login con email o username
- Autenticación en dos pasos (TOTP) con códigos de respaldo
- OAuth con Google y GitHub
- JWT de corta duración (15 min) + refresh token en cookie `httpOnly` (30 días)
- Auto-refresh transparente en el cliente ante errores 401

### Servidores y canales
- Creación de servidores con categorías y canales por defecto
- Canales de texto y de voz
- Gestión de canales y categorías (crear, editar, eliminar)
- Sistema de invitaciones con código y configuración de expiración/usos
- Lista de miembros con badge de propietario

### Mensajería
- Chat en tiempo real con scroll hacia atrás paginado
- Respuestas a mensajes con conector visual estilo Discord
- Edición y eliminación de mensajes
- Reacciones con emojis
- Indicador de typing
- Previsualizaciones de enlaces (Open Graph)
- Adjuntos y sistema de renderizado de attachments

### Voz
- Canales de voz con join/leave en tiempo real
- Seguimiento de participantes en Redis
- Señalización WebRTC relayada por el servidor
- Snapshots del estado de voz al conectarse

### Mensajes directos y amigos
- DMs entre usuarios (apertura, cierre)
- Sistema de amigos: solicitudes, aceptar, rechazar, bloquear

### Presencia
- Estados: online, idle, dnd, offline
- Sincronización en tiempo real vía WebSocket
- Estado de voz y micrófono/auriculares silenciados

### Perfil y configuración
- Avatar y banner de usuario (uploads locales)
- Bio, estado personalizado
- Configuración de privacidad, notificaciones, apariencia
- Customizador de tema visual
- Badges de usuario

### Gateway WebSocket
Implementación del protocolo de Discord con opcodes:

| Opcode | Nombre | Descripción |
|--------|--------|-------------|
| 0 | IDENTIFY | Autenticación del cliente |
| 1 | HEARTBEAT | Keep-alive |
| 10 | HELLO | Bienvenida con intervalo de heartbeat |
| 11 | READY | Estado inicial completo (usuario, servidores, DMs) |
| — | DISPATCH | Eventos en tiempo real |

Eventos soportados: `MESSAGE_CREATE/UPDATE/DELETE`, `REACTION_ADD/REMOVE`, `TYPING_START`, `PRESENCE_UPDATE`, `GUILD_*`, `CHANNEL_*`, `FRIEND_REQUEST/UPDATE`, `VOICE_USER_JOINED/LEFT`, `VOICE_SIGNAL`, `VOICE_STATE_SNAPSHOT`.

## Estructura del proyecto

```
dcc/
├── apps/
│   ├── api/          # Backend Rust (Axum + SQLx)
│   │   ├── src/
│   │   │   ├── api/        # Handlers REST por dominio
│   │   │   ├── gateway/    # WebSocket gateway
│   │   │   ├── models/     # Tipos de base de datos
│   │   │   ├── services/   # Auth, pub/sub
│   │   │   └── middleware/ # JWT auth extractor
│   │   └── migrations/     # Migraciones SQL
│   └── web/          # Frontend Next.js
│       └── src/
│           ├── app/        # Rutas Next.js (App Router)
│           ├── components/ # Componentes por dominio
│           ├── hooks/      # WebSocket, mensajes, voz
│           ├── stores/     # Estado global (Zustand)
│           └── lib/        # API client, tipos, utilidades
├── docker-compose.yml
└── turbo.json
```

## Puesta en marcha

### Requisitos
- Rust (edición 2021+)
- Node.js + pnpm
- Docker (para PostgreSQL y Redis)

### 1. Levantar infraestructura

```bash
docker compose up -d
```

### 2. Backend

```bash
cd apps/api
cp .env.example .env   # configurar variables
cargo run
```

El servidor escucha en `http://localhost:8080`. Las migraciones se aplican automáticamente al arrancar.

Variables de entorno requeridas:

```env
DATABASE_URL=postgres://dcc:dcc_secret@localhost:5432/dcc
JWT_SECRET=tu_secreto_aqui
REDIS_URL=redis://localhost:6379
```

### 3. Frontend

```bash
pnpm install
pnpm dev
```

La app estará en `http://localhost:3000`.

Variables de entorno del frontend (`.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
```

## API

Todos los endpoints bajo `/v1`. Autenticación con `Authorization: Bearer <token>`.

Formato de respuesta estándar:

```json
{ "data": { ... } }
```

Respuesta paginada:

```json
{
  "data": [...],
  "meta": { "hasMore": true, "nextCursor": "...", "prevCursor": null }
}
```

Error:

```json
{ "error": { "code": "UNAUTHORIZED", "message": "..." } }
```
