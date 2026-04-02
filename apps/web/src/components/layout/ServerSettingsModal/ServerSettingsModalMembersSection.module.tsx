'use client'

import { Ban, Save, Users } from 'lucide-react'
import type { Role, Server, ServerMember } from '@/lib/types'
import { Field, SettingBlock } from '@/components/user/UserSettingsParts'
import { EmptyState, ServerSettingsContentShell } from './ServerSettingsModal.shared'

interface ServerSettingsModalMembersSectionProps {
  server: Server
  sortedMembers: ServerMember[]
  sortedRoles: Role[]
  selectedMember: ServerMember | null
  memberRoleIdsDraft: string[]
  banReasonDraft: string
  canManageRoles: boolean
  canKickMembers: boolean
  canBanMembers: boolean
  sectionBusy: boolean
  onSelectedMemberChange: (memberId: string) => void
  onMemberRoleIdsDraftChange: (value: string[]) => void
  onBanReasonDraftChange: (value: string) => void
  onSaveMemberRoles: () => void
  onKickMember: () => void
  onBanMember: () => void
}

export function ServerSettingsModalMembersSection({
  server,
  sortedMembers,
  sortedRoles,
  selectedMember,
  memberRoleIdsDraft,
  banReasonDraft,
  canManageRoles,
  canKickMembers,
  canBanMembers,
  sectionBusy,
  onSelectedMemberChange,
  onMemberRoleIdsDraftChange,
  onBanReasonDraftChange,
  onSaveMemberRoles,
  onKickMember,
  onBanMember,
}: ServerSettingsModalMembersSectionProps) {
  return (
    <ServerSettingsContentShell>
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <SettingBlock icon={<Users size={16} />} title="Miembros" description="Roles y moderacion.">
          <div className="space-y-2">
            {sortedMembers.map((member) => (
              <button
                key={member.userId}
                type="button"
                onClick={() => onSelectedMemberChange(member.userId)}
                className="w-full rounded-xl border border-[var(--b1)] bg-[var(--s1)] px-3 py-3 text-left"
              >
                <p className="text-sm font-700 text-[var(--t0)]">{member.nickname ?? member.user.username}</p>
                <p className="text-xs text-[var(--t4)]">@{member.user.username}</p>
              </button>
            ))}
          </div>
        </SettingBlock>

        {selectedMember ? (
          <SettingBlock icon={<Users size={16} />} title="Gestionar miembro" description="Asignacion de roles y moderacion.">
            <div className="space-y-2">
              {sortedRoles.filter((role) => !role.isDefault).map((role) => (
                <label key={role.id} className="flex items-center gap-2 rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 py-2.5 text-sm text-[var(--t1)]">
                  <input
                    type="checkbox"
                    checked={memberRoleIdsDraft.includes(role.id)}
                    onChange={(event) => onMemberRoleIdsDraftChange(
                      event.target.checked
                        ? [...memberRoleIdsDraft, role.id]
                        : memberRoleIdsDraft.filter((entry) => entry !== role.id),
                    )}
                    disabled={!canManageRoles}
                  />
                  {role.name}
                </label>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onSaveMemberRoles}
                className="inline-flex items-center gap-2 rounded-xl bg-ember px-4 py-2 text-sm font-700 text-[var(--ember-contrast)]"
                disabled={!canManageRoles || sectionBusy}
              >
                <Save size={14} />
                Guardar roles
              </button>
              <button
                type="button"
                onClick={onKickMember}
                className="rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-4 py-2 text-sm font-700 text-[var(--t1)]"
                disabled={!canKickMembers || sectionBusy || selectedMember.userId === server.ownerId}
              >
                Expulsar
              </button>
            </div>

            <Field label="Motivo del ban">
              <textarea
                value={banReasonDraft}
                onChange={(event) => onBanReasonDraftChange(event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 py-2.5 text-sm text-[var(--t1)] outline-none"
              />
            </Field>

            <button
              type="button"
              onClick={onBanMember}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--b1)] bg-[var(--dnd)]/10 px-4 py-2 text-sm font-700 text-[var(--dnd)]"
              disabled={!canBanMembers || sectionBusy || selectedMember.userId === server.ownerId}
            >
              <Ban size={14} />
              Banear
            </button>
          </SettingBlock>
        ) : (
          <EmptyState title="Selecciona un miembro" description="Desde aqui puedes reasignar roles o aplicar moderacion." />
        )}
      </div>
    </ServerSettingsContentShell>
  )
}
