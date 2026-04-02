  'use client'

import type { ComponentProps } from 'react'
import {
  Bell,
  CreditCard,
  ImagePlus,
  Link2,
  LoaderCircle,
  LogOut,
  Search,
  Settings2,
  Shield,
  UserRound,
  X,
} from 'lucide-react'
import { MdOutlineDevices, MdPalette } from 'react-icons/md'
import { getUserDisplayName } from '@/lib/users/displayName.shared'
import { UserAvatar } from '../UserAvatar'
import { SettingsNavItem } from '../UserSettingsParts'

export type SettingsView =
  | 'account'
  | 'appearance'
  | 'content-social'
  | 'privacy'
  | 'connections'
  | 'notifications'
  | 'devices'
  | 'subscriptions'
  | 'billing'

export const settingsViewTitles: Record<SettingsView, string> = {
  account: 'Mi cuenta',
  appearance: 'Apariencia',
  'content-social': 'Contenido y redes sociales',
  privacy: 'Datos y privacidad',
  connections: 'Conexiones',
  notifications: 'Notificaciones',
  devices: 'Dispositivos',
  subscriptions: 'Suscripciones',
  billing: 'Facturación',
}

type SidebarUser = ComponentProps<typeof UserAvatar>['user']

interface UserSettingsModalSidebarProps {
  user: SidebarUser
  activeView: SettingsView
  onViewChange: (view: SettingsView) => void
  onLogout: () => void
}

export function UserSettingsModalSidebar({
  user,
  activeView,
  onViewChange,
  onLogout,
}: UserSettingsModalSidebarProps) {
  const displayName = getUserDisplayName(user)
  return (
    <aside className="hidden w-[260px] shrink-0 border-r border-[var(--b1)] bg-[var(--s1)] p-4 lg:block">
      <div className="flex items-center gap-3 rounded-xl bg-[var(--s1)] px-3 py-2.5">
        <UserAvatar user={user} size={40} showStatus />
        <div className="min-w-0">
          <p className="truncate text-sm font-700 text-[var(--t0)]">{displayName}</p>
          <p className="truncate text-[11px] text-[var(--t4)]">@{user.username}</p>
        </div>
      </div>

      <div className="relative mt-3">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t4)]" />
        <input
          className="h-9 w-full rounded-lg border border-[var(--b1)] bg-[var(--s2)] pl-9 pr-3 text-[13px] text-[var(--t2)] outline-none transition-colors focus:border-[var(--b2)]"
          placeholder="Buscar"
        />
      </div>

      <p className="mt-4 px-2 text-[11px] font-700 uppercase tracking-[0.16em] text-[var(--t4)]">Ajustes de usuario</p>
      <div className="mt-2 space-y-1">
        <SettingsNavItem
          icon={<UserRound size={15} />}
          label="Mi cuenta"
          active={activeView === 'account'}
          onClick={() => onViewChange('account')}
        />
        <SettingsNavItem
          icon={<MdPalette size={16} />}
          label="Apariencia"
          active={activeView === 'appearance'}
          onClick={() => onViewChange('appearance')}
        />
        <SettingsNavItem
          icon={<ImagePlus size={15} />}
          label="Contenido y redes sociales"
          active={activeView === 'content-social'}
          onClick={() => onViewChange('content-social')}
        />
        <SettingsNavItem
          icon={<Shield size={15} />}
          label="Datos y privacidad"
          active={activeView === 'privacy'}
          onClick={() => onViewChange('privacy')}
        />
        <SettingsNavItem
          icon={<Link2 size={15} />}
          label="Conexiones"
          active={activeView === 'connections'}
          onClick={() => onViewChange('connections')}
        />
        <SettingsNavItem
          icon={<Bell size={15} />}
          label="Notificaciones"
          active={activeView === 'notifications'}
          onClick={() => onViewChange('notifications')}
        />
        <SettingsNavItem
          icon={<MdOutlineDevices size={16} />}
          label="Dispositivos"
          active={activeView === 'devices'}
          onClick={() => onViewChange('devices')}
        />
      </div>

      <p className="mt-5 px-2 text-[11px] font-700 uppercase tracking-[0.16em] text-[var(--t4)]">Ajustes de facturación</p>
      <div className="mt-2 space-y-1">
        <SettingsNavItem
          icon={<CreditCard size={15} />}
          label="Suscripciones"
          active={activeView === 'subscriptions'}
          onClick={() => onViewChange('subscriptions')}
        />
        <SettingsNavItem
          icon={<Settings2 size={15} />}
          label="Facturación"
          active={activeView === 'billing'}
          onClick={() => onViewChange('billing')}
        />
      </div>

      <div className="mt-6 border-t border-[var(--b1)] pt-4">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-600 text-[var(--dnd)] transition-colors hover:bg-[var(--dnd)]/10"
        >
          <span className="text-[var(--dnd)]">
            <LogOut size={15} />
          </span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}

interface UserSettingsModalHeaderProps {
  activeView: SettingsView
  onClose: () => void
}

export function UserSettingsModalHeader({ activeView, onClose }: UserSettingsModalHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--b1)] px-5 py-4 sm:px-6">
      <h2 className="font-display text-[19px] font-700 text-[var(--t0)]">{settingsViewTitles[activeView]}</h2>
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

interface UserSettingsModalTabsProps {
  activeView: SettingsView
}

export function UserSettingsModalTabs({ activeView }: UserSettingsModalTabsProps) {
  if (activeView !== 'account') return null

  return (
    <div className="flex items-center gap-6 border-b border-[var(--b1)] px-6 pt-4">
      <button className="border-b-2 border-[#6f8bff] pb-3 text-sm font-700 text-[#b8c5ff]">Perfil</button>
      <button className="pb-3 text-sm font-700 text-[var(--t4)] transition-colors hover:text-[var(--t2)]">Estado</button>
    </div>
  )
}

interface UserSettingsModalFooterProps {
  error: string | null
  success: string | null
  isSaving: boolean
  canSave: boolean
  onClose: () => void
  onSave: () => void
}

export function UserSettingsModalFooter({
  error,
  success,
  isSaving,
  canSave,
  onClose,
  onSave,
}: UserSettingsModalFooterProps) {
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
