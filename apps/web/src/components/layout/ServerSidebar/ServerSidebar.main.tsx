'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useServersStore } from '@/stores/serversStore'
import { useShallow } from 'zustand/react/shallow'
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { cn } from '@/lib/cn'
import type { Channel, Server } from '@/lib/types'
import { ServerPreviewCard } from '@/components/layout/ServerPreviewCard'
import { Crown, Hash, LoaderCircle, MessageSquare, Plus, Volume2, X } from 'lucide-react'
import { ApiRequestError, resolveMediaUrl, serversApi } from '@/lib/api'
import { isMockSession } from '@/lib/mock-init'
import { useAuthStore } from '@/stores/authStore'
import { useUnreadStore } from '@/stores/unreadStore/unreadStore.store'
import type { ServerMember, User } from '@/lib/types'
import { UserAvatarImage } from '@/components/user/UserAvatar/UserAvatarImage.module'
import { AppModalShell } from '@/components/ui/AppModalShell.main'

export function ServerSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const mockMode = isMockSession()
  const servers = useServersStore(useShallow((s) => Object.values(s.servers)))
  const channels = useServersStore(useShallow((s) => Object.values(s.channels)))
  const unreadByChannel = useUnreadStore((state) => state.channels)
  const upsertServer = useServersStore((s) => s.upsertServer)
  const upsertChannel = useServersStore((s) => s.upsertChannel)
  const setChannels = useServersStore((s) => s.setChannels)
  const setRoles = useServersStore((s) => s.setRoles)
  const setMembers = useServersStore((s) => s.setMembers)
  const meId = useAuthStore((s) => s.user?.id ?? 'user-me')
  const [showCreate, setShowCreate] = useState(false)
  const [newServerName, setNewServerName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ server: Server; x: number; y: number } | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const isDMs = pathname.startsWith('/channels/@me') || pathname.startsWith('/friends')
  const dmUnreadCount = channels.reduce((sum, channel) => {
    if (channel.serverId != null) return sum
    return sum + (unreadByChannel[channel.id]?.unreadCount ?? 0)
  }, 0)
  const getServerHref = (serverId: string) => {
    const firstChannel = [...channels]
      .filter((ch) => ch.serverId === serverId && ch.type === 'text')
      .sort((a, b) => a.position - b.position)[0]
    return firstChannel ? `/channels/${serverId}/${firstChannel.id}` : `/channels/${serverId}`
  }

  const openServerPreview = (event: ReactMouseEvent<HTMLAnchorElement>, server: Server) => {
    event.preventDefault()
    const width = 360
    const height = 360
    const margin = 24
    const designViewportWidth = 1920
    const leftOffset = 1460
    const fixedX = designViewportWidth - width - margin - leftOffset
    const maxX = window.innerWidth - width - margin
    const x = Math.min(Math.max(margin, fixedX), maxX)
    const y = Math.min(72, Math.max(margin, window.innerHeight - height - margin))
    setPreview({ server, x, y })
  }

  useEffect(() => {
    if (!preview) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (previewRef.current && !previewRef.current.contains(target)) {
        setPreview(null)
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreview(null)
    }
    window.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [preview])

  const closeCreate = () => {
    setShowCreate(false)
    setNewServerName('')
    setCreateError(null)
    setIsCreating(false)
  }

  const createMockServer = (name: string) => {
    const base = `mock-${Date.now()}`
    const serverId = `server-${base}`
    const catInfoId = `cat-info-${base}`
    const catGenId = `cat-gen-${base}`
    const createdAt = new Date().toISOString()

    const chReglas = `ch-reglas-${base}`
    const chBienvenida = `ch-bienvenida-${base}`
    const chGeneral = `ch-general-${base}`
    const chVoz = `ch-voz-${base}`

    upsertServer({
      id: serverId,
      name,
      description: null,
      iconUrl: null,
      bannerUrl: null,
      ownerId: meId,
      inviteCode: base,
      isPublic: false,
      memberCount: 1,
      createdAt,
    })

    setChannels(
      serverId,
      [
        {
          id: chReglas,
          serverId,
          categoryId: catInfoId,
          name: 'reglas',
          topic: null,
          type: 'text',
          position: 0,
          isNsfw: false,
          slowmodeSeconds: 0,
          lastMessageId: null,
          createdAt,
        },
        {
          id: chBienvenida,
          serverId,
          categoryId: catInfoId,
          name: 'bienvenida',
          topic: null,
          type: 'text',
          position: 1,
          isNsfw: false,
          slowmodeSeconds: 0,
          lastMessageId: null,
          createdAt,
        },
        {
          id: chGeneral,
          serverId,
          categoryId: catGenId,
          name: 'chat-general',
          topic: null,
          type: 'text',
          position: 0,
          isNsfw: false,
          slowmodeSeconds: 0,
          lastMessageId: null,
          createdAt,
        },
        {
          id: chVoz,
          serverId,
          categoryId: catGenId,
          name: 'voz-general',
          topic: null,
          type: 'voice',
          position: 1,
          isNsfw: false,
          slowmodeSeconds: 0,
          lastMessageId: null,
          createdAt,
        },
      ],
      [
        { id: catInfoId, serverId, name: 'INFORMACIÓN', position: 0 },
        { id: catGenId, serverId, name: 'GENERAL', position: 1 },
      ]
    )

    const meUser = useAuthStore.getState().user
    if (meUser) {
      const ownerMember: ServerMember = {
        serverId,
        userId: meId,
        nickname: null,
        joinedAt: createdAt,
        roles: [],
        user: meUser as User,
      }
      setMembers(serverId, [ownerMember])
    }

    closeCreate()
    router.push(`/channels/${serverId}/${chGeneral}`)
  }

  const handleCreateServer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = newServerName.trim()
    if (!name) {
      setCreateError('Escribe un nombre para el servidor.')
      return
    }

    setCreateError(null)
    setIsCreating(true)

    if (mockMode) {
      createMockServer(name)
      return
    }

    try {
      const res = await serversApi.create({ name })
      const { channels, categories, roles, ...server } = res.data
      upsertServer(server)
      if (channels?.length) {
        setChannels(server.id, channels, categories ?? [])
      }
      if (roles?.length) {
        setRoles(server.id, roles)
      }
      closeCreate()
      const firstText = channels?.find((channel: Channel) => channel.type === 'text')
      router.push(firstText ? `/channels/${server.id}/${firstText.id}` : `/channels/${server.id}`)
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setCreateError(error.message)
      } else {
        setCreateError('No se pudo crear el servidor.')
      }
      setIsCreating(false)
    }
  }

  return (
    <>
      <nav className="scrollable relative z-20 flex h-full w-[72px] flex-col items-center gap-1 overflow-y-auto overflow-x-hidden bg-[var(--s0)] pb-3 pt-3">
        <ServerIcon
          href="/channels/@me"
          active={isDMs}
          tooltip="Direct Messages"
          isHome
          unreadCount={dmUnreadCount}
        />

        {servers.map((server) => {
          const active = pathname.startsWith(`/channels/${server.id}`)
          return (
            <ServerIcon
              key={server.id}
              href={getServerHref(server.id)}
              active={active}
              tooltip={server.name}
              iconUrl={resolveMediaUrl(server.iconUrl) ?? null}
              name={server.name}
              onContextMenu={(event) => openServerPreview(event, server)}
            />
          )
        })}

        <button
          onClick={() => setShowCreate(true)}
          className="group relative flex h-12 w-12 items-center justify-center"
          data-tooltip="Add a server"
        >
          <div className="absolute inset-0 rounded-[24px] bg-[var(--s2)] transition-all duration-200 group-hover:rounded-[16px] group-hover:bg-[var(--online)]" />
          <Plus
            size={20}
            className="relative z-10 text-[var(--online)] transition-colors group-hover:text-white"
          />
        </button>
      </nav>

      {preview && (
        <ServerPreviewCard
          containerRef={previewRef}
          server={preview.server}
          x={preview.x}
          y={preview.y}
        />
      )}

      <AppModalShell
        open={showCreate}
        onClose={closeCreate}
        panelClassName="w-full max-w-sm rounded-2xl border border-[var(--b1)] bg-[var(--s2)] shadow-xl"
        overlayClassName="z-[80]"
        closeDisabled={isCreating}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--b1)] px-5 py-4">
          <h2 className="font-display font-700 text-lg text-[var(--t0)]">Crear servidor</h2>
          <button
            type="button"
            onClick={closeCreate}
            className="rounded-md p-1 text-[var(--t4)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--t1)]"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleCreateServer}>
          <div className="space-y-4 px-5 py-4">
            {/* Name input */}
            <div>
              <label
                htmlFor="server-name"
                className="font-700 mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-[var(--t4)]"
              >
                Nombre del servidor
              </label>
              <input
                id="server-name"
                value={newServerName}
                onChange={(event) => setNewServerName(event.target.value)}
                placeholder="Mi servidor"
                className="h-9 w-full rounded-md border border-[var(--b1)] bg-[var(--s4)] px-3 text-sm text-[var(--t1)] outline-none transition-colors placeholder:text-[var(--t4)] focus:border-[var(--b3)]"
                autoFocus
                maxLength={100}
              />
              {createError && <p className="text-ember mt-1.5 text-[12px]">{createError}</p>}
            </div>

            {mockMode && (
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2.5">
                <p className="font-700 text-[11px] uppercase tracking-[0.14em] text-amber-300">
                  Modo dev activo
                </p>
                <p className="mt-1 text-[12px] leading-5 text-amber-100/90">
                  Este servidor se creara solo en memoria para la demo visual y se perdera al
                  recargar. Para guardarlo en la base de datos, sal de `/dev` o limpia
                  `dcc_dev_mode` de `sessionStorage`.
                </p>
              </div>
            )}

            {/* Default channels preview */}
            <div>
              <p className="font-700 mb-2 text-[10px] uppercase tracking-[0.16em] text-[var(--t4)]">
                Canales por defecto
              </p>
              <div className="overflow-hidden rounded-lg border border-[var(--b1)] bg-[var(--s3)]">
                <div className="border-b border-[var(--b0)] px-3 py-2">
                  <p className="font-700 text-[10px] uppercase tracking-[0.14em] text-[var(--t4)]">
                    Información
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 text-[var(--t3)]">
                  <Hash size={13} className="shrink-0" />
                  <span className="text-[12px]">reglas</span>
                </div>
                <div className="flex items-center gap-2 border-b border-[var(--b0)] px-3 py-1.5 text-[var(--t3)]">
                  <Hash size={13} className="shrink-0" />
                  <span className="text-[12px]">bienvenida</span>
                </div>
                <div className="border-b border-[var(--b0)] px-3 py-2">
                  <p className="font-700 text-[10px] uppercase tracking-[0.14em] text-[var(--t4)]">
                    General
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 text-[var(--t3)]">
                  <Hash size={13} className="shrink-0" />
                  <span className="text-[12px]">chat-general</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 text-[var(--t3)]">
                  <Volume2 size={13} className="shrink-0" />
                  <span className="text-[12px]">voz-general</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-[var(--b1)] px-5 py-3">
            <button
              type="button"
              onClick={closeCreate}
              className="font-600 rounded-md px-3 py-1.5 text-[13px] text-[var(--t3)] transition-colors hover:text-[var(--t1)]"
              disabled={isCreating}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="font-700 inline-flex items-center gap-2 rounded-md bg-[var(--ember)] px-4 py-1.5 text-[13px] text-[var(--ember-contrast)] transition-opacity hover:opacity-90 disabled:opacity-60"
              disabled={isCreating}
            >
              {isCreating && <LoaderCircle size={13} className="animate-spin" />}
              {mockMode ? 'Crear temporalmente' : 'Crear servidor'}
            </button>
          </div>
        </form>
      </AppModalShell>
    </>
  )
}

