'use client'

import { Hash, LoaderCircle, Search, Settings2, Shield, Users, X } from 'lucide-react'
import { resolveMediaUrl } from '@/lib/api'
import type { Server } from '@/lib/types'
import { UserAvatarImage } from '@/components/user/UserAvatar/UserAvatarImage.module'
import { SettingsNavItem } from '@/components/user/UserSettingsParts'
import { ServerSettingsSection, serverSettingsViewTitles } from './ServerSettingsModal.shared'

interface ServerSettingsModalSidebarProps {
  server: Server
  activeView: ServerSettingsSection
  canManageChannels: boolean
  canManageRoles: boolean
  canManageMembers: boolean
  onViewChange: (view: ServerSettingsSection) => void
}

export function ServerSettingsModalSidebar({
  server,
  activeView,
  canManageChannels,
  canManageRoles,
  canManageMembers,
  onViewChange,
}: ServerSettingsModalSidebarProps) {
  const iconUrl = resolveMediaUrl(server.iconUrl)
  const initials = server.name.trim().slice(0, 2).toUpperCase()

  return (
    <aside className="hidden w-[260px] shrink-0 border-r border-[var(--b1)] bg-[var(--s1)] p-4 lg:block">
      <div className="flex items-center gap-3 rounded-xl bg-[var(--s1)] px-3 py-2.5">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-[var(--s2)] text-sm font-700 text-[var(--t0)]">
          {iconUrl ? <UserAvatarImage src={iconUrl} alt={server.name} status="online" /> : initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-700 text-[var(--t0)]">{server.name}</p>
          <p className="text-xs text-[var(--t3)]">Configurar servidor</p>
        </div>
      </div>

      <div className="relative mt-3">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t4)]" />
        <input
          className="h-9 w-full rounded-lg border border-[var(--b1)] bg-[var(--s2)] pl-9 pr-3 text-[13px] text-[var(--t2)] outline-none"
          placeholder="Buscar"
          disabled
        />
      </div>

      <p className="mt-4 px-2 text-[11px] font-700 uppercase tracking-[0.16em] text-[var(--t4)]">Ajustes del servidor</p>
      <div className="mt-2 space-y-1">
        <SettingsNavItem
          icon={<Shield size={15} />}
          label="Vision general"
          active={activeView === 'overview'}
          onClick={() => onViewChange('overview')}
        />
        {canManageChannels ? (
          <SettingsNavItem
            icon={<Hash size={15} />}
            label="Canales"
            active={activeView === 'channels'}
            onClick={() => onViewChange('channels')}
          />
        ) : null}
        {canManageRoles ? (
          <SettingsNavItem
            icon={<Settings2 size={15} />}
            label="Roles"
            active={activeView === 'roles'}
            onClick={() => onViewChange('roles')}
          />
        ) : null}
        {canManageMembers ? (
          <SettingsNavItem
            icon={<Users size={15} />}
            label="Miembros"
            active={activeView === 'members'}
            onClick={() => onViewChange('members')}
          />
        ) : null}
      </div>
    </aside>
  )
}

interface ServerSettingsModalHeaderProps {
  activeView: ServerSettingsSection
  serverName: string
  onClose: () => void
}

export function ServerSettingsModalHeader({ activeView, serverName, onClose }: ServerSettingsModalHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--b1)] px-5 py-4 sm:px-6">
      <div>
        <h2 className="font-display text-[19px] font-700 text-[var(--t0)]">{serverSettingsViewTitles[activeView]}</h2>
        <p className="text-sm text-[var(--t3)]">{serverName}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-[var(--t3)] transition-colors hover:bg-[var(--surface-soft-hover)] hover:text-[var(--t0)]"
      >
        <X size={18} />
      </button>
    </div>
  )
}

interface ServerSettingsModalFooterProps {
  error: string | null
  success: string | null
  isSaving: boolean
  canSave: boolean
  onClose: () => void
  onSave: () => void
}

export function ServerSettingsModalFooter({
  error,
  success,
  isSaving,
  canSave,
  onClose,
  onSave,
}: ServerSettingsModalFooterProps) {
  return (
    <div className="flex items-center justify-between border-t border-[var(--b1)] px-6 py-4">
      <div className="min-h-[20px] text-sm">
        {error && <p className="text-[var(--dnd)]">{error}</p>}
        {!error && success && <p className="text-[var(--online)]">{success}</p>}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-4 py-2 text-sm font-600 text-[var(--t2)] transition-colors hover:text-[var(--t0)]"
        >
          Cerrar
        </button>
        <button
          type="button"
          onClick={onSave}
          className="inline-flex items-center gap-2 rounded-xl bg-ember px-4 py-2 text-sm font-700 text-[var(--ember-contrast)] transition-opacity hover:opacity-90 disabled:opacity-60"
          disabled={isSaving || !canSave}
        >
          {isSaving && <LoaderCircle size={14} className="animate-spin" />}
          Guardar cambios
        </button>
      </div>
    </div>
  )
}
