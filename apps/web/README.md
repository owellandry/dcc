# DCC Web - Discord Clone Frontend

Aplicación frontend para DCC (Discord Clone), construida con Next.js 16 (App Router), React 19, TypeScript y Tailwind CSS.

## Stack Tecnológico

- **Framework**: Next.js 16 (experimental.rsc = true) con React Server Components
- **Lenguaje**: TypeScript 5.7
- **Estilos**: Tailwind CSS 3.4 + CSS custom properties
- **Estado global**: Zustand 5 (stores por dominio)
- **Animaciones**: Framer Motion 12
- **Icons**: Lucide React, React Icons
- **Emojis**: emoji-mart (picker)
- **HTTP Client**: Fetch API con wrapper personalizado
- **Build tool**: Vite + Vinext (experimental Next.js en Vite)
- **Deploy target**: Cloudflare Workers (wrangler.toml configurado)
- **Linting**: ESLint 9 + Prettier 3

## Estructura del Proyecto

```
apps/web/
├── src/
│   ├── app/                        # App Router (Next.js 16)
│   │   ├── (app)/                  # Rutas protegidas (autenticado)
│   │   │   ├── channels/          # Canales de servidor
│   │   │   ├── friends/           # Página de amigos
│   │   │   └── layout.tsx         # Layout para rutas app
│   │   ├── (auth)/                # Rutas de autenticación
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── verify-email/
│   │   │   └── layout.tsx
│   │   ├── dev/                   # Página de desarrollo/debug
│   │   ├── invite/                # Invites
│   │   │   └── [code]/
│   │   ├── layout.tsx             # Root layout
│   │   ├── not-found.tsx
│   │   └── page.tsx               # Landing page (redirect)
│   ├── components/                # Componentes React
│   │   ├── chat/                  # Componentes de chat
│   │   │   ├── ChannelHeaderBar/
│   │   │   ├── ChatArea/
│   │   │   ├── ChatComposerPanel/
│   │   │   ├── ChatHeader/
│   │   │   ├── ExternalNavigationModal/
│   │   │   ├── MessageInput/
│   │   │   ├── MessageItem/      # Item de mensaje con replies, attachments
│   │   │   ├── MessageLinkPreview/
│   │   │   ├── MessageList/
│   │   │   ├── ReactionPicker/
│   │   │   ├── TypingIndicator/
│   │   │   └── VoiceChannelRoom/
│   │   ├── dm/                    # DMs
│   │   │   └── DMHomeView/
│   │   ├── layout/                # Layout components
│   │   │   ├── ChannelSidebar/
│   │   │   ├── DMSidebar/
│   │   │   ├── InviteLinkModal/
│   │   │   ├── MemberSidebar/
│   │   │   ├── ServerPreviewCard/
│   │   │   ├── ServerSettingsModal/  # Modal multi-sección
│   │   │   └── ServerSidebar/
│   │   ├── theme/                 # Theme provider & toggles
│   │   └── user/                  # Componentes de usuario
│   ├── hooks/                     # Custom React hooks
│   │   ├── useMessages/          # CRUD de mensajes
│   │   ├── useVoiceChannel/      # Lógica de voz
│   │   └── useWebSocket/         # Conexión WS + eventos
│   ├── lib/                       # Utilidades y configuración
│   │   ├── api/                   # API client wrapper
│   │   │   └── api.main.ts       # Cliente HTTP + tipos
│   │   ├── channel-icons/         # Iconos de canales
│   │   ├── cn/                    # clsx + tailwind-merge
│   │   ├── mock-data/             # Datos de prueba
│   │   ├── mock-init/             # Inicialización de mock mode
│   │   ├── motion/                # Configuración de Framer Motion
│   │   ├── permissions/           # Utilidades de permisos
│   │   ├── realtime/              # WebSocket events handler
│   │   ├── theme/                 # Theme engine (light/dark)
│   │   └── types/                 # TypeScript type definitions
│   │       └── types.shared.ts    # Tipos compartidos con backend
│   ├── routes/                    # Navegación (probablemente React Router o custom)
│   │   ├── app-shell/
│   │   ├── auth/
│   │   ├── auth-layout/
│   │   ├── dev-page/
│   │   ├── friends-page/
│   │   ├── invite-page/
│   │   └── landing-page/
│   ├── stores/                    # Zustand stores (estado global)
│   │   ├── appearanceStore/      # Tema,Sidebar states
│   │   ├── authStore/            # Auth state, tokens, user
│   │   ├── messagesStore/        # Cache de mensajes por canal
│   │   ├── presenceStore/        # Estados de usuarios online
│   │   ├── serversStore/         # Servidores, canales, miembros
│   │   └── voiceStore/           # Estado de voz, conexiones
│   ├── styles/
│   │   └── globals.css            # Tailwind directives + global styles
│   └── workers/                   # Web Workers (si existen)
├── public/                        # Assets estáticos
│   ├── icons/                     # Favicons y PWA icons
│   └── ...
├── certs/                         # Certificados de desarrollo HTTPS
├── dist/                          # Build output (Vite/Next)
├── .wrangler/                     # Cloudflare Workers config
├── .env.local                     # Variables de entorno (NO committear)
├── next.config.ts                 # Next.js config
├── tailwind.config.ts             # Tailwind CSS config
├── vite.config.ts                 # Vite config (con plugin RSC)
├── wrangler.toml                  # Cloudflare Workers config
├── package.json                   # Dependencias y scripts
├── tsconfig.json                  # TypeScript config
└── postcss.config.cjs             # PostCSS (Tailwind)
```

