'use client'

import { Plus, Save, Settings2, Shield, Trash2 } from 'lucide-react'
import type { Role } from '@/lib/types'
import { Field, SettingBlock } from '@/components/user/UserSettingsParts'
import {
  colorToHex,
  EmptyState,
  PERMISSION_OPTIONS,
  type PermissionKey,
  ServerSettingsContentShell,
} from './ServerSettingsModal.shared'

interface ServerSettingsModalRolesSectionProps {
  sortedRoles: Role[]
  selectedRole: Role | null
  creatingRole: boolean
  roleNameDraft: string
  roleColorDraft: string
  rolePermissionsDraft: PermissionKey[]
  canManageRoles: boolean
  sectionBusy: boolean
  onStartCreateRole: () => void
  onSelectedRoleChange: (roleId: string) => void
  onRoleNameDraftChange: (value: string) => void
  onRoleColorDraftChange: (value: string) => void
  onRolePermissionsDraftChange: (value: PermissionKey[]) => void
  onSaveRole: () => void
  onDeleteRole: () => void
}

export function ServerSettingsModalRolesSection({
  sortedRoles,
  selectedRole,
  creatingRole,
  roleNameDraft,
  roleColorDraft,
  rolePermissionsDraft,
  canManageRoles,
  sectionBusy,
  onStartCreateRole,
  onSelectedRoleChange,
  onRoleNameDraftChange,
  onRoleColorDraftChange,
  onRolePermissionsDraftChange,
  onSaveRole,
  onDeleteRole,
}: ServerSettingsModalRolesSectionProps) {
  return (
    <ServerSettingsContentShell>
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <SettingBlock icon={<Shield size={16} />} title="Roles" description="Jerarquia y permisos globales.">
          <button
            type="button"
            onClick={onStartCreateRole}
            className="mb-3 inline-flex items-center gap-2 rounded-xl bg-[var(--surface-soft)] px-4 py-2 text-sm font-700 text-[var(--t1)]"
            disabled={!canManageRoles}
          >
            <Plus size={14} />
            Nuevo rol
          </button>
          <div className="space-y-2">
            {sortedRoles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => onSelectedRoleChange(role.id)}
                className="flex w-full items-center justify-between rounded-xl border border-[var(--b1)] bg-[var(--s1)] px-3 py-3 text-left"
              >
                <span className="text-sm font-700 text-[var(--t0)]">{role.name}</span>
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: colorToHex(role.color) }} />
              </button>
            ))}
          </div>
        </SettingBlock>

        {selectedRole || creatingRole ? (
          <SettingBlock
            icon={<Settings2 size={16} />}
            title={creatingRole ? 'Crear rol' : 'Editar rol'}
            description="Color y permisos del rol."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre">
                <input
                  value={roleNameDraft}
                  onChange={(event) => onRoleNameDraftChange(event.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none"
                />
              </Field>
              <Field label="Color">
                <input
                  type="color"
                  value={roleColorDraft}
                  onChange={(event) => onRoleColorDraftChange(event.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-2"
                />
              </Field>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {PERMISSION_OPTIONS.map((option) => (
                <label key={option.key} className="flex items-center gap-2 rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 py-2.5 text-sm text-[var(--t1)]">
                  <input
                    type="checkbox"
                    checked={rolePermissionsDraft.includes(option.key)}
                    onChange={(event) => onRolePermissionsDraftChange(
                      event.target.checked
                        ? [...rolePermissionsDraft, option.key]
                        : rolePermissionsDraft.filter((entry) => entry !== option.key),
                    )}
                  />
                  {option.label}
                </label>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onSaveRole}
                className="inline-flex items-center gap-2 rounded-xl bg-ember px-4 py-2 text-sm font-700 text-[var(--ember-contrast)]"
                disabled={!canManageRoles || sectionBusy || (!creatingRole && !!selectedRole?.isDefault)}
              >
                <Save size={14} />
                {creatingRole ? 'Crear rol' : 'Guardar rol'}
              </button>
              {!creatingRole && selectedRole && !selectedRole.isDefault ? (
                <button
                  type="button"
                  onClick={onDeleteRole}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-4 py-2 text-sm font-700 text-[var(--dnd)]"
                >
                  <Trash2 size={14} />
                  Eliminar
                </button>
              ) : null}
            </div>
          </SettingBlock>
        ) : (
          <EmptyState title="Selecciona un rol" description="Desde aqui puedes editar permisos del rol elegido." />
        )}
      </div>
    </ServerSettingsContentShell>
  )
}
