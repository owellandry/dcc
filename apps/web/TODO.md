# TODO - DCC Web Frontend

Lista de tareas pendientes organizadas por categoría y prioridad.

## 🔥 High Priority

### Bugs Críticos
- [ ] **Hydration mismatches** — Resolver warnings en consola
  - Revisar Server/Client component boundaries
  - Evitar `Math.random()`, `Date.now()` en render
  - Asegurar que datos fetched sean iguales en SSR y CSR
- [ ] **WebSocket reconnect logic** — Auto-reconectar al cerrarse
  - Detect disconnect (onClose event)
  - Exponential backoff (1s, 2s, 4s, 8s... max 30s)
  - Re-subscribir a canales Redis (guild, dm, user)
  - Show disconnected UI indicator
- [ ] **Optimistic UI failures** — Rollback en errores 4xx/5xx
  - Message send fails → quitar mensaje temporal y show error toast
  - Reaction add fails → remove local reaction UI
  - Edit/delete failures → revert UI change, show message
- [ ] **Memory leaks** — Cleanup de event listeners/intervals
  - `useWebSocket` cleanup en unmount
  - `useEffect` returns limpiando intervals
  - Zustand unsubscribe en components que usan `subscribe`
  - Motion animation cleanup

### Performance Crítica
- [ ] **Virtual list optimización** — MessageList con miles de mensajes
  - Asegurar que `@tanstack/react-virtual` usa correctamente `measureElement`
  - Cache de item heights estimado vs actual
  - Primer render rápido (no bloquear en calculate)
- [ ] **Image lazy loading** — Avatares/banners en viewport only
  - `loading="lazy"` en `<img>` tags manuales
  - `blurhash` placeholder mientras carga
  - Preload de primeras 10 imágenes en canal activo
- [ ] **Code splitting** — Lazy load componentes grandes
  - `ServerSettingsModal` (70KB+) → `dynamic(() => import(...)`)
  - `UserSettingsModal` similar
  - `ReactionPicker` heavy (emoji-mart data)
- [ ] **Bundle size** — Reducir initial load
  - Auditar con `@next/bundle-analyzer`
  - Lazy load `motion` (solo usado en transiciones?)
  - Importar solo emojis usados (emoji-mart soporta custom set)
- [ ] **SSR瀑布流** — Eliminar dependencies innecesarias en Server Components
  - No importar stores/client hooks en server comps
  - `Suspense` boundaries para data fetching paralelo
  - `cache()` para shared fetch entre múltiples comps

### Features Pendientes (Alto Impacto)
- [ ] **Search UI** (Cmd+K)
  - Header input focusable con Cmd+K shortcut
  - Dialog modal con resultados por categoría
  - Fetch a `/search?q=...` con debounce 300ms
  - Keyboard navigation (↑/↓/Enter/Esc)
- [ ] **Threads UI**
  - `MessageItem` badge "X replies" clickable
  - Modal o lateral panel para thread view
  - `ThreadView` component con nested messages + reply input
  - `POST /messages/:parentId/thread` endpoint en backend (ya existe?)
- [ ] **Polls** Componente de poll en mensajes
  - `PollMessage` con opciones clickeables, resultados gráficos
  - Barra de progreso por opción (%)
  - `POST /messages/:id/poll/vote` API
  - Real-time updates via WS (re-render poll)
- [ ] **Drag & drop channel reorder** en ServerSettingsModal
  - `dnd-kit` setup para lists
  - Persist order con `POST /servers/:id/structure/reorder`
  - Visual feedback (ghost item, drop indicator)
  - Animar con `framer-motion` al reorder

---

## 🟡 Medium Priority

### Mejoras UX
- [ ] **Keyboard navigation** — Atajos estilo Discord
  - `Ctrl+K` — Quick switcher (canal/servidor)
  - `Ctrl+,` — User settings modal
  - `Esc` — Close modals, clear search
  - `/` en input → command mode (future slash commands)
- [ ] **Message edit history** — Show who edited and when
  - "(editado)" link con tooltip mostrando timestamp + editor
  - Si backend guarda `edited_by`? actualmente solo `edited_at`
  - Edit count badge
- [ ] **Empty states** — Canales vacíos, sin miembros, sin friends
  - Ilustraciones SVG o emoji grandes
  - CTA button (e.g., "Invite friends", "Create first message")
