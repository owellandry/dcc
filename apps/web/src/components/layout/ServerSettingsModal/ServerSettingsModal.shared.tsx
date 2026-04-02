'use client'

import { useState, type ReactNode } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { ApiRequestError } from '@/lib/api'
import { Permissions } from '@/lib/permissions'
import type { PermissionOverwrite, Role, ServerMember } from '@/lib/types'

export type ServerSettingsSection = 'overview' | 'channels' | 'roles' | 'members'
export type MediaTarget = 'icon' | 'banner'
export type StructureSelection = { kind: 'category' | 'channel'; id: string } | null
export type PermissionKey = keyof typeof Permissions

export const serverSettingsViewTitles: Record<ServerSettingsSection, string> = {
  overview: 'Vision general',
  channels: 'Canales',
  roles: 'Roles',
  members: 'Miembros',
}

export const PERMISSION_OPTIONS: Array<{ key: PermissionKey; label: string }> = [
  { key: 'VIEW_CHANNEL', label: 'Ver canales' },
  { key: 'SEND_MESSAGES', label: 'Enviar mensajes' },
  { key: 'ADD_REACTIONS', label: 'Reacciones' },
  { key: 'ATTACH_FILES', label: 'Adjuntar archivos' },
  { key: 'READ_MESSAGE_HISTORY', label: 'Historial' },
  { key: 'MANAGE_MESSAGES', label: 'Gestionar mensajes' },
  { key: 'MANAGE_CHANNELS', label: 'Gestionar canales' },
  { key: 'MANAGE_ROLES', label: 'Gestionar roles' },
  { key: 'KICK_MEMBERS', label: 'Expulsar' },
  { key: 'BAN_MEMBERS', label: 'Banear' },
  { key: 'MANAGE_SERVER', label: 'Gestionar servidor' },
  { key: 'MENTION_EVERYONE', label: 'Mention everyone' },
  { key: 'ADMINISTRATOR', label: 'Administrador' },
]

export function getRequestMessage(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) return error.message
  return fallback
}

export function bitsFromPermissions(enabled: PermissionKey[]) {
  return enabled.reduce((bits, key) => bits | Permissions[key], 0)
}

export function enabledPermissions(bits: number) {
  return PERMISSION_OPTIONS
    .filter((option) => (bits & Permissions[option.key]) !== 0)
    .map((option) => option.key)
}

export function colorToHex(color: number | null | undefined) {
  if (color === null || color === undefined) return '#5865f2'
  return `#${color.toString(16).padStart(6, '0')}`
}

export function hexToColor(value: string) {
  const normalized = value.trim().replace(/^#/, '')
  return /^[0-9a-fA-F]{6}$/.test(normalized) ? Number.parseInt(normalized, 16) : null
}

export function labelForOverwrite(overwrite: PermissionOverwrite, roles: Role[], members: ServerMember[]) {
  if (overwrite.targetType === 'role') return roles.find((role) => role.id === overwrite.targetId)?.name ?? 'Rol'
  const member = members.find((entry) => entry.userId === overwrite.targetId)
  return member?.nickname ?? member?.user.username ?? 'Miembro'
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--b1)] bg-[var(--s2)] px-6 py-10 text-center">
      <p className="font-display text-lg font-700 text-[var(--t0)]">{title}</p>
      <p className="mt-2 text-sm text-[var(--t3)]">{description}</p>
    </div>
  )
}

