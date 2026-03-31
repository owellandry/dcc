'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ChevronDown, Hash, Home, Plus, Shield, UserPlus, Volume2, X } from 'lucide-react'
import { resolveMediaUrl } from '@/lib/api'
import { cn } from '@/lib/cn'
import { AnimatePresence, interactiveMotion, itemVariants, listVariants, motion } from '@/lib/motion'
import { InviteLinkModal } from '@/components/layout/InviteLinkModal'
import { ServerSettingsModal } from '@/components/layout/ServerSettingsModal'
import {
  type ChannelSidebarItem,
  type ChannelSidebarVisualProps,
} from './ChannelSidebar.shared'

export function ChannelSidebarVisual({
  resolvedServerId,
  serverName,
  bannerBackground,
  canOpenServerSettings,
  canCreateChannels,
  uncategorizedChannels,
  categorizedChannels,
  isInviteModalOpen,
  isServerSettingsOpen,
  isCreateChannelModalOpen,
  createChannelName,
  createChannelType,
  isCreatingChannel,
  createChannelError,
  onToggleCategory,
  onOpenInviteModal,
  onCloseInviteModal,
  onOpenServerSettings,
  onCloseServerSettings,
  onOpenCreateChannelModal,
  onCloseCreateChannelModal,
  onCreateChannelNameChange,
  onCreateChannelTypeChange,
  onSubmitCreateChannel,
}: ChannelSidebarVisualProps) {
  const hasVoiceActivity = uncategorizedChannels.some((channel) => (channel.voiceParticipants?.length ?? 0) > 0)
    || categorizedChannels.some((group) =>
      group.channels.some((channel) => (channel.voiceParticipants?.length ?? 0) > 0)
    )
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (!hasVoiceActivity) return

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [hasVoiceActivity])

  if (!resolvedServerId) {
    return (
      <aside className="flex h-full w-80 flex-col bg-[var(--s1)]">
        <div className="flex h-full items-center justify-center px-4 text-center text-sm text-[var(--t4)]">
          Cargando servidor...
        </div>
      </aside>
    )
  }

  return (
    <motion.aside
      className="flex h-full w-80 flex-col bg-[var(--s1)]"
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.34 }}
    >
      <div className="group relative flex h-28 w-full items-end overflow-hidden border-b border-[var(--b0)] px-4 pb-3 transition-colors surface-elevated">
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
            <span className="truncate font-display text-[16px] font-700 text-white">{serverName}</span>
            <ChevronDown
              size={18}
              className="shrink-0 text-white/80 transition-colors group-hover:text-white"
            />
          </button>
        ) : (
          <span className="relative truncate font-display text-[16px] font-700 text-white">{serverName}</span>
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
        {uncategorizedChannels.map((channel) => (
          <motion.div key={channel.id} variants={itemVariants}>
            <ChannelItem item={channel} nowMs={nowMs} />
          </motion.div>
        ))}

        {categorizedChannels.map((group) => (
          <motion.div key={group.id} className="mt-4" variants={itemVariants}>
            <div className="group mb-0.5 flex items-center gap-1 px-2 py-0.5">
              <button
                type="button"
                onClick={() => onToggleCategory(group.id)}
                className="flex min-w-0 flex-1 items-center gap-1"
              >
                <ChevronDown
                  size={12}
                  className={cn(
                    'shrink-0 text-[var(--t3)] transition-all group-hover:text-[var(--t2)]',
                    group.collapsed && '-rotate-90'
                  )}
                />
                <span className="sidebar-section-label truncate text-left">{group.name}</span>
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
              {!group.collapsed && group.channels.map((channel) => (
                <motion.div
                  key={channel.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <ChannelItem item={channel} nowMs={nowMs} />
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
          onClose={onCloseServerSettings}
        />
      ) : null}

      {isCreateChannelModalOpen ? (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--b1)] bg-[var(--s2)] shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--b1)] px-5 py-4">
              <h2 className="font-display text-lg font-700 text-[var(--t0)]">Crear canal</h2>
              <button
                type="button"
                onClick={onCloseCreateChannelModal}
                className="rounded-md p-1 text-[var(--t4)] transition-colors hover:bg-white/[0.06] hover:text-[var(--t1)]"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-700 uppercase tracking-[0.16em] text-[var(--t4)]">
                  Nombre del canal
                </label>
                <input
                  value={createChannelName}
                  onChange={(event) => onCreateChannelNameChange(event.target.value)}
                  placeholder={createChannelType === 'voice' ? 'voz-general' : 'nuevo-canal'}
                  className="h-9 w-full rounded-md border border-[var(--b1)] bg-[var(--s4)] px-3 text-sm text-[var(--t1)] outline-none placeholder:text-[var(--t4)] transition-colors focus:border-[var(--b3)]"
                  autoFocus
                  maxLength={100}
                />
                {createChannelError ? (
                  <p className="mt-1.5 text-[12px] text-ember">{createChannelError}</p>
                ) : null}
              </div>

              <div>
                <p className="mb-2 text-[10px] font-700 uppercase tracking-[0.16em] text-[var(--t4)]">
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
                className="rounded-md px-3 py-1.5 text-[13px] font-600 text-[var(--t3)] transition-colors hover:text-[var(--t1)]"
                disabled={isCreatingChannel}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onSubmitCreateChannel}
                className="rounded-md bg-[var(--ember)] px-4 py-1.5 text-[13px] font-700 text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                disabled={isCreatingChannel}
              >
                {isCreatingChannel ? 'Creando...' : 'Crear canal'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </motion.aside>
  )
}

function ChannelItem({ item, nowMs }: { item: ChannelSidebarItem; nowMs: number }) {
  const normalizedName = item.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  const isRulesChannel = /\b(regla|reglas|rule|rules)\b/.test(normalizedName)
  const isWelcomeChannel = /\b(bienvenida|bienvenidas|welcome)\b/.test(normalizedName)
  const ChannelIcon =
    item.type === 'voice' ? Volume2 : isWelcomeChannel ? Home : isRulesChannel ? Shield : Hash
  const voiceParticipants = item.type === 'voice' ? item.voiceParticipants ?? [] : []
  const hasVoiceParticipants = voiceParticipants.length > 0

  const voiceElapsedLabel = hasVoiceParticipants ? formatChannelElapsed(voiceParticipants, nowMs) : null

  return (
    <motion.div {...interactiveMotion}>
      <Link
        href={`/channels/${item.serverId}/${item.id}`}
        className={cn(
          'group channel-item',
          item.active && 'active',
          item.hasUnread && !item.active && 'has-unread'
        )}
      >
        <ChannelIcon
          size={18}
          className={cn(
            'shrink-0 transition-colors',
            item.active ? 'text-ember' : 'text-[var(--t4)] group-hover:text-[var(--t3)]'
          )}
        />
        <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>

        {item.mentionCount ? (
          <span className="badge">{item.mentionCount > 99 ? '99+' : item.mentionCount}</span>
        ) : voiceElapsedLabel ? (
          <span className="tabular-nums rounded-md bg-[var(--online)]/18 px-1.5 py-0.5 text-[10px] font-700 text-[var(--online)]">
            {voiceElapsedLabel}
          </span>
        ) : item.isConnected ? (
          <span className="rounded-full bg-[var(--online)]/20 px-2 py-0.5 text-[10px] font-700 uppercase tracking-[0.08em] text-[var(--online)]">
            LIVE
          </span>
        ) : item.hasUnread ? (
          <span className="h-2 w-2 rounded-full bg-[var(--t0)]" />
        ) : null}
      </Link>

      {hasVoiceParticipants ? (
        <div className="ml-6 mt-1.5 space-y-1 pb-1">
          {voiceParticipants.map((participant) => (
            <div
              key={participant.userId}
              className="flex items-center gap-2 rounded-md px-2 py-1 text-[12px] text-[var(--t3)] transition-colors hover:bg-white/[0.04] hover:text-[var(--t1)]"
            >
              <div className="h-4 w-4 overflow-hidden rounded-full bg-[var(--s3)]">
                {participant.avatarUrl ? (
                  <img
                    src={resolveMediaUrl(participant.avatarUrl) ?? participant.avatarUrl}
                    alt={participant.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[9px] font-700 text-[var(--t2)]">
                    {participant.displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="min-w-0 flex-1 truncate">{participant.displayName}</span>
              <span className="tabular-nums text-[10px] text-[var(--online)]">
                {formatElapsedSince(participant.joinedAt, nowMs)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </motion.div>
  )
}

function formatChannelElapsed(participants: NonNullable<ChannelSidebarItem['voiceParticipants']>, nowMs: number) {
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
      <p className="text-sm font-700 text-[var(--t0)]">{title}</p>
      <p className="mt-1 text-xs text-[var(--t3)]">{description}</p>
    </button>
  )
}