- [ ] **Toast notifications** importantes
  - Friend request received → toast con accept/decline buttons
  - Mention en canal no visible → highlight channel + notification badge
  - Kick/ban → toast redirect a home
  - Use `react-hot-toast` con custom components
- [ ] **Connection status indicator** — WS health
  - Green dot (connected), Yellow (reconnecting), Red (disconnected)
  - Tooltip: latency Xms, last event Y seconds ago
  - StatusIcon component en AppHeader
- [ ] **Offline detection** — Banner "You're offline"
  - `window.addEventListener('online'/'offline')`
  - Show banner sticky en top (red background)
  - Queue outgoing messages en localStorage
  - Auto-send on reconnect

### Features
- [ ] **Scheduled messages** — Send later
  - Date/time picker en MessageInput (junto a send button)
  - Scheduled messages list (show en composer pending)
  - Cancel/edit before sent
  - Backend endpoint `POST /messages/:channel_id/schedule`
- [ ] **Server analytics** (para owners)
  - Simple graphs (message count, active members)
  - Library: `recharts` o `chart.js`
  - Endpoint `GET /servers/:id/analytics/messages?period=day`
- [ ] **Bulk operations** — Select múltiple y acciones
  - Checkboxes en member list (ServerSettingsModal > Members)
  - Select all, bulk role assign, bulk kick
  - Batch API calls (`POST /servers/:id/members/bulk`)
- [ ] **User profiles página pública**
  - Route `@/[username]` (dynamic route)
  - Show avatar, banner, bio, mutual servers
  - Badges display (2FA, verified, Nitro fake)
  - Send friend / message buttons
- [ ] **Guild templates** — Save/load server structure
  - "Create Template" button en ServerSettings
  - Template card (preview icon, name, server count)
  - Apply template → create new server pre-filled
- [ ] **Message reactions limit** — Max 20 emojis por mensaje
  - UI: disable more reactions after limit
  - Toast si intentan agregar más
  - Backend ya limita? verificar

### Voice & Media
- [ ] **Screen sharing** — Video track en voice channel
  - Toggle "Share Screen" en VoiceChannelRoom
  - WebRTC addTrack: getDisplayMedia()
  - UI: "You are sharing" indicator + stop button
  - Others see video tile en grid
- [ ] **Video channels** — Canales de video (multiparty)
  - Channel type `video` en backend
  - Grid de participants (tiles)
  - Toggle camera/mic, picture-in-picture
  - SFU approach o mesh (para pocos usuarios)
- [ ] **Voice message recording** — Hold to record
  - Button en MessageInput (mic icon hold)
  - Visual feedback (waveform, duration)
  - Upload audio (`.opus` o `.ogg` codec Opus)
  - Player embed en chat (audio element)
- [ ] **Attachment thumbnails** — Video/PDF previews
  - Extract thumbnail con `ffmpeg.wasm` para videos
  - PDF.js para renderizar first page de PDF
  - Thumbnail cache (lazy upload)

---

## 🟢 Low Priority / Nice to Have

### Features Menores
- [ ] **Custom user profile fields** (JSON extra: location, social links)
- [ ] **Server emoji manager** — Upload y organize emojis por servidor
- [ ] **Invite jump links** — `?invite=code` en URL cualquier página
- [ ] **Password reset flow** — Email con token (backend debe implementar)
- [ ] **Email change verification** — Confirm new email antes de change
- [ ] **Account deletion** — Soft delete con 30-day grace period
- [ ] **User notes** (moderators only) — Private notes sobre usuarios
- [ ] **Message stickers** — Pack de stickers + picker
- [ ] **Forum channels** — Threads con tags y pinned posts
- [ ] **Stage channels** — Speakers vs audience separation
- [ ] **Slowmode exempt roles** — Roles que ignoran slowmode
- [ ] **User status scheduling** — Auto-set status por horario
- [ ] **HypeSquad badges** — Fake badges visuales en perfil
- [ ] **Custom server icons** — Multiple icons? ya hay, pero select
- [ ] **Message reference UI** — "Replying to @username" preview mejor
- [ ] **Mention highlights** — Destacar mentions en thread context

### UX Improvements
- [ ] **Message search within channel** — `GET /channels/:id/messages?q=...`
  - Search bar en header de canal
  - Resultados paginados con highlight
- [ ] **Sort/filter options** en member list
  - Sort por nombre, join date, role
  - Filter por role, status (online)
