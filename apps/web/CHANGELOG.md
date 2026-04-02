# Changelog - DCC Web Frontend

Todos los cambios notables en el frontend de DCC serán documentados en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-03-31

### Added
- **Sistema de roles y permisos completo** (fd0d15e)
  - Creación, edición y eliminación de roles de servidor
  - Asignación de roles a miembros
  - Permisos granulares con overwrites por canal/categoría
  - Interfaz de configuración de roles con colores, posiciones y flags
- **Moderación de servidores** (fd0d15e)
  - Sistema de bans con razón
  - Kick de miembros
  - Gestión de miembros desde configuración
- **Mejoras masivas en UI/UX** (fd0d15e)
  - Rediseño completo de `ChannelSidebar` con mejor UX
  - Mejoras en `ReactionPicker` para selección de emojis
  - Actualización de `VoiceChannelRoom` para conexiones de voz
  - Refactor de `MessageItem` con mejor renderizado de attachments y replies
  - Optimizaciones en `DMHomeView` para listas de conversaciones
- **Configuración de usuario mejorada** (fd0d15e)
  - `UserSettingsModal` con pestañas: Account, Appearance, Theme Customizer
  - Picker de media source para avatares/banners
  - Soporte para cambio de username, email, bio, status
  - Configuración de tema con personalización avanzada
- **ServerSettingsModal multi-sección** (fd0d15e)
  - Overview: información básica del servidor
  - Members: gestión de miembros con búsqueda
  - Roles: CRUD completo de roles con drag-and-drop ordering
  - Channels: creación y gestión de canales
  - Invites: generación de invites con expiración/usos límite
  - Moderation: bans, kicks, expulsión de miembros
- **Support para OAuth social (Google, GitHub)** (fd0d15e)
  - Redirección a proveedores OAuth
  - Callback handlers en API
  - Conexión de cuentas externas
- **Autenticación de dos factores (2FA)** (fd0d15e)
  - Setup de 2FA con TOTP (Google Authenticator)
  - Generación de QR code
  - Códigos de backup
  - Verificación en login
- **Archivo API client mejorado** (fd0d15e)
  - Auto-refresh de tokens con retry lógico
  - Error handling con clases tipadas (`ApiRequestError`, `AuthError`)
  - Helpers por dominio: `authApi`, `usersApi`, `serversApi`, `channelsApi`, `dmsApi`, `friendsApi`, `linksApi`
  - Soporte para uploads con FormData
  - URL resolution inteligente para media (uploads/assets)
- **WebSocket y Realtime improvements** (5f8ce3e, fd0d15e)
  - Corrección de URL de WebSocket para producción
  - Hook `useWebSocket` con manejo de reconexión
  - Eventos realtime: typing indicators, presence updates, message reactions
  -Dispatch a stores globales (Zustand)
- **Cloudflare Workers deployment pipeline** (ee59772)
  - Configuración de `wrangler.toml` para deployment en Workers
  - Scripts de deploy automatizado (`npm run deploy`)
  - Bindings y configuración de KV/D1/R2 según necesidad
- **Production URLs y CORS** (25afc2e, 5f8ce3e)
  - Configuración normalizada de URLs para entornos multi-tenant
  - CORS origins dinámicos basados en APP_URL/API_URL
  - Soporte para HTTPS y HTTP en desarrollo
- **Vite + Vinext integration** (f2f0ed3, ee59772)
  - Configuración de Vite con plugin React Server Components
  - Build optimizado para Cloudflare Workers
- **Tailwind CSS theming** (fd0d15e)
  - CSS custom properties para dark/light mode
  - Color schemes basadas en Discord UI
  - Responsive design con breakpoints consistentes
- **Zustand stores por dominio** (fd0d15e)
  - `authStore`: tokens, user, login/logout state
  - `serversStore`: servidores, canales, categorías, miembros, roles
  - `messagesStore`: cache de mensajes por canal, paginación
  - `presenceStore`: estados online, actividades, custom status
  - `voiceStore`: conexiones de voz, mic mute, dispositivos
  - `appearanceStore`: tema, sidebar state, font scale

