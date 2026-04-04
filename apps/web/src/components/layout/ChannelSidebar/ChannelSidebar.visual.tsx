'use client'

import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  Hash,
  Home,
  MonitorUp,
  Plus,
  Settings2,
  Shield,
  UserPlus,
  Volume2,
  X,
} from 'lucide-react'
import { resolveMediaUrl } from '@/lib/api'
import { getChannelNameTextStyle } from '@/lib/channel-appearance/channelAppearance.shared'
import { getChannelIconComponent } from '@/lib/channel-icons/channelIcons.shared'
import { cn } from '@/lib/cn'
import {
  AnimatePresence,
  itemVariants,
  listVariants,
  motion,
} from '@/lib/motion'
import { useMobileSidebar } from '@/components/layout/MobileSidebarShell'
import { InviteLinkModal } from '@/components/layout/InviteLinkModal'
import { ServerSettingsModal } from '@/components/layout/ServerSettingsModal'
import { AppModalShell } from '@/components/ui/AppModalShell.main'
import { type ChannelSidebarItem, type ChannelSidebarVisualProps } from './ChannelSidebar.shared'

type SidebarDropTarget =
  | { kind: 'channel'; channelId: string; placement: 'before' | 'after' }
  | { kind: 'channel-list'; categoryId: string | null }
  | { kind: 'category'; categoryId: string; placement: 'before' | 'after' }

type SidebarDragItem =
  | { kind: 'channel'; id: string }
  | { kind: 'category'; id: string }

const SIDEBAR_DRAG_MIME = 'application/x-dcc-sidebar-structure'