- [ ] **Bulk ack** para marcar muchos mensajes como leídos
  - "Mark all as read" en canal header
  - `POST /channels/:id/messages/ack` con `{lastMessageId}`
- [ ] **Read receipts** — "Read by X" indicator
  - Small icon al lado de timestamp
  - Hover tooltip: "Read by @user1, @user2..."
  - Requires sentimiento de read status por usuario
- [ ] **Server-wide announcements** — Pin message a todos canales
  - Modal "Create Announcement" → broadcast a todos channels
  - Sticky banner en top de cada canal mientras activo
  - Close button para usuarios individuales
- [ ] **@everyone/@here mentions** — Rate limited, permission-checked
  - Already backend, but UI needs mention badge detect
  - Highlight mentions en violeta o especial
  - Settings: allow @everyone mentions in this channel?

---

## 🐛 Technical Debt / Bugs

### TypeScript & Types
- [ ] **Strict mode** — Enable `strict: true` en tsconfig.json
  - Fix all implicit `any` errors
  - `strictNullChecks` — handle null/undefined correctly
  - `noImplicitReturns` — todos branches return
- [ ] **Sincronizar tipos** con backend
  - Asegurar que `types.shared.ts` matches Rust models
  - Tipos de API responses (request/response) identical
  - Add tests que validan schema shape? (io-ts o Zod)
- [ ] **Reduce `any` usage** — Replace con tipos específicos
  - `event.data` en WS handlers
  - `options` objects spreading
  - Third-party library returns

### State Management
- [ ] **Zustand persistencia selectiva**
  - Persist solo auth (tokens), settings (no messages/servers)
  - Usar `persist` middleware con whitelist
  - Encrypt tokens before localStorage
- [ ] **Server store re-fetch strategy**
  - Stale-while-revalidate: return cached immediately, fetch in background
  - Invalidate cache on `server_update` WS event
  - Cache TTL: 5min para server list, 1min para server details
- [ ] **Messages store LRU**
  - Max 5000 mensajes en cache total
  - LRU淘汰 (least recently used)
  - Limit por canal (max 200 mensajes per channel)
  - Prefetch adjacent channels (neighbors)
- [ ] **Optimistic updates helpers**
  - `optimisticMessageAdd(tempId, message, onSuccess, onError)`
  - `optimisticReactionAdd(messageId, emoji)`
  - Rollback automático si API error (revert UI + toast)

### Component Architecture
- [ ] **Extract large components**
  - `ServerSettingsModal.main.tsx` > 500 lines → split:
    - `ServerSettingsTabs.tsx` (tab navigation)
    - `ServerSettingsOverview.tsx`
    - `ServerSettingsMembers.tsx`
    - `ServerSettingsRoles.tsx`
    - `ServerSettingsChannels.tsx`
    - `ServerSettingsInvites.tsx`
    - `ServerSettingsModeration.tsx`
  - `MessageItem.visual.tsx` > 400 lines → separate:
    - `MessageAttachments.tsx`
    - `MessageReactions.tsx`
    - `MessageReplyPreview.tsx`
    - `MessageEditHistory.tsx` (tooltip)
- [ ] **Remove dead code**
  - Components/functions no usados en todo el proyecto (grep "is used 0 times")
  - Imports comentados
  - TODO comments ya resueltos
- [ ] **Prop drilling reducción**
  - Server ID, channel ID, user ID en context global (AppContext)
  - O desde Zustand select (serversStore.getActiveServer())
  - Evitar passar props abajo 3+ niveles

---

## 📚 Documentation

- [ ] **Component library docs** con Storybook
  - Instalar `@storybook/nextjs`
  - Stories para: Button, Modal, MessageItem, ChannelItem, UserAvatar, etc.
  - Docs Page con autodoc (Props table, description)
  - Deploy static Storybook a GitHub Pages
- [ ] **Store API docs** — Cada store
  - State shape (interface)
  - Actions (methods) y qué modifican
  - Selectors (getters computed)
  - Ejemplos: "How add a reaction" usando messagesStore
  - Performance notes: "Selecting messages re-renders list"
- [ ] **Routing guide** — Cómo funciona App Router acá
  - Route groups `(app)` y `(auth)`: cuándo usar
  - Layouts vs templates
  - Server vs Client components: how to decide
  - Parallel routes? (si se usan)