## Scripts npm

```bash
# Desarrollo (desde apps/web)
pnpm dev                 # Servidor de desarrollo (HTTP)
pnpm dev:https           # Servidor de desarrollo con HTTPS (Windows)
pnpm dev:https:cert      # Generar certificado dev HTTPS (Windows)

# Build & Deploy
pnpm build               # Build de producción
pnpm start               # Servidor de producción (after build)
pnpm deploy              # Deploy a Cloudflare Workers

# Calidad de código
pnpm lint                # ESLint
pnpm type-check          # Verificación de tipos TypeScript
```

Desde la raíz del monorepo:

```bash
pnpm dev                 # turbo run dev (api + web)
pnpm build               # turbo run build
```

## Arquitectura de UI

La UI está organizada con un layout tipo Discord:
- rail de servidores (izquierda)
- sidebar de DMs/canales (izquierda)
- contenido principal (centro)
- lista de miembros (derecha)

Detalles: ver [`docs/ui-architecture.md`](./docs/ui-architecture.md).

## Configuración

### Variables de Entorno

Crear `.env.local` (basado en `.env.example` si existe):

```bash
# URLs de API y WebSocket
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080

# En producción (ejemplo):
# NEXT_PUBLIC_API_URL=https://api.dcc.example.com
# NEXT_PUBLIC_WS_URL=wss://api.dcc.example.com
```

**Nota**: El prefijo `NEXT_PUBLIC_` es requerido por Next.js para exponer variables al cliente.

### Configuración de Next.js

`next.config.ts` configura patterns de imágenes remotas:
- Cloudflare R2 (`**.r2.cloudflarestorage.com`)
- GitHub avatars (`avatars.githubusercontent.com`)
- Google avatar (`lh3.googleusercontent.com`)

También define `allowedDevOrigins` para desarrollo en IPs locales.

### Tailwind CSS

`tailwind.config.ts` define:
- Theme tokens (colors, spacing, typography) basados en Discord-like palette
- Dark mode support (class-based)
- Custom font families (Inter, Söhne, etc.)

## Estado Global (Zustand Stores)

### `authStore`
- Estado de autenticación: user, tokens, loading, error
- Acciones: login, logout, register, refresh token, set user
- Persiste en localStorage (opcional)

