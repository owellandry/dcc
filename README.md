# DCC Backend Contract (basado en el frontend actual)

Este documento resume las interacciones que el backend debe soportar para que el frontend actual funcione correctamente.

## 1) Contexto técnico actual

- Frontend: Next.js + React + Zustand.
- Base URL HTTP esperada: `http://localhost:8080/v1` (configurable con `NEXT_PUBLIC_API_URL`).
- URL WebSocket esperada: `ws://localhost:8080/ws` (configurable con `NEXT_PUBLIC_WS_URL`).
- Autenticación:
  - Access token en memoria (Bearer).
  - Refresh token en cookie `httpOnly` (se envía con `credentials: 'include'`).
  - Auto refresh en `401` desde el cliente.

## 2) Contrato de respuesta estándar

El frontend espera:

- Respuesta normal:
  - `ApiResponse<T>`:
    - `data: T`
    - `meta?: Record<string, unknown>`
- Respuesta paginada:
  - `PaginatedResponse<T>`:
    - `data: T[]`
    - `meta: { hasMore: boolean; nextCursor: string | null; prevCursor: string | null }`
- Respuesta de error:
  - `ApiError`:
    - `error: { code: string; message: string; details?: { field: string; message: string }[] }`

## 3) Endpoints HTTP requeridos

Todos bajo prefijo `/v1`.

### 3.1 Auth

- `POST /auth/register`
  - body: `{ username, email, password }`
  - uso: registro
- `POST /auth/login`
  - body: `{ email, password }`
  - response `data`: `{ accessToken }`
- `POST /auth/logout`
  - invalida sesión/refresh cookie
- `POST /auth/refresh`
  - usa cookie de refresh
  - response `data`: `{ accessToken }`
- `POST /auth/verify-email`
  - body: `{ token }`
- `POST /auth/resend-verification`
- OAuth (flujo esperado por frontend):
  - `GET /auth/oauth/google`
  - `GET /auth/oauth/github`

### 3.2 Users

- `GET /users/@me`
  - devuelve `User`
- `PATCH /users/@me`
  - body parcial: `{ bio?, status?, customStatus? }`
  - devuelve `User`
- `POST /uploads/avatar`
  - `multipart/form-data`
  - devuelve `{ avatarUrl }`
- `GET /users/:id`
  - devuelve `User`

### 3.3 Servers (Guilds)

- `GET /servers/@me`
  - devuelve `Server[]`
- `GET /servers/:id`
  - devuelve `Server`
- `POST /servers`
  - body: `{ name, description? }`
- `PATCH /servers/:id`
  - body parcial de `Server`
- `DELETE /servers/:id`
- `GET /invites/:code`
  - devuelve `{ server }`
- `POST /invites/:code/join`
  - devuelve `Server`
- `POST /servers/:serverId/invites`
  - devuelve `{ code }`
- `GET /servers/:serverId/members?limit&after`
  - paginado de `ServerMember`

### 3.4 Channels, Messages, Reactions

- `GET /channels/:channelId/messages?before&after&limit`
  - paginado de `Message`
- `POST /channels/:channelId/messages`
  - body: `{ content?, replyToId? }`
  - devuelve `Message`
- `PATCH /messages/:messageId`
  - body: `{ content }`
  - devuelve `Message`
- `DELETE /messages/:messageId`
- `POST /messages/:messageId/reactions/:emoji`
- `DELETE /messages/:messageId/reactions/:emoji`
- `POST /servers/:serverId/channels`
  - body: `{ name, type?, categoryId? }`
- `PATCH /channels/:channelId`
  - body parcial de `Channel`
- `DELETE /channels/:channelId`

### 3.5 DMs

- `GET /dms`
  - devuelve `Channel[]` (tipo `dm` o `group_dm`)
- `POST /dms/:userId`
  - abre/crea DM con usuario
  - devuelve `Channel`
- `DELETE /dms/:channelId`
  - cierra DM

### 3.6 Friends