- [ ] **WebSocket events reference**
  - Table de eventos con `op`, `d` shape, broadcast scope (user/guild/dm)
  - Ejemplo handler en `useWebSocket`
  - Common patterns: typing debounce, presence throttling
- [ ] **Deploy guide** — Cloudflare Workers
  - `wrangler.toml` explicado: entrypoint, compatibility_date, routes
  - Environment vars en `wrangler.toml [vars]` y secrets
  - Limitations: 10MB bundle, CPU time 30s, no Threads nightly
  - Build: `vinext build`, output en `dist/`
  - Troubleshooting: "Module not found" polyfills

---

## 🧪 Testing

### Unit Tests (Vitest)
- [ ] **Stores**
  - authStore: login success, login failure, logout, token refresh
  - serversStore: list fetched, add server, remove server, setActive
  - messagesStore: add message, update message, delete message, pagination
- [ ] **API client** (`api.main.ts`)
  - Request construcción correcta (URL, headers, body)
  - Error handling: 401 auto-refresh, 4xx/5xx throw ApiRequestError
  - Retry logic (max 1 retry)
  - Upload FormData handling
- [ ] **Utils**
  - `cn()` (clsx + tailwind-merge) — class merging correct
  - `resolveMediaUrl()` — uploads path → absolute URL
  - Date formatting (relative, absolute)
  - Permission helpers (`hasPermission`, `calculatePermissions`)

### Component Tests (React Testing Library)
- [ ] **MessageItem**
  - Render con avatar, username, timestamp, content
  - Reactions: hover show count, click add reaction (optimistic)
  - Replies: show replyTo preview, click navigate
  - Attachments: image, file, video thumbnails
- [ ] **ServerSettingsModal**
  - Tabs navigation (overview, members, roles, channels, invites, moderation)
  - Member list search + pagination
  - Role create/edit form validation
  - Drag & drop reorder channels (if implemented)
- [ ] **MessageInput**
  - Type text → send on Enter (Shift+Enter newline)
  - Emoji picker open/close, select emoji → add to input
  - Mention autocomplete (if implemented)
  - Reply preview, cancel reply
  - Attachment upload button → file selected, preview

### E2E Tests (Playwright)
- [ ] **Auth flow**
  - Register → verify email (mock) → login → redirected a channels
  - Login con 2FA (code válido/inválido)
  - OAuth (Google/GitHub mock callback)
  - Logout → redirected a login
- [ ] **Chat flow**
  - Create server → create channel → send message
  - Edit message → see edit indicator
  - Delete message → removed from UI
  - Add reaction → count increments, remove → decrement
- [ ] **Server management**
  - Update server name/icon/banner
  - Create category + channel in category
  - Create role + assign to member
  - Ban member → denied access, unban → access restored
- [ ] **DM flow**
  - Send friend request → accept
  - Open DM → send message
  - Close DM (archive) → reappear in list?

### Accessibility Tests
- [ ] **axe-core** integration en tests
  - Run axe en componente (screen size default)
  - Fix violations (color contrast, aria-label, keyboard nav)
  - Automated CI failure if violations > threshold
- [ ] **Manual keyboard testing**
  - Tab order lógico a través de interactive elements
  - Focus visible en todos focusable elements
  - Skip links para navigation
  - Modal focus trap (tab cycles dentro modal, escape cierra)
- [ ] **Screen reader testing** (VoiceOver/NVDA)
  - Announcements para dynamic content (new message, typing)
  - ARIA live regions para notifications
  - Alt text en imágenes, `aria-label` en icon buttons
  - Landmark roles (banner, navigation, main, complementary)

---

## 📦 Dependencies & Tooling

### Security
- [ ] `npm audit` — Fix vulnerabilities críticas/altas
- [ ] `cargo audit` en backend (ya debe tenerse)
- [ ] Dependabot configurado (auto PR updates)
- [ ] Scan de dependencies con `osv-scanner`

### Tooling
- [ ] **Husky + lint-staged** — Pre-commit hooks
  - `prettier --write` en staged .ts/.tsx/.css
  - `eslint --fix` en staged .ts/.tsx
  - `cargo fmt` y `cargo clippy` en Rust staged? (difícil)
- [ ] **Commitlint** — Conventional Commits enforcement
  - `@commitlint/cli` con config `@commitlint/config-conventional`
  - Hook `commit-msg` para validar format