interface ServerIconProps {
  href: string
  active: boolean
  tooltip: string
  iconUrl?: string | null
  name?: string
  isHome?: boolean
  unreadCount?: number
  onContextMenu?: (event: ReactMouseEvent<HTMLAnchorElement>) => void
}

function ServerIcon({
  href,
  active,
  tooltip,
  iconUrl,
  name,
  isHome,
  unreadCount = 0,
  onContextMenu,
}: ServerIconProps) {
  const initials = name
    ? name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('')
    : ''

  return (
    <Link
      href={href}
      className="group relative flex h-12 w-12 items-center justify-center"
      data-tooltip={tooltip}
      onContextMenu={onContextMenu}
    >
      <span
        className={cn(
          'absolute -left-3 h-full w-1 origin-center rounded-r-full bg-white transition-all duration-200',
          active
            ? 'scale-y-100 opacity-100'
            : 'scale-y-0 opacity-0 group-hover:scale-y-50 group-hover:opacity-100'
        )}
      />
      <div
        className={cn(
          'surface-elevated relative flex h-12 w-12 items-center justify-center overflow-hidden transition-all duration-200',
          active ? 'rounded-[16px]' : 'rounded-[24px] group-hover:rounded-[16px]',
          isHome
            ? active
              ? 'bg-ember'
              : 'group-hover:bg-ember bg-[var(--s2)]'
            : iconUrl
              ? ''
              : active
                ? 'bg-ember'
                : 'group-hover:bg-ember bg-[var(--s2)]'
        )}
      >
        {isHome ? (
          <MessageSquare
            size={22}
            className={cn(
              'transition-colors',
              active
                ? 'text-[var(--ember-contrast)]'
                : 'text-ember group-hover:text-[var(--ember-contrast)]'
            )}
          />
        ) : iconUrl ? (
          <UserAvatarImage src={iconUrl} alt={name ?? tooltip} status="online" />
        ) : (
          <span
            className={cn(
              'font-display font-700 text-[13px] transition-colors',
              active
                ? 'text-[var(--ember-contrast)]'
                : 'text-[var(--t1)] group-hover:text-[var(--ember-contrast)]'
            )}
          >
            {initials}
          </span>
        )}
      </div>
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#ED4245] px-1 text-[10px] font-700 text-white ring-2 ring-[var(--s0)]">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