### Fixed
- **Anchoring working directory** (b3d7293)
  - Asegura que rutas relativas al API crate funcionen desde workspace root
  - Patch de server routes para deployment en Cloudflare
- **WebSocket URL resolution** (5f8ce3e)
  - Corrección deHandshake con token válido
  - Normalización de produccion vs development URLs
- **CORS origin handling** (25afc2e)
  - Acepta múltiples orígenes configurados
  - Merge automático de APP_URL en CORS_ORIGIN
- **Production config normalization** (25afc2e)
  - Unificación de config multi-URL (app_urls, api_urls)
  - Preferencia de HTTPS públicas sobre locales

### Removed
- **Unused wrangler patch script** (e225e70)
  - Eliminado `scripts/patch-wrangler.mjs` no utilizado
  - Configuración consolidada en `wrangler.toml`

### Documentation
- **README completo del proyecto** (a4938fc, fd0d15e)
  - Guía de instalación y desarrollo
  - Documentación de stack y arquitectura
  - API contract overview
  - Variables de entorno y deployment instructions

---

## [0.1.0] - 2026-03-31 (Initial Release)

### Added
- **Next.js 16 App Router** (f2f0ed3)
  - Route groups: `(app)` para rutas protegidas, `(auth)` para autenticación
  - Server Components por defecto con Client Components cuando es necesario
  - Layouts anidados y plantillas
- **Autenticación completa** (f2f0ed3)
  - Registro con email/password
  - Login con credenciales
  - Verificación de email
  - Logout y refresh de tokens
  - Protección de rutas (middleware)
- **Landing page** (f2f0ed3)
  - Redirect automático a login si no autenticado
  - Splash screen con branding DCC
- **Invite system** (f2f0ed3)
  - Página de invite `/invite/[code]`
  - Unirse a servidores con código
  - Validación de invites
- **Estructura de componentes** (f2f0ed3)
  - `/components/chat` - Chat components (MessageList, MessageInput, etc.)
  - `/components/layout` - Sidebars, modales, headers
  - `/components/dm` - DMs home view
  - `/components/theme` - Theme provider
  - `/components/user` - User panels, settings
- **API client base** (f2f0ed3)
  - Wrapper fetch con manejo de errores
  - Autenticación con bearer tokens
  - Helper functions para endpoints principales
- **Zustand stores iniciales** (f2f0ed3)
  - authStore, serversStore, messagesStore bases
  - Persistencia opcional en localStorage
- **Tailwind CSS + custom properties** (f2f0ed3)
  - Configuración de colores tema Discord-like
  - Responsive utilities
  - Dark mode listo
- **Types TypeScript** (f2f0ed3)
  - Tipos básicos: User, Server, Channel, Message, Role
  - Enums: UserStatus, ChannelType
  - Shapes de API responses
- **WebSocket hook básico** (f2f0ed3)
  - Conexión WS
  - Manejo de eventos salientes
  - Event listeners entrantes
- **Cloudflare Workers config** (f2f0ed3, ee59772)
  - `wrangler.toml` inicial
  - Build config para Workers
  - Compatibilidad con Vite

---

## Legend

- **Added** — New features and improvements
- **Changed** — Changes to existing functionality
- **Deprecated** — Features that will be removed
- **Removed** — Features that have been removed
- **Fixed** — Bug fixes
- **Security** — Security-related updates

---

## Commit Reference

| Hash | Type | Description | Files Changed |
|------|------|-------------|---------------|
| fd0d15e | feat | roles, permissions, server moderation and frontend improvements | 35+ files |
| 5f8ce3e | fix | correct WebSocket URL and production config for Cloudflare deployment | 6 files |
| 25afc2e | fix | update production URLs and CORS origin normalization | 4 files |
| e225e70 | chore | remove unused patch-wrangler script | 1 file |
| ee59772 | chore | add Cloudflare Workers deploy pipeline for frontend | 5 files |
| a4938fc | docs | rewrite README with full project overview | 2 files |
| f2f0ed3 | feat | Initial commit — Discord clone (DCC) full-stack | 50+ files |

---

## Notes

This frontend is in active development. API endpoints and types may change as the backend evolves.

For detailed API specifications, see `../../apps/api/README.md`.