- [ ] **Changesets** — Versioning & changelog automático
  - `@changesets/cli` para crear release PRs
  - Auto-generar CHANGELOG.md en cada release
  - Bump version en packges.json + cargo.toml

### Build & Deploy
- [ ] **Bundle analyzer** — `@next/bundle-analyzer`
  - Build con `analyze: true` → generate `.analzye/*.html`
  - Review bundle composition, identificar large modules
  - Set budget (max 200KB initial)
- [ ] **Source maps upload** — Sentry integration
  - `@sentry/nextjs` o manual upload en CI
  - Automático en `npm run build` + `sentry-cli upload-sourcemaps`
  - Release names semver (`v0.1.0`)
- [ ] **Vercel/Cloudflare Pages** — Deploy config
  - Adjust build command (`npm run build`)
  - Output directory (`dist/` o `.next/`)
  - Environment vars en dashboard
  - Custom domain SSL

---

## 🔄 Concurrent Work with Backend

Estas tareas dependen de cambios en backend API:

### Backend-first (esperar a que backend complete)
- [ ] **Search** — Backend `GET /search` (PostgreSQL full-text o Meili)
- [ ] **Threads** — Backend `parent_message_id`, `threads` table
- [ ] **Polls** — Backend poll JSONB + API endpoints
- [ ] **Scheduled messages** — Backend worker cron
- [ ] **Bulk operations** — Backend bulk endpoints
- [ ] **Guild templates** — Backend serialización + restore
- [ ] **Webhooks** — Backend dispatcher + retry
- [ ] **Slash commands** — Backend interactions endpoint
- [ ] **Server analytics** — Backend aggregated queries
- [ ] **Search messages** — Backend `GET /channels/:id/messages?q=`
- [ ] **User profiles público** — Backend `GET /users/:username` route
- [ ] **Read receipts** — Backend almacena last_read_message_id

### Frontend-can-start (independiente, pero backend eventual)
- [ ] **Keyboard shortcuts** — Puede mockear endpoints
- [ ] **Empty states** — Solo UI, sin API
- [ ] **Toast notifications** — UI library ready
- [ ] **Drag & drop reordering** — Mock reorder, backend needed para persist
- [ ] **Optimistic UI** — Patterns se puede implementar now
- [ ] **Virtual list optimization** — Solo frontend
- [ ] **Code splitting** — Lazy load components existentes
- [ ] **Accessibility improvements** — Puede hacerse ya

---

## Orden de Trabajo Sugerido

### Sprint 1 (2 semanas): Stability & Performance
1. Fix hydration mismatches
2. Implement WS reconnect logic
3. Optimistic updates failures + rollback
4. Code splitting de modales grandes
5. Virtual list measurement fix

### Sprint 2 (2 semanas): Core UX
1. Keyboard shortcuts (Ctrl+K, etc.)
2. Search UI (Cmd+K modal)
3. Empty states consistentes
4. Toast notifications importantes
5. Connection status indicator

### Sprint 3 (3 semanas): New Features (1)
1. Threads UI + backend integration
2. Polls component + API
3. Drag & drop channel reorder
4. Message edit history tooltip

### Sprint 4 (2 semanas): New Features (2)
1. Scheduled messages (date picker + API)
2. Server analytics UI (charts + endpoint)
3. Bulk member operations (checkbox + API)
4. User profiles pública

### Sprint 5 (2 semanas): Voice/Media
1. Screen sharing (WebRTC + UI)
2. Attachment thumbnails (ffmpeg.wasm)
3. Voice messages recording/playback
4. Video channels grid (simple mesh)

### Sprint 6 (2 semanas): Polish & Testing
1. Accessibility audit + fixes (axe)
2. E2E tests críticos (login, chat, server creation)
3. Bundle size optimization (<200KB goal)
4. Component Storybook setup
5. Error boundary improvements

### Sprint 7+ (future)
- Mobile app (Capacitor) — separate project timeframe
- Bots platform — large undertaking
- Monetización features — business decision needed

---

## Tracking

- **Prioridad**: 🔥 High / 🟡 Medium / 🟢 Low
- **Estado**: `todo` / `in-progress` / `done`
- **Dependencias**: [backend] si requiere API change, [design] si necesita mocks
- **Estimación**: Small (½ día), Medium (1-2 días), Large (3-5 días), Epic (1+ semanas)

---

*Actualizado: 2026-03-31*