export function OverwriteEditor({
  overwrites,
  roles,
  members,
  onChange,
}: {
  overwrites: PermissionOverwrite[]
  roles: Role[]
  members: ServerMember[]
  onChange: (value: PermissionOverwrite[]) => void
}) {
  const [targetType, setTargetType] = useState<'role' | 'member'>('role')
  const [targetId, setTargetId] = useState('')
  const candidates = targetType === 'role' ? roles : members

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)_auto]">
        <select
          value={targetType}
          onChange={(event) => setTargetType(event.target.value as 'role' | 'member')}
          className="h-10 rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none"
        >
          <option value="role">Rol</option>
          <option value="member">Miembro</option>
        </select>
        <select
          value={targetId}
          onChange={(event) => setTargetId(event.target.value)}
          className="h-10 rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none"
        >
          <option value="">Selecciona un objetivo</option>
          {candidates.map((candidate) => (
            <option
              key={targetType === 'role' ? (candidate as Role).id : (candidate as ServerMember).userId}
              value={targetType === 'role' ? (candidate as Role).id : (candidate as ServerMember).userId}
            >
              {targetType === 'role'
                ? (candidate as Role).name
                : ((candidate as ServerMember).nickname ?? (candidate as ServerMember).user.username)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            if (!targetId) return
            if (overwrites.some((overwrite) => overwrite.targetId === targetId && overwrite.targetType === targetType)) return
            onChange([
              ...overwrites,
              {
                id: `draft-${targetType}-${targetId}`,
                serverId: '',
                categoryId: null,
                channelId: null,
                targetType,
                targetId,
                allowBits: 0,
                denyBits: 0,
              },
            ])
            setTargetId('')
          }}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--surface-soft)] px-4 text-sm font-700 text-[var(--t1)]"
        >
          <Plus size={14} />
          Agregar
        </button>
      </div>

      {overwrites.map((overwrite) => (
        <div key={`${overwrite.targetType}-${overwrite.targetId}`} className="rounded-xl border border-[var(--b1)] bg-[var(--s1)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-700 text-[var(--t0)]">{labelForOverwrite(overwrite, roles, members)}</p>
              <p className="text-xs text-[var(--t4)]">{overwrite.targetType}</p>
            </div>
            <button
              type="button"
              onClick={() => onChange(overwrites.filter((entry) => !(entry.targetId === overwrite.targetId && entry.targetType === overwrite.targetType)))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-soft)] text-[var(--t3)]"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <div className="space-y-2">
            {PERMISSION_OPTIONS.filter((option) => option.key !== 'ADMINISTRATOR').map((option) => {
              const bit = Permissions[option.key]
              const allow = (overwrite.allowBits & bit) !== 0
              const deny = (overwrite.denyBits & bit) !== 0

              return (
                <div key={option.key} className="flex items-center justify-between rounded-lg border border-[var(--b1)] bg-[var(--s2)] px-3 py-2">
                  <span className="text-sm text-[var(--t1)]">{option.label}</span>
                  <div className="flex gap-1">
                    <TriButton
                      active={allow}
                      label="Allow"
                      tone="allow"
                      onClick={() => onChange(overwrites.map((entry) => (
                        entry === overwrite
                          ? { ...entry, allowBits: entry.allowBits ^ bit, denyBits: entry.denyBits & ~bit }
                          : entry
                      )))}
                    />
                    <TriButton
                      active={!allow && !deny}
                      label="Neutral"
                      tone="neutral"
                      onClick={() => onChange(overwrites.map((entry) => (
                        entry === overwrite
                          ? { ...entry, allowBits: entry.allowBits & ~bit, denyBits: entry.denyBits & ~bit }
                          : entry
                      )))}
                    />
                    <TriButton
                      active={deny}
                      label="Deny"
                      tone="deny"
                      onClick={() => onChange(overwrites.map((entry) => (
                        entry === overwrite
                          ? { ...entry, allowBits: entry.allowBits & ~bit, denyBits: entry.denyBits ^ bit }
                          : entry
                      )))}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function TriButton({
  active,
  label,
  tone,
  onClick,
}: {
  active: boolean
  label: string
  tone: 'allow' | 'neutral' | 'deny'
  onClick: () => void
}) {
  const toneClassName =
    tone === 'allow'
      ? (active ? 'bg-[var(--online)] text-white' : 'text-[var(--online)]')
      : tone === 'deny'
        ? (active ? 'bg-[var(--dnd)] text-white' : 'text-[var(--dnd)]')
        : active
          ? 'bg-[var(--surface-soft-hover)] text-[var(--t0)]'
          : 'text-[var(--t2)]'

  return (
    <button type="button" onClick={onClick} className={`rounded-lg px-3 py-1 text-xs font-700 ${toneClassName}`}>
      {label}
    </button>
  )
}

export function ServerSettingsContentShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-5xl space-y-6">{children}</div>
}
