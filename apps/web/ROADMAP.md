# Roadmap - DCC Web Frontend

Visión de largo plazo para la aplicación frontend de DCC. Organizado por horizontes temporales.

## Estado Actual (v0.1.0)

✅ **Completado**:
- Next.js 16 App Router con React 19 y Server Components
- Autenticación completa (login, register, OAuth, 2FA)
- Sistema de servidores con canales y categorías
- Roles y permisos con UI de configuración
- Chat en tiempo real via WebSocket (typing, presence, reactions)
- Mensajes con replies, attachments, emojis
- DMs y sistema de amigos
- Voice channels con señalización WebRTC
- Theme engine (light/dark/custom)
- Responsive design (mobile-first)
- Cloudflare Workers deployment

---

## Objetivos a Corto Plazo (1-2 meses)

### Feature Parity & Polish
- [ ] **Search UI** — Búsqueda global de usuarios y servidores
  - Barra de búsqueda en header (Cmd+K style)
  - Resultados por categoría (servers, users, messages)
  - Highlight de texto coincidente
- [ ] **Threads** — Hilos de conversación
  - UI de thread anidado (sidebar de replies)
  - `MessageItem` como thread starter con contador
  - `ThreadView` componente para navegar hilos
  - Auto-subscribe al crear thread
- [ ] **Polls** — Encuestas en mensajes
  - Componente `PollMessage` con opciones, votos, gráfico
  - `PollReactionBar` (click para votar)
  - Actualización en tiempo real de resultados
  - Votación anónima o visible (configurable)
- [ ] **Scheduled messages**
  - Date picker en `MessageInput` para programar
  - Vista de scheduled messages en composer (pending list)
  - Cancelar/editar scheduled antes de envío
  - WS event para disparo de scheduled message

### Mejoras UX/UI
- [ ] **Drag & drop reordering** — Canales y categorías
  - `dnd-kit` o `react-beautiful-dnd` para ServerSettingsModal > Channels
  - Persistir positions via `POST /servers/:id/structure/reorder`
  - Visual feedback (ghost, placeholder)
- [ ] **Message editing UX** — Diferenciar entre "editing" y "edit history"
  - show "(editado)" con timestamp
  - Click para ver historial de ediciones (tooltip)
- [ ] **Better empty states** — Canales vacíos, 0 miembros, 0 mensajes
  - Illustrations o icons
  - CTA para crear primer mensaje o invitar amigos
- [ ] **Keyboard navigation** — Atajos de teclado tipo Discord
  - `Ctrl+K` — Switch channel/server (fetch + navigate)
  - `Esc` — Close modals, clear search
  - `Ctrl+/` — Show shortcuts cheat sheet
  - Navegación entre mensajes (↑/↓ en input)
- [ ] **Toast notifications** — Para eventos importantes
  - New friend request
  - Mention en canal no activo
  - Server invite recibido
  - Kick/ban (con redirección)
  - Usar `react-hot-toast` con tipos

### Performance & Stability
- [ ] **Virtual scrolling** optimizado en MessageList
  - Usar `@tanstack/react-virtual` correctamente con dynamic heights
  - Cache de medidas para evitar re-calc
  - Lazy load de attachments (images) en viewport
- [ ] **Optimistic updates** — Mensajes enviados aparecen inmediatamente
  - Message sent → add to store con temp ID → replace en response
  - Reactions: add local antes de server confirm
  - Edit/delete: optimistically update UI, revert on error
- [ ] **Offline detection** — UI当 offline
  - Detectar `navigator.onLine` y eventos `online`/`offline`
  - Mostrar banner "You're offline" en header
  - Queue de mensajes para enviar cuando vuelva online (localStorage)
- [ ] **Connection status indicator** —WS connection quality
  - Green/Yellow/Red dot en header
  - Tooltip con latency y estado (connected/connecting/disconnected)
  - Auto-reconnect con backoff visualizado

---

## Objetivos a Mediano Plazo (3-6 meses)