- `GET /friends`
  - devuelve `Friendship[]`
- `POST /friends/:userId`
  - envía solicitud
- `PATCH /friends/:userId`
  - body: `{ action: 'accept' | 'decline' | 'block' }`
- `DELETE /friends/:userId`
  - elimina amistad o solicitud

## 4) WebSocket / Gateway esperado

### 4.1 Conexión

- Cliente abre: `ws://localhost:8080/ws?token=<accessToken>`
- Heartbeat:
  - servidor envía `op: 10` con `heartbeatInterval`
  - cliente responde periódicamente con `op: 1` y `seq`
- Identify:
  - tras `HELLO`, cliente envía `op: 0` con `{ token }`

### 4.2 Eventos que el frontend ya consume

- `op: 11` READY
  - payload: `{ user, guilds, dmChannels }`
- `MESSAGE_CREATE`
- `MESSAGE_UPDATE`
- `MESSAGE_DELETE`
- `REACTION_ADD`
- `REACTION_REMOVE`
- `TYPING_START`
- `PRESENCE_UPDATE`
- `GUILD_CREATE`
- `GUILD_UPDATE`
- `GUILD_DELETE`
- `GUILD_MEMBER_ADD`
- `GUILD_MEMBER_REMOVE`
- `CHANNEL_CREATE`
- `CHANNEL_UPDATE`
- `CHANNEL_DELETE`
- `FRIEND_REQUEST`
- `FRIEND_UPDATE`

## 5) Tipos mínimos que el backend debe respetar

### User

`{ id, username, discriminator, email, avatarUrl, bannerUrl, bio, status, customStatus, isVerified, createdAt }`

### Server

`{ id, name, description, iconUrl, bannerUrl, ownerId, inviteCode, isPublic, memberCount, createdAt }`

### ServerMember

`{ serverId, userId, nickname, joinedAt, roles, user }`

### Channel

`{ id, serverId|null, categoryId|null, name|null, topic|null, type, position, isNsfw, slowmodeSeconds, lastMessageId, createdAt }`

### Message

`{ id, channelId, author, content, type, replyTo, attachments, reactions, isEdited, createdAt, editedAt }`

### Friendship

`{ id, requesterId, addresseeId, status, createdAt, user }`

## 6) Flujos funcionales ya implementados en frontend (para validar backend)

1. Login
   - `POST /auth/login` -> guardar access token -> `GET /users/@me` -> entrar a `/channels/@me`.

2. Boot de sesión en layout autenticado
   - `POST /auth/refresh` automático al entrar.
   - si falla: logout y redirect a `/login`.

3. Chat
   - `GET /channels/:id/messages` paginado inicial y scroll hacia atrás.
   - `POST /channels/:id/messages` para enviar mensaje.
   - `PATCH /messages/:id` y `DELETE /messages/:id`.
   - reacciones add/remove por endpoint específico.

4. Realtime
   - Sincronización de mensajes, presencia, typing, canales, miembros y servidores por WS.

5. Ruta especial DM Home
   - `/channels/@me` se resuelve como `serverId === '@me'` en ruta dinámica.
   - backend no necesita ruta especial para esto, pero sí datos de DM/friends para llenar esa vista.

## 7) Pendientes funcionales del frontend (impacta priorización backend)

- Vista de Friends todavía es mostly UI placeholder (requiere conectar `friendsApi` en pantalla).
- DMSidebar todavía usa lista mock vacía de DMs (requiere integrar `dmsApi.list/open`).
- Verificación por token en pantalla `verify-email` aún no ejecuta llamada de confirmación.

## 8) Prioridad recomendada para arrancar backend

1. Auth completo (`register`, `login`, `refresh`, `logout`, `me`).
2. Servers + Channels + Members básicos.
3. Messages + pagination + reactions.
4. WebSocket gateway con READY, MESSAGE_*, PRESENCE_UPDATE, TYPING_START.
5. Friends + DMs.

Con este orden ya se puede operar el frontend principal de chat end-to-end sin mocks.