export function ChannelSidebarVisual({
  resolvedServerId,
  serverName,
  bannerBackground,
  canOpenServerSettings,
  canCreateChannels,
  canManageChannels,
  uncategorizedChannels,
  categorizedChannels,
  isInviteModalOpen,
  isServerSettingsOpen,
  serverSettingsInitialSection,
  serverSettingsInitialSelection,
  isCreateChannelModalOpen,
  createChannelName,
  createChannelType,
  isCreatingChannel,
  createChannelError,
  onToggleCategory,
  onOpenInviteModal,
  onCloseInviteModal,
  onOpenServerSettings,
  onOpenChannelSettings,
  onMoveChannel,
  onMoveCategory,
  onCloseServerSettings,
  onOpenCreateChannelModal,
  onCloseCreateChannelModal,
  onCreateChannelNameChange,
  onCreateChannelTypeChange,
  onSubmitCreateChannel,
}: ChannelSidebarVisualProps) {
  const hasVoiceActivity =
    uncategorizedChannels.some((channel) => (channel.voiceParticipants?.length ?? 0) > 0) ||
    categorizedChannels.some((group) =>
      group.channels.some((channel) => (channel.voiceParticipants?.length ?? 0) > 0)
    )
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [dragItem, setDragItem] = useState<SidebarDragItem | null>(null)
  const [dropTarget, setDropTarget] = useState<SidebarDropTarget | null>(null)
  const [justDraggedKey, setJustDraggedKey] = useState<string | null>(null)
  const justDraggedTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!hasVoiceActivity) return

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [hasVoiceActivity])

  useEffect(
    () => () => {
      if (justDraggedTimeoutRef.current !== null) {
        window.clearTimeout(justDraggedTimeoutRef.current)
      }
    },
    []
  )

  if (!resolvedServerId) {
    return (
      <aside className="flex h-full w-80 flex-col bg-[var(--s1)]">
        <div className="flex h-full items-center justify-center px-4 text-center text-sm text-[var(--t4)]">
          Cargando servidor...
        </div>
      </aside>
    )
  }

  const clearDragState = () => {
    setDragItem(null)
    setDropTarget(null)
  }

  const markJustDragged = (item: SidebarDragItem) => {
    const nextKey = `${item.kind}:${item.id}`
    setJustDraggedKey(nextKey)
    if (justDraggedTimeoutRef.current !== null) {
      window.clearTimeout(justDraggedTimeoutRef.current)
    }
    justDraggedTimeoutRef.current = window.setTimeout(() => {
      setJustDraggedKey(null)
      justDraggedTimeoutRef.current = null
    }, 160)
  }

  const handleChannelDragStart = (event: DragEvent<HTMLElement>, channelId: string) => {
    event.stopPropagation()
    event.dataTransfer.effectAllowed = 'move'
    const nextItem = { kind: 'channel', id: channelId } satisfies SidebarDragItem
    event.dataTransfer.setData('text/plain', channelId)
    event.dataTransfer.setData(SIDEBAR_DRAG_MIME, JSON.stringify(nextItem))
    setDragItem(nextItem)
    setDropTarget(null)
  }

  const handleCategoryDragStart = (event: DragEvent<HTMLElement>, categoryId: string) => {
    event.stopPropagation()
    event.dataTransfer.effectAllowed = 'move'
    const nextItem = { kind: 'category', id: categoryId } satisfies SidebarDragItem
    event.dataTransfer.setData('text/plain', categoryId)
    event.dataTransfer.setData(SIDEBAR_DRAG_MIME, JSON.stringify(nextItem))
    setDragItem(nextItem)
    setDropTarget(null)
  }

  return (
    <motion.aside
      className="flex h-full w-80 flex-col bg-[var(--s1)]"
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.34 }}
    >
      <div className="surface-elevated group relative flex h-28 w-full items-end overflow-hidden border-b border-[var(--b0)] px-4 pb-3 transition-colors">
        <span
          className="absolute inset-0 bg-cover bg-center opacity-70 transition-opacity duration-200 group-hover:opacity-85"
          style={{ backgroundImage: bannerBackground }}
        />
        <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.2),rgba(0,0,0,0.6))]" />
        {canOpenServerSettings ? (
          <button
            type="button"
            onClick={onOpenServerSettings}
            className="relative flex min-w-0 items-center gap-1.5"
          >
            <span className="font-display font-700 truncate text-[16px] text-white">
              {serverName}
            </span>
            <ChevronDown
              size={18}
              className="shrink-0 text-white/80 transition-colors group-hover:text-white"
            />
          </button>
        ) : (
          <span className="font-display font-700 relative truncate text-[16px] text-white">
            {serverName}
          </span>
        )}
        <div className="relative ml-auto flex items-center gap-1.5">
          {canCreateChannels ? (
            <button
              type="button"
              onClick={() => onOpenCreateChannelModal(null)}
              className="rounded-md p-1.5 text-white/80 transition-colors hover:text-white"
              data-tooltip="Create channel"
            >
              <Plus size={17} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onOpenInviteModal}
            className="rounded-md p-1.5 text-white/80 transition-colors hover:text-white"
          >
            <UserPlus size={17} />
          </button>
        </div>
      </div>

      <motion.div
        className="scrollable flex-1 px-5 py-5"
        initial="hidden"
        animate="visible"
        variants={listVariants(0.05, 0.04)}
      >
        {canManageChannels && dragItem?.kind === 'channel' ? (
          <div
            onDragOver={(event) => {
              event.preventDefault()
              setDropTarget({ kind: 'channel-list', categoryId: null })
            }}
            onDrop={(event) => {
              event.preventDefault()
              if (dragItem.kind !== 'channel') return
              void onMoveChannel(dragItem.id, { kind: 'category', categoryId: null })
              clearDragState()
            }}
            className={cn(
              'mb-3 flex min-h-10 items-center justify-center rounded-xl border border-dashed px-3 text-center text-[11px] font-700 uppercase tracking-[0.12em] transition-colors',
              dropTarget?.kind === 'channel-list' && dropTarget.categoryId === null
                ? 'border-[var(--ember)] bg-[var(--ember)]/10 text-[var(--ember)]'
                : 'border-[var(--b1)] bg-[var(--s2)] text-[var(--t4)]'
            )}
          >
            Mover a sin categoria
          </div>
        ) : null}

        {uncategorizedChannels.map((channel) => (
          <motion.div key={channel.id} variants={itemVariants}>
            <ChannelItem
              item={channel}
              nowMs={nowMs}
              canManageChannels={canManageChannels}
              isDragging={dragItem?.kind === 'channel' && dragItem.id === channel.id}
              isDropTargetBefore={
                dropTarget?.kind === 'channel' &&
                dropTarget.channelId === channel.id &&
                dropTarget.placement === 'before'
              }
              isDropTargetAfter={
                dropTarget?.kind === 'channel' &&
                dropTarget.channelId === channel.id &&
                dropTarget.placement === 'after'
              }
              justDraggedKey={justDraggedKey}
              onChannelDragStart={handleChannelDragStart}
              onChannelDragEnd={(itemId) => {
                if (dragItem?.kind === 'channel' && dragItem.id === itemId) {
                  markJustDragged(dragItem)
                }
                clearDragState()
              }}
              onChannelDragOver={(event) => {
                const currentDragItem = readSidebarDragItem(event) ?? dragItem
                if (currentDragItem?.kind !== 'channel') return
                event.preventDefault()
                setDropTarget({
                  kind: 'channel',
                  channelId: channel.id,
                  placement: getDropPlacement(event),
                })
              }}
              onChannelDrop={(event) => {
                const currentDragItem = readSidebarDragItem(event) ?? dragItem
                if (currentDragItem?.kind !== 'channel') return
                event.preventDefault()
                void onMoveChannel(currentDragItem.id, {
                  kind: 'channel',
                  channelId: channel.id,
                  placement: getDropPlacement(event),
                })
                clearDragState()
              }}
              onOpenChannelSettings={onOpenChannelSettings}
            />
          </motion.div>
        ))}

        {categorizedChannels.map((group) => (
          <motion.div key={group.id} className="mt-4" variants={itemVariants}>
            <div className="group mb-0.5 flex items-center gap-1 px-2 py-0.5">
              <button
                type="button"
                onClick={() => {
                  if (justDraggedKey === `category:${group.id}`) return
                  onToggleCategory(group.id)
                }}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-1 rounded-lg px-1 py-0.5 text-left transition-colors',
                  canManageChannels && 'cursor-grab active:cursor-grabbing',
                  dragItem?.kind === 'category' && dragItem.id === group.id && 'opacity-40'
                )}
                draggable={canManageChannels}
                onDragStart={(event) => handleCategoryDragStart(event, group.id)}
                onDragEnd={() => {
                  if (dragItem?.kind === 'category' && dragItem.id === group.id) {
                    markJustDragged(dragItem)
                  }
                  clearDragState()
                }}
                onDragOver={(event) => {
                  const currentDragItem = readSidebarDragItem(event) ?? dragItem
                  if (!currentDragItem) return
                  event.preventDefault()
                  if (currentDragItem.kind === 'channel') {
                    setDropTarget({ kind: 'channel-list', categoryId: group.id })
                    return
                  }
                  setDropTarget({
                    kind: 'category',
                    categoryId: group.id,
                    placement: getDropPlacement(event),
                  })
                }}
                onDrop={(event) => {
                  const currentDragItem = readSidebarDragItem(event) ?? dragItem
                  if (!currentDragItem) return
                  event.preventDefault()
                  if (currentDragItem.kind === 'channel') {
                    void onMoveChannel(currentDragItem.id, { kind: 'category', categoryId: group.id })
                  } else {
                    void onMoveCategory(currentDragItem.id, {
                      categoryId: group.id,
                      placement: getDropPlacement(event),
                    })
                  }
                  clearDragState()
                }}
              >
                <ChevronDown
                  size={12}
                  className={cn(
                    'shrink-0 text-[var(--t3)] transition-all group-hover:text-[var(--t2)]',
                    group.collapsed && '-rotate-90'
                  )}
                />
                <span
                  className={cn(
                    'sidebar-section-label truncate rounded-md px-1.5 py-0.5 text-left transition-colors',
                    dropTarget?.kind === 'channel-list' && dropTarget.categoryId === group.id
                      ? 'bg-[var(--ember)]/12 text-[var(--ember)]'
                      : dropTarget?.kind === 'category' && dropTarget.categoryId === group.id
                        ? 'bg-[var(--surface-soft)] text-[var(--t1)]'
                        : ''
                  )}
                >
                  {group.name}
                </span>
              </button>
              {canCreateChannels ? (
                <button
                  type="button"
                  className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => onOpenCreateChannelModal(group.id)}
                  data-tooltip="Create channel"
                >
                  <Plus size={14} className="text-[var(--t3)] hover:text-[var(--t1)]" />
                </button>
              ) : null}
            </div>

            <AnimatePresence initial={false}>
              {!group.collapsed && dragItem?.kind === 'channel' && group.channels.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <div
                    onDragOver={(event) => {
                      event.preventDefault()
                      setDropTarget({ kind: 'channel-list', categoryId: group.id })
                    }}
                    onDrop={(event) => {
                      event.preventDefault()
                      if (dragItem.kind !== 'channel') return
                      void onMoveChannel(dragItem.id, { kind: 'category', categoryId: group.id })
                      clearDragState()
                    }}
                    className={cn(
                      'ml-6 mt-1 rounded-xl border border-dashed px-3 py-3 text-center text-[11px] font-700 uppercase tracking-[0.12em] transition-colors',
                      dropTarget?.kind === 'channel-list' && dropTarget.categoryId === group.id
                        ? 'border-[var(--ember)] bg-[var(--ember)]/10 text-[var(--ember)]'
                        : 'border-[var(--b1)] bg-[var(--s2)] text-[var(--t4)]'
                    )}
                  >
                    Soltar canal aqui
                  </div>
                </motion.div>
              ) : null}
              {!group.collapsed &&
                group.channels.map((channel) => (
                  <motion.div
                    key={channel.id}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                  >
                    <ChannelItem
                      item={channel}
                      nowMs={nowMs}
                      canManageChannels={canManageChannels}
                      isDragging={dragItem?.kind === 'channel' && dragItem.id === channel.id}
                      isDropTargetBefore={
                        dropTarget?.kind === 'channel' &&
                        dropTarget.channelId === channel.id &&
                        dropTarget.placement === 'before'
                      }
                      isDropTargetAfter={
                        dropTarget?.kind === 'channel' &&
                        dropTarget.channelId === channel.id &&
                        dropTarget.placement === 'after'
                      }
                      justDraggedKey={justDraggedKey}
                      onChannelDragStart={handleChannelDragStart}
                      onChannelDragEnd={(itemId) => {
                        if (dragItem?.kind === 'channel' && dragItem.id === itemId) {
                          markJustDragged(dragItem)
                        }
                        clearDragState()
                      }}
                      onChannelDragOver={(event) => {
                        const currentDragItem = readSidebarDragItem(event) ?? dragItem
                        if (currentDragItem?.kind !== 'channel') return
                        event.preventDefault()
                        setDropTarget({
                          kind: 'channel',
                          channelId: channel.id,
                          placement: getDropPlacement(event),
                        })
                      }}
                      onChannelDrop={(event) => {
                        const currentDragItem = readSidebarDragItem(event) ?? dragItem
                        if (currentDragItem?.kind !== 'channel') return
                        event.preventDefault()
                        void onMoveChannel(currentDragItem.id, {
                          kind: 'channel',
                          channelId: channel.id,
                          placement: getDropPlacement(event),
                        })
                        clearDragState()
                      }}
                      onOpenChannelSettings={onOpenChannelSettings}
                    />
                  </motion.div>
                ))}
            </AnimatePresence>
          </motion.div>
        ))}
      </motion.div>

      <InviteLinkModal
        isOpen={isInviteModalOpen}
        serverId={resolvedServerId}
        onClose={onCloseInviteModal}
      />
      {canOpenServerSettings ? (
        <ServerSettingsModal
          open={isServerSettingsOpen}
          serverId={resolvedServerId}
          {...(serverSettingsInitialSection !== undefined
            ? { initialSection: serverSettingsInitialSection }
            : {})}
          {...(serverSettingsInitialSelection !== undefined
            ? { initialSelection: serverSettingsInitialSelection }
            : {})}
          onClose={onCloseServerSettings}
        />
      ) : null}

      <AppModalShell
        open={isCreateChannelModalOpen}
        onClose={onCloseCreateChannelModal}
        panelClassName="w-full max-w-sm rounded-2xl border border-[var(--b1)] bg-[var(--s2)] shadow-xl"
        overlayClassName="z-[85]"
        closeDisabled={isCreatingChannel}
      >
        <div className="flex items-center justify-between border-b border-[var(--b1)] px-5 py-4">
          <h2 className="font-display font-700 text-lg text-[var(--t0)]">Crear canal</h2>
          <button
            type="button"
            onClick={onCloseCreateChannelModal}
            className="rounded-md p-1 text-[var(--t4)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--t1)]"
          >
            <X size={15} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="font-700 mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-[var(--t4)]">
              Nombre del canal
            </label>
            <input
              value={createChannelName}
              onChange={(event) => onCreateChannelNameChange(event.target.value)}
              placeholder={createChannelType === 'voice' ? 'voz-general' : 'nuevo-canal'}
              className="h-9 w-full rounded-md border border-[var(--b1)] bg-[var(--s4)] px-3 text-sm text-[var(--t1)] outline-none transition-colors placeholder:text-[var(--t4)] focus:border-[var(--b3)]"
              autoFocus
              maxLength={100}
            />
            {createChannelError ? (
              <p className="text-ember mt-1.5 text-[12px]">{createChannelError}</p>
            ) : null}
          </div>

          <div>
            <p className="font-700 mb-2 text-[10px] uppercase tracking-[0.16em] text-[var(--t4)]">
              Tipo de canal
            </p>
            <div className="grid grid-cols-2 gap-2">
              <ChannelTypeButton
                active={createChannelType === 'text'}
                icon={<Hash size={16} />}
                title="Texto"
                description="Mensajes y archivos"
                onClick={() => onCreateChannelTypeChange('text')}
              />
              <ChannelTypeButton
                active={createChannelType === 'voice'}
                icon={<Volume2 size={16} />}
                title="Voz"
                description="Sala para unirse"
                onClick={() => onCreateChannelTypeChange('voice')}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--b1)] px-5 py-3">
          <button
            type="button"
            onClick={onCloseCreateChannelModal}
            className="font-600 rounded-md px-3 py-1.5 text-[13px] text-[var(--t3)] transition-colors hover:text-[var(--t1)]"
            disabled={isCreatingChannel}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSubmitCreateChannel}
            className="font-700 rounded-md bg-[var(--ember)] px-4 py-1.5 text-[13px] text-[var(--ember-contrast)] transition-opacity hover:opacity-90 disabled:opacity-60"
            disabled={isCreatingChannel}
          >
            {isCreatingChannel ? 'Creando...' : 'Crear canal'}
          </button>
        </div>
      </AppModalShell>
    </motion.aside>
  )
}