### `serversStore`
- Lista de servidores del usuario
- Canales, categorías, roles, miembros por servidor
- Selección actual: active server, active channel
- Cache de servidores para reducir requests

### `messagesStore`
- Mensajes por canal (cache)
- Paginación: carga histórica (before/after)
- Estados: loading, error, typing indicators
- Operaciones: send, edit, delete, react

### `presenceStore`
- Estados en línea de usuarios (online/idle/dnd/offline)
- Actividades actuales (playing, streaming, custom status)
- Actualizaciones en tiempo real via WebSocket

### `voiceStore`
- Estado de conexiones de voz
- Micrófono, headphones mute, speaker device
- Voice activity detection (VAD)

### `appearanceStore`
- Tema (light/dark/system)
- Sidebar states (collapsed, width)
- Font scale, zoom level

## API Client (`src/lib/api/api.main.ts`)

Cliente HTTP centralizado con:

- **Auto-refresh**: Renueva access token en 401 automáticamente
- **Error handling**: Clases `ApiRequestError`, `AuthError`
- **Helpers por dominio**: `authApi`, `usersApi`, `serversApi`, `channelsApi`, `dmsApi`, `friendsApi`, `linksApi`
- **Uploads**: Método `upload` para FormData (avatars, banners)
- **Paginación**: `getPaginated` para listados
- **URL resolution**: `resolveMediaUrl` para convertir `/uploads/...` en URLs absolutas
- **Cookie handling**: `credentials: 'include'` para refresh tokens en cookies HTTP-only

### Ejemplo de uso:

```typescript
import { authApi, serversApi } from '@/lib/api'

// Login
const result = await authApi.login({ login: 'user@example.com', password: '••••' })

// Listar servidores
const servers = await serversApi.list()

// Enviar mensaje
await channelsApi.sendMessage(channelId, { content: 'Hello!' })
```

## WebSocket / Realtime

### Conexión
- URL: `NEXT_PUBLIC_WS_URL` + `?token=<accessToken>`
- Handler: `src/lib/realtime/` (event listeners + dispatch)
- Hook: `useWebSocket()` para conectar/desconectar

### Eventos (bidireccionales)

**Cliente → Servidor:**
- `message_create`, `message_edit`, `message_delete`
- `reaction_add`, `reaction_remove`
- `typing_start`, `typing_stop`
- `presence_update` (status, activity)

**Servidor → Cliente:**
- `ready` (datos iniciales)
- `message_create`, `message_edit`, `message_delete`
- `reaction_add`, `reaction_remove`
- `typing_start`, `typing_stop`
- `presence_update`
- `server_update`, `channel_update`
- `member_join`, `member_leave`

## Tipos TypeScript

Los tipos principales en `src/lib/types/types.shared.ts` están **sincronizados con el backend**:

- `User`, `Server`, `Channel`, `Message`, `Role`, `ServerMember`
- `Category`, `PermissionOverwrite`
- Enums: `UserStatus`, `ChannelType`, `PermissionOverwriteTargetType`
- Request/Response shapes

**Nota**: Los tipos se comparten conceptualmente con Rust (backend) pero están duplicados en TS. Mantener sincronizados manualmente.

## Componentes Principales

### Chat
- `ChatArea` — Contenedor de mensajes + canal
- `MessageList` — Lista virtualizada (tanstack/react-virtual)
- `MessageItem` — Render de mensaje con avatar, timestamp, edit history, replies, attachments, reactions
- `MessageInput` — Composer con autocomplete de emojis, markdown preview, reply preview
- `ReactionPicker` — Emoji mart picker
- `TypingIndicator` — Usuarios escribiendo

### Layout
- `ServerSidebar` — Lista de servidores (iconos)
- `ChannelSidebar` — Canales + categorías por servidor
- `MemberSidebar` — Miembros online, roles, nickname
- `ServerSettingsModal` — Modal multi-pestaña: Overview, Members, Roles, Channels, Invites, Moderation

### DM
- `DMHomeView` — Lista de conversaciones directas

## Authentication Flow

