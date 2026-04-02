# Arquitectura de UI (Discord-like)

Este documento describe cómo está estructurado el frontend para mantener un layout tipo Discord consistente (rail de servidores → sidebar de canales/DMs → contenido principal → lista de miembros).

## 1) Zonas del layout

**1. ServerSidebar (rail izquierdo)**  
- Ancho fijo (72px).  
- Siempre visible en desktop y mobile (es el “ancla” para cambiar de servidor o volver a DMs).

**2. Sidebar de contexto (DMs o Canales)**  
- `DMSidebar`: para `/channels/@me/*` y `/friends`.  
- `ChannelSidebar`: para `/channels/[serverId]/*`.
- En desktop se muestra fijo; en mobile se abre como **drawer** (overlay) usando `MobileSidebarShell`.

**3. Contenido principal**  
- Chat, friends, home, etc.  
- Debe usar `min-w-0` y `overflow-hidden` para evitar “desbordes” horizontales con flexbox.

**4. MemberSidebar (derecha)**  
- Solo en vistas de servidor (canales).  
- En desktop vive a la derecha; en mobile aparece como overlay cuando el usuario la abre desde el header.

## 2) Routing & Layouts (Next.js App Router)

**App shell (autenticado)**  
`src/routes/app-shell/AppLayout.main.tsx` monta **una sola vez**:
- `ServerSidebar`
- `UserPanel`
- `children` (rutas app)

**Layouts anidados**  
- `src/app/(app)/channels/@me/layout.tsx` → envuelve contenido con `DMSidebar` usando `MobileSidebarShell`.
- `src/app/(app)/channels/[serverId]/layout.tsx` → envuelve contenido con `ChannelSidebar` usando `MobileSidebarShell`.
- `src/app/(app)/friends/layout.tsx` → envuelve contenido con `DMSidebar` usando `MobileSidebarShell`.

Esto evita duplicar UI en cada `page.tsx` y hace más fácil iterar el diseño.

## 3) Responsive (drawer en mobile)

`MobileSidebarShell`:
- Mantiene el sidebar montado (sin duplicar data-fetch).
- En `<md` lo esconde y lo muestra como overlay con scrim.
- Expone `useMobileSidebar()` para abrir/cerrar desde headers o botones.

Uso recomendado:
- En headers: botón “hamburger” (`md:hidden`) que llama `mobileSidebar.toggle()`.
- En pantallas sin header (ej. Home de DMs), colocar un botón en la parte superior del contenido.

## 4) Sistema de diseño (tokens)

Los tokens viven en:
- `src/styles/globals.css` (CSS custom properties)
- `tailwind.config.ts` (mapeo a `colors.s.*`, `colors.t.*`, etc.)

Reglas prácticas:
- **Superficies**: `--s0..--s7` (la elevación sube “aclarando” en dark mode).
- **Texto**: `--t0..--t4` (evitar blanco puro en body).
- **Acentos**: `--ember` (primario) y `--volt` (secundario).
- Componentes: priorizar `bg-[var(--sX)]`, `text-[var(--tX)]`, `border-[var(--bX)]`.