function readSidebarDragItem(event: DragEvent<HTMLElement>): SidebarDragItem | null {
  const serializedItem = event.dataTransfer.getData(SIDEBAR_DRAG_MIME)
  if (!serializedItem) return null

  try {
    const parsedItem = JSON.parse(serializedItem) as SidebarDragItem
    if (
      parsedItem &&
      (parsedItem.kind === 'channel' || parsedItem.kind === 'category') &&
      typeof parsedItem.id === 'string'
    ) {
      return parsedItem
    }
  } catch {
    return null
  }

  return null
}

function ChannelItem({
  item,
  nowMs,
  canManageChannels,
  isDragging,
  isDropTargetBefore,
  isDropTargetAfter,
  justDraggedKey,
  onChannelDragStart,
  onChannelDragEnd,
  onChannelDragOver,
  onChannelDrop,
  onOpenChannelSettings,
}: {
  item: ChannelSidebarItem
  nowMs: number
  canManageChannels: boolean
  isDragging: boolean
  isDropTargetBefore: boolean
  isDropTargetAfter: boolean
  justDraggedKey: string | null
  onChannelDragStart: (event: DragEvent<HTMLElement>, channelId: string) => void
  onChannelDragEnd: (channelId: string) => void
  onChannelDragOver: (event: DragEvent<HTMLDivElement>) => void
  onChannelDrop: (event: DragEvent<HTMLDivElement>) => void
  onOpenChannelSettings: (channelId: string) => void
}) {
  const normalizedName = item.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  const isRulesChannel = /\b(regla|reglas|rule|rules)\b/.test(normalizedName)
  const isWelcomeChannel = /\b(bienvenida|bienvenidas|welcome)\b/.test(normalizedName)
  const ChannelIcon = item.iconKey
    ? getChannelIconComponent(item.iconKey ?? null, item.type)
    : item.type === 'voice'
      ? Volume2
      : isWelcomeChannel
        ? Home
        : isRulesChannel
          ? Shield
          : getChannelIconComponent(item.iconKey ?? null, item.type)
  const voiceParticipants = item.type === 'voice' ? (item.voiceParticipants ?? []) : []
  const hasVoiceParticipants = voiceParticipants.length > 0
  const screenShareCount = item.type === 'voice' ? item.screenShareCount ?? 0 : 0
  const channelNameStyle = getChannelNameTextStyle({
    fontKey: item.fontKey,
    fontWeight: item.fontWeight,
  })

  const voiceElapsedLabel = hasVoiceParticipants
    ? formatChannelElapsed(voiceParticipants, nowMs)
    : null

  return (
    <div>
      <div
        className={cn(
          'group relative rounded-xl transition-opacity',
          canManageChannels && 'cursor-grab active:cursor-grabbing',
          isDragging && 'opacity-40',
          isDropTargetBefore && 'before:absolute before:-top-1 before:left-2 before:right-2 before:h-0.5 before:rounded-full before:bg-[var(--ember)]',
          isDropTargetAfter && 'after:absolute after:-bottom-1 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-[var(--ember)]'
        )}
        draggable={canManageChannels}
        onDragStart={(event) => onChannelDragStart(event, item.id)}
        onDragEnd={() => onChannelDragEnd(item.id)}
        onDragOver={onChannelDragOver}
        onDrop={onChannelDrop}
        data-dnd-name={item.name}
      >
        <ChannelItemButton
          item={item}
          justDraggedKey={justDraggedKey}
        >
          <ChannelIcon
            size={18}
            className={cn(
              'shrink-0 transition-colors',
              item.active ? 'text-ember' : 'text-[var(--t4)] group-hover:text-[var(--t3)]'
            )}
          />
          <span className="min-w-0 flex-1 truncate text-sm" style={channelNameStyle}>
            {item.name}
          </span>

          {hasVoiceParticipants ? (
            <div className="mr-1 hidden items-center sm:flex">
              <ParticipantAvatarStack participants={voiceParticipants} />
            </div>
          ) : null}

          {item.mentionCount ? (
            <span className="badge">{item.mentionCount > 99 ? '99+' : item.mentionCount}</span>
          ) : screenShareCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ember)]/16 px-2 py-0.5 text-[10px] font-700 uppercase tracking-[0.08em] text-[var(--ember)]">
              <MonitorUp size={11} />
              {screenShareCount === 1 ? 'SCREEN' : `${screenShareCount} SCREEN`}
            </span>
          ) : voiceElapsedLabel ? (
            <span className="bg-[var(--online)]/18 font-700 rounded-md px-1.5 py-0.5 text-[10px] tabular-nums text-[var(--online)]">
              {voiceElapsedLabel}
            </span>
          ) : item.isConnected ? (
            <span className="bg-[var(--online)]/20 font-700 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-[var(--online)]">
              LIVE
            </span>
          ) : item.hasUnread ? (
            <span className="h-2 w-2 rounded-full bg-[var(--t0)]" />
          ) : null}

          {canManageChannels ? (
            <button
              type="button"
              draggable={false}
              onPointerDown={(event) => {
                event.stopPropagation()
              }}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onOpenChannelSettings(item.id)
              }}
              className={cn(
                'relative z-[120] ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--s2)] text-[var(--t3)] transition-all hover:bg-[var(--surface-soft)] hover:text-[var(--t1)]',
                item.active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}
              data-tooltip="Editar canal"
              data-tooltip-position="bottom"
            >
              <Settings2 size={14} />
            </button>
          ) : null}
        </ChannelItemButton>
      </div>

      {hasVoiceParticipants ? (
        <div className="ml-6 mt-1.5 overflow-hidden rounded-xl border border-[var(--b1)] bg-[var(--s2)] pb-1 shadow-[0_10px_24px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--b1)] px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <ParticipantAvatarStack participants={voiceParticipants} />
              <span className="truncate text-[11px] font-700 uppercase tracking-[0.12em] text-[var(--t2)]">
                {voiceParticipants.length} en voz
              </span>
            </div>
            {voiceElapsedLabel ? (
              <span className="rounded-full bg-[var(--online)]/16 px-2 py-1 text-[10px] font-700 tabular-nums text-[var(--online)]">
                {voiceElapsedLabel}
              </span>
            ) : null}
          </div>

          <div className="space-y-1 px-1.5 py-1.5">
          {voiceParticipants.map((participant) => (
            <div
              key={participant.userId}
              className="flex items-center gap-2 rounded-md px-2 py-1 text-[12px] text-[var(--t3)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--t1)]"
            >
              <div className="h-4 w-4 overflow-hidden rounded-full bg-[var(--s3)]">
                {participant.avatarUrl ? (
                  <img
                    src={resolveMediaUrl(participant.avatarUrl) ?? participant.avatarUrl}
                    alt={participant.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="font-700 flex h-full w-full items-center justify-center text-[9px] text-[var(--t2)]">
                    {participant.displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="min-w-0 flex-1 truncate">{participant.displayName}</span>
              {participant.isScreenSharing ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ember)]/12 px-2 py-0.5 text-[10px] font-700 uppercase tracking-[0.08em] text-[var(--ember)]">
                  <MonitorUp size={10} />
                  Share
                </span>
              ) : null}
              <span className="text-[10px] tabular-nums text-[var(--online)]">
                {formatElapsedSince(participant.joinedAt, nowMs)}
              </span>
            </div>
          ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ChannelItemButton({
  item,
  justDraggedKey,
  children,
}: {
  item: ChannelSidebarItem
  justDraggedKey: string | null
  children: ReactNode
}) {
  const router = useRouter()
  const mobileSidebar = useMobileSidebar()

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => {
        if (justDraggedKey === `channel:${item.id}`) return
        mobileSidebar?.close()
        router.push(`/channels/${item.serverId}/${item.id}`)
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        if (justDraggedKey === `channel:${item.id}`) return
        mobileSidebar?.close()
        router.push(`/channels/${item.serverId}/${item.id}`)
      }}
      className={cn(
        'channel-item w-full',
        item.voiceParticipants?.length ? 'rounded-b-none border-b-0' : '',
        item.active && 'active',
        item.hasUnread && !item.active && 'has-unread'
      )}
    >
      {children}
    </div>
  )
}

function getDropPlacement(event: DragEvent<HTMLElement>) {
  const bounds = event.currentTarget.getBoundingClientRect()
  return event.clientY <= bounds.top + bounds.height / 2 ? 'before' : 'after'
}

function ParticipantAvatarStack({
  participants,
}: {
  participants: NonNullable<ChannelSidebarItem['voiceParticipants']>
}) {
  const visibleParticipants = participants.slice(0, 3)
  const remainingCount = participants.length - visibleParticipants.length

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visibleParticipants.map((participant) => (
          <div
            key={participant.userId}
            className="h-5 w-5 overflow-hidden rounded-full border border-[var(--s1)] bg-[var(--s3)] ring-1 ring-black/10"
          >
            {participant.avatarUrl ? (
              <img
                src={resolveMediaUrl(participant.avatarUrl) ?? participant.avatarUrl}
                alt={participant.displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="font-700 flex h-full w-full items-center justify-center text-[9px] text-[var(--t2)]">
                {participant.displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
        ))}
      </div>

      {remainingCount > 0 ? (
        <span className="ml-2 text-[10px] font-700 uppercase tracking-[0.08em] text-[var(--t4)]">
          +{remainingCount}
        </span>
      ) : null}
    </div>
  )
}

function formatChannelElapsed(
  participants: NonNullable<ChannelSidebarItem['voiceParticipants']>,
  nowMs: number
) {
  if (participants.length === 0) return null
  const earliestJoinedAtMs = participants.reduce((earliest, participant) => {
    const joinedAtMs = new Date(participant.joinedAt).getTime()
    if (Number.isNaN(joinedAtMs)) return earliest
    return Math.min(earliest, joinedAtMs)
  }, Number.POSITIVE_INFINITY)

  if (!Number.isFinite(earliestJoinedAtMs)) return null

  const elapsedSeconds = Math.max(0, Math.floor((nowMs - earliestJoinedAtMs) / 1000))
  return formatClock(elapsedSeconds)
}

function formatElapsedSince(joinedAt: string, nowMs: number) {
  const joinedAtMs = new Date(joinedAt).getTime()
  if (Number.isNaN(joinedAtMs)) return 'ahora'

  const elapsedSeconds = Math.max(0, Math.floor((nowMs - joinedAtMs) / 1000))
  const minutes = Math.floor(elapsedSeconds / 60)
  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `${minutes}m`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`

  const days = Math.floor(hours / 24)
  return `${days}d`
}

function formatClock(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function ChannelTypeButton({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean
  icon: ReactNode
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border px-3 py-3 text-left transition-colors',
        active
          ? 'border-[var(--ember)] bg-[var(--ember-dim)]'
          : 'border-[var(--b1)] bg-[var(--s4)] hover:border-[var(--b2)]'
      )}
    >
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--s1)] text-[var(--t1)]">
        {icon}
      </div>
      <p className="font-700 text-sm text-[var(--t0)]">{title}</p>
      <p className="mt-1 text-xs text-[var(--t3)]">{description}</p>
    </button>
  )
}