1. **Registro/Login** → Backend devuelve access token (y refresh token en cookie HTTP-only)
2. **Token storage**: access token en memoria (`api.ts`) + auth state en `authStore`
3. **Auto-refresh**: 401 → llama a `/auth/refresh` → retry request
4. **Logout**: Limpia estado, llama a `/auth/logout`, elimina cookie
5. **OAuth**: Redirect a Google/GitHub → callback handler guarda token

## Desarrollo

### Requisitos
- Node.js 18+
- PostgreSQL + Redis (backend corriendo)
- Opcional: Docker Compose para infraestructura

### Instalación

```bash
cd apps/web
npm install
```

### Desarrollo local

```bash
# Modo normal
npm run dev

# Modo HTTPS (requiere certificados en ./certs)
npm run dev:https
```

La app corre en `http://localhost:3000` (configurable).

### Type checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
# Fix automático
npm run lint -- --fix
```

### Build de producción

```bash
npm run build
npm run start
```

Build output en `dist/` (o `.next/` si se usa Next.js estándar).

## Deploy

### Cloudflare Workers

El proyecto está configurado para deploy en Cloudflare Workers usando `wrangler`.

```bash
npm run deploy
# O manual:
npx wrangler deploy
```

**wrangler.toml** configura:
- Entrypoint: `src/workers/index.ts` (probable adaptador)
- Durables/queues si son necesarios
- Bindings para KV, D1, R2 si aplica

### Vercel / Otras plataformas

El proyecto usa Vinext (Vite + Next.js), lo que puede limitar deploy a plataformas específicas. Consultar documentación de Vinext para compatibilidad.

## PWA / Mobile

- Favicon e icons en `public/icons/`
- Manifest (si existe) para instalación
- Responsive design con Tailwind breakpoints

## Convenciones de Código

### Componentes
- Nombre en **PascalCase**: `MessageItem.tsx`
- Archivos de componentes en `/components/<categoria>/<Componente>/`
- Subcomponentes auxiliares en el mismo directorio

### Hooks
- Custom hooks en `/hooks/use<Nombre>.ts`
- Devuelven tipos bien definidos

### Stores (Zustand)
- Un store por dominio en `/stores/<store-name>/`
- Cada store exporta `create<StoreName>Store()` y tipos

### API
- Helper functions por dominio en `/lib/api/`
- Naming: `camelCase` (ej: `serversApi.create()`)

### Estilos
- Utility-first con Tailwind
- Clases atómicas + `cn()` para condicionales
- Evitar CSS modules; usar Tailwind o `style` props raro

### Types
- Tipos compartidos en `types.shared.ts`
- Usar `interface` para objetos, `type` para unions/disjunctions
- Preferir tipos del backend cuando estén disponibles

## WebSocket Events Handler

La lógica de WebSocket está centralizada en `src/lib/realtime/`:

- Conexión gestionada por `useWebSocket()`
- Event handlers por tipo (message, reaction, presence, etc.)
- Dispatch a stores correspondientes
- Reconexión automática con backoff

## Testing

El proyecto actualmente **no tiene tests configurados**. Para agregar:

```bash
npm install -D vitest @testing-library/react @testing-library/react-hooks
```

(Vitest recomendado por compatibilidad con Vite).

## Problemas Conocidos

- **Vinext experimental**: Puede haber incompatibilidades con plugins de Next.js
- **RSC**: Algunos componentes pueden necesitar `'use client'` directive
- **Wrangler deploy**: Asegurar que el entrypoint worker sea correcto
- **Uploads en producción**: Configurar S3/R2 y actualizar `API_URL` resolution

## Recursos Adicionales

- Backend README: `../../apps/api/README.md`
- API contract: Ver documentación en backend
- Issue tracking: GitHub Issues (si configurado)

## Contacto / Mantenimiento

Este frontend es parte del monorepo DCC. Mantener sincronizados los tipos con el backend y seguir las convenciones de Tailwind/Zustand establecidas.