### Características de Discord Esenciales
- [ ] **Stage channels** — Canales de escenario
  - UI de "stage" con speaker audience separation
  - Raise hand button (request to speak)
  - Speaker permissions separate from regular voice
  - Event scheduling integrado
- [ ] **Events platform** — Calendario de eventos
  - `CalendarView` componente (grid by day/week)
  - Create event modal (date, time, description, recurring)
  - RSVP buttons (Going/Maybe/Not)
  - Reminders (toast 15min before)
  - Integration con Google Calendar (export .ics)
- [ ] **Server discovery** — Directorio público
  - Página `/discover` con servidores públicos
  - Filtros por categoría, tamaño, región
  - Browse por temas (gaming, education, etc)
  - Join button directo (sin invitecode)
- [ ] **User profiles mejoradas**
  - Página de perfil pública `@username`
  - Badges display (Nitro, HypeSquad, early supporter)
  - Server connections (qué servidores en común)
  - Activity feed (últimos servers joined, juegos jugando)
- [ ] **Push notifications** (PWA + mobile)
  - Service worker con push subscription
  - Notificaciones para mentions, DMs,friend requests
  - Configurable por canal/servidor
  - iOS/Android via Capacitor o Expo (más adelante)
- [ ] **Voice messages** — Notas de voz en chat
  - Hold-to-record button en MessageInput
  - Audio waveform preview
  - Transcripción opcional (si hay backend de speech-to-text)
  - Duration limit (60s typical)

### Colaboración & Productividad
- [ ] **Whiteboard / Canvas** — Pizarra colaborativa
  - Canvas HTML5 con drawing tools (pen, shapes, text)
  - Real-time drawing sync via WS
  - Cursor sharing (see others' cursors)
  - Export to PNG/SVG
- [ ] **Code snippets** en mensajes
  - Syntax highlighting con Prism.js o Shiki
  - Copy button con language detection
  - One-line block con background de código
- [ ] **Calendar integration** — Ver eventos de servidor en Google Calendar
  - Export all events como .ics feed
  - Two-way sync (API de Google Calendar) — complejo
- [ ] **File sharing mejorado**
  - Drag & drop upload (ya hay, pero mejorar UX)
  - Preview de múltiples archivos (image grid, PDF embed)
  - Video thumbnails (extraer frame con ffmpeg.wasm)
  - Virus scanning (ClamAV backend?) — security
- [ ] **Message search** dentro de canal/servidor
  - `GET /channels/:id/messages?q=query` en backend
  - UI de search en ChannelHeader (input con filtros)
  - 결과 paginado, highlight

### Mobile App (separate project o PWA avanzada)
- [ ] **PWA installability** — Manifest completo
  - Icons variados (192x192, 512x512, maskable)
  - `display: standalone`, `theme_color`, `background_color`
  - Splash screen config
- [ ] **Capacitor integration** — Native wrapper
  - Build iOS .ipa y Android .apk con Capacitor
  - Native plugins: push notifications, camera, file system
  - Splash screen nativo
- [ ] **Offline-first** — Service worker cache
  - Cache de assets (JS, CSS, images)
  - Cache de mensajes recientes (IndexedDB)
  - Background sync para send messages offline
  - Queue management UI

---

## Objetivos a Largo Plazo (6+ meses)

### Platform & Ecosystem
- [ ] **Bots & Integrations platform**
  - OAuth2 server-side (bot tokens)
  - Bot dashboard (create bot, get token, invite to servers)
  - Bot permissions granular (como usuario)
  - Events received por bot vía WS o webhook
  - Interactions API (slash commands, buttons, modals)
- [ ] **Applications** (a la Discord)
  - Build apps con React/Next.js que corren dentro de DCC
  - App manifest (permissions, routes)
  - App directory por servidor
  - Embedded iframe sandbox
- [ ] **Verified servers** — Programa de servidores verificados
  - Badge checkmark
  - Application process con revisión humana
  - Requirements: 2FA enforced, email verified, >1000 members
- [ ] **Creator Economy** (monetización)
  - Server boosting: monthly subscription, perks (更多的表情空间、更高的音频质量)
  - Tip jar / donations (Stripe, PayPal, crypto?)
  - Paid roles/subscriptions para contenido exclusivo
  - Revenue share con DCC (platform fee %)

### Social & Discovery
- [ ] **Server insights públicos** — Estadísticas abiertas
  - Active members graph
  - Most active channels
  - Message velocity
  - Similar servers recommendation
- [ ] **User profiles expandidas**
  - Portfolio section (links, projects)
  - Skill tags (como LinkedIn)
  - Recommendations/endorsements
  - Activity streaks (like GitHub)
- [ ] **Communities / Networking**
  - Discovery feed (como Twitter) de amigos
  - "Events near you" (location-based, optional)
  - Group DMs > 10 people → convert to temporary server?
  - Topic-based matching (interests algorithm)
- [ ] **Accessibility improvements**
  - Full keyboard navigation (tab order, focus management)
  - ARIA labels en todos componentes
  - Screen reader announcements para dynamic content
  - High contrast mode
  - Reduced motion respeto de prefers-reduce-motion
  - Text scaling hasta 200%

### Admin & Moderation Tools
- [ ] **Moderation dashboard** — Panel de moderadores
  - Lista de usuarios baneados (con reasons, dates)
  - Audit log viewer (filter por action, user, date)
  - Mass actions: ban multiple, delete messages bulk
  - Warning system (strikes, automatic temp mute)
- [ ] **Auto-moderation** — Filtros automáticos
  - Spam detection (regex patterns, message rate)
  - Raid detection (mass joins en short time)
  - Auto-timeout para repeated violations
  - Appeal process (user puede apelar ban)
- [ ] **Compliance tools**
  - Export/delete user data (GDPR)
  - Content retention policy (auto-delete messages after X years)
  - Legal hold (preserve messages en descubrimiento legal)
  - Admin console con acción log (who did what)

---

## Mejoras Técnicas (Sprint Técnico Continuo)

### Performance
- [ ] **Code splitting** más agresivo
  - Separar componentes grandes (ServerSettingsModal, MessageList)
  - Lazy load routes no críticas (e.g., invite page, friends page)
  - Dynamic imports con `next/dynamic` (ya debe usarse, pero revisar)
- [ ] **Image optimization**
  - Usar `next/image` para avatares/banners (pero cuidado con dominios externos)
  - WebP delivery si soportado
  - Lazy load de imágenes fuera de viewport
- [ ] **Bundle size analysis** — Budget de 200KB gzip
  - Usar `@next/bundle-analyzer`
  - Identificar dependencies pesadas (emoji-mart ~200KB? motion?)
  - Tree-shaking improvements
- [ ] **SSR optimization**
  - Suspense boundaries para evitar waterfalls
  - Streaming SSR para páginas grandes (ServerSettingsModal)
  - cache() para datos estáticos (servidores públicos)
- [ ] **Web Worker** para calculations pesadas
  - Markdown parsing off main thread
  - Emoji processing (emoji-mart data loading)
  - Virtual list calculations (tanstack virtual ya es ligero)

### State Management
- [ ] **Zustand persistencia selectiva**
  - Persistir solo auth tokens, settings (no datos volátiles)
  - Migrar de localStorage a IndexedDB (más espacio)
  - Encrypt sensitive data antes de persistir
- [ ] **Server store re-fetching strategy**
  - Stale-while-revalidate para servidores
  - Background refresh cada N minutos
  - Invalidación selectiva (solo changed entities)
- [ ] **Messages store optimizaciones**
  - Message cache con LRU (max 5000 mensajes en memoria)
  - Evitar duplicates (merge inserts)
  - Bulk delete de mensajes antiguos (keep last 100 por canal)
- [ ] **Optimistic updates centralizadas**
  - Crear helper en `apiClient` para optimistic updates with rollback
  - Store method: `optimisticAddMessage(tempId, message, onConfirm, onError)`

### Testing & Quality
- [ ] **Unit tests** (Vitest) — coverage > 80%
  - Stores (cada acción y selector)
  - API client (error cases, retry logic)
  - Utility functions (cn, date formatting, perms)
  - Components aislados (sin server components)
- [ ] **Component tests** (Testing Library + Vitest)
  - `MessageItem` con replies, attachments, reactions
  - `ServerSettingsModal` tabs interactions
  - `MessageInput` autocomplete, emoji picker
- [ ] **E2E tests** (Playwright o Cypress)
  - Login flow completo
  - Send message en canal
  - Create server y agregar canales
  - Moderación: ban/kick member
- [ ] **Visual regression tests** (Chromatic o Percy)
  - Capturas de componentes críticos (Button, Modal, Message)
  - Detectar cambios de UI no intencionales

### DX & Tooling
- [ ] **ESLint improvements**
  - Custom rules para prohibit `any` types (excepto legacy)
  - Enforce `'use client'` directive en client components
  - Prefer `const` sobre `let`
  - No console.log en producción (eslint-plugin-no-console)
- [ ] **Pre-commit hooks** (husky + lint-staged)
  - Format con Prettier en staged files
  - Type check en types/*.ts changes
  - Lint en .tsx/.ts files
- [ ] **Commit convention** (conventional commits)
  - feat:, fix:, docs:, chore:, refactor:, test:, build:
  - Automate CHANGELOG generation con `standard-version`
- [ ] **Storybook** — Component library isolation
  - Add Storybook para develop y document components
  - Docs page con props table (auto-generated)
  - Interactive playground (como Discord UI library)
- [ ] **Error tracking** (Sentry o similar)
  - Capture frontend errors con stack traces
  - User context (userId, serverId) para debugging
  - Release tracking (frontend version en package.json)
  - Source maps upload en deploy

---

## 🐛 Bugs / Technical Debt

### Known Issues
- [ ] **Hydration mismatches** — Some components may have SSR/client mismatch
  - Check `useEffect` vs `useState` inicial
  - Random IDs (crypto.randomUUID debe ser same en SSR/CSR? → usar seed)
- [ ] **Memory leaks** — WebSocket event listeners no removidos
  - Asegurar `useWebSocket` cleanup en unmount
  - Zustand listeners (subscribe/unsubscribe)
  - Intervals/timeouts limpiados
- [ ] **Race conditions** — Multiple concurrent requests
  - Update de store después de async fetch puede sobreescribir
  - Message send/receive duplicate handling
- [ ] **Mobile UX issues**
  - Touch targets < 44px? (accesibilidad)
  - Virtual list scroll en móvil (scroll momentum)
  - Modals overflow en pantallas pequeñas
- [ ] **Accessibility** — Missing ARIA labels
  - Buttons sin `aria-label` (icon-only)
  - Dialogs deben tener `role="dialog"` y `aria-modal`
  - Focus trap en modales (tab cycle)
  - Skip links para navegación

### Code Quality
- [ ] **TypeScript strict mode** — Enable `strict: true` en tsconfig
  - Fix implicit `any` en código legacy
  - Non-null assertions (`!`) solo donde 100% seguro
- [ ] **Component refactor** — Extract large components
  - `ServerSettingsModal.main.tsx` está muy grande → split por tabs
  - `MessageItem.visual.tsx` — separar attachments, reactions, replies
  - `ChannelSidebar` — extraer_category_list component
- [ ] **Dead code elimination** — Borrar components no usados
  - `VoiceChannelRoom` si no implementado
  - Old components (check imports)
  - Unused stores o store methods
- [ ] **Consistent error handling**
  -所有 API errors deben ser atrapados y mostrar toast o UI error state
  - No `console.error` silencioso
  - Fallback UI para errores de carga (ErrorBoundary)
- [ ] **Prop drilling** —some components pass props through many layers
  - Considerar context o Zustand select para datos globales
  - Ej: activeServer, activeChannel accesibles desde cualquier nivel

---

## 📚 Documentation

- [ ] **Component library docs** — Storybook o MDX
  - Props table, ejemplos de uso
  - Do's and don'ts, accessibility notes
  - Variants (size, color, state)
- [ ] **Store API reference**
  - Cada store: state shape, actions, selectors
  - Ejemplos de uso en componentes
  - Performance notes (cuando re-renderiza)
- [ ] **Routing guide** — How App Router works en este proyecto
  - Route groups `(app)` vs `(auth)`
  - Layouts y templates
  - Server vs Client components boundary
- [ ] **WebSocket events reference**
  - Todos eventos con payload structure
  - Ejemplo de code para listen y dispatch
  - Common patterns (typing, presence updates)
- [ ] **Deployment guide** — Cómo deploy a Cloudflare Workers
  - Environment vars necesarias
  - Wrangler config explicada
  - Troubleshooting (limitaciones de Workers, polyfills)
  - Custom domain setup, SSL

---

## 🧪 Testing

- [ ] **Unit tests** — Componentes y hooks
  - Test de `useWebSocket` mockeando WS connection
  - Test de `useMessages` para paginación y CRUD
  - Test dehelpers de permisos (`canSendMessage`, etc.)
- [ ] **Integration tests** — Flujos completos
  - Login → redirigir a channels → send message
  - Create server → add members → assign roles → test permissions
  - Send DM → receive reply → close DM
- [ ] **Accessibility tests** — axe-core
  - Run axe en páginas críticas (login, chat, settings)
  - Fix violations (color contrast, aria attributes)
- [ ] **Responsive tests** — Viewport sizes
  - Mobile (375px), Tablet (768px), Desktop (1280px)
  - Breakpoints correctos en Tailwind config
  - Sidebar collapse/expand en mobile
- [ ] **Cross-browser tests**
  - Chrome, Firefox, Safari, Edge latest
  - Mobile Safari (iOS) y Chrome (Android)
  - Polyfills necesarios? (whatwg-fetch, URLSearchParams)

---

## 📦 Dependencies & Maintenance

- [ ] **Auditar dependencies** con `npm audit`
  - Actualizar packages con vulnerabilidades conocidas
  - Lockfile version bump (package-lock.json)
- [ ] **Next.js upgrade path** — Monitorear Next 16 estable
  - Actualizar desde 16.2.1 a 16.x latest
  - Breaking changes de RSC/Vite integration
- [ ] **React upgrade** — 19.2 → 19.3 o 20 (cuando salga)
  - Compatibility con next-vite
  - Linting de hooks reglas (exhaustive-deps)
- [ ] **Reduce bundle size**
  - `lucide-react` tree-shaking, import solo icons usados
  - `emoji-mart` data bundle reduction (custom emoji set?)
  - `motion` solo importar needed components
- [ ] **Unused dependencies removal**
  - `react-icons` — solo se usa? revisar
  - `clsx` vs `classnames` (ya es clsx)
  - `date-fns` tamaño, considerar `dayjs` más ligero?

---

## 🔄 Workstreams por Prioridad

### Workstream 1: Core UX (Mes 1-2)
1. Search (UI + API integration)
2. Threads (UI + WS events)
3. Drag & drop reordering
4. Keyboard shortcuts

### Workstream 2: Engagement (Mes 3-4)
1. Polls
2. Scheduled messages
3. Events/Calendar
4. Push notifications

### Workstream 3: Platform (Mes 4-6)
1. Bots & slash commands (backend-first)
2. Server discovery
3. User profiles mejoradas
4. Whiteboard

### Workstream 4: Polish (Mes 5-6)
1. Accessibility overhaul
2. Mobile app (Capacitor)
3. Offline mode
4. Load testing & performance optimization

### Workstream 5: Scale (6+ meses)
1. Bots platform complete
2. Monetization features
3. Moderation dashboard
4. Multi-region latency optimization

---

## Métricas de Éxito

- **LCP** < 2.5s (Core Web Vitals)
- **CLS** < 0.1
- **FID** < 100ms
- **Bundle size** < 200KB gzip initial
- **Time to interactive** < 3s en 3G
- **PWA Lighthouse score** > 90
- **WCAG 2.1 AA compliance** (accessibility)
- **Error rate** < 0.1% (Sentry)
- **User engagement**: avg session duration > 15min

---

*Este roadmap es vivo. Se revisa y ajusta cada mes.*
