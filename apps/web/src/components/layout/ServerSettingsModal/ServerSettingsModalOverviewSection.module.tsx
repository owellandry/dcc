'use client'

import { Camera, ImagePlus, Shield } from 'lucide-react'
import { resolveMediaUrl } from '@/lib/api'
import type { Server } from '@/lib/types'
import { Field, SettingBlock } from '@/components/user/UserSettingsParts'
import { ServerSettingsContentShell } from './ServerSettingsModal.shared'

interface ServerSettingsModalOverviewSectionProps {
  server: Server
  nameDraft: string
  descriptionDraft: string
  inviteCodeDraft: string
  isOwner: boolean
  canManageServer: boolean
  sectionBusy: boolean
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onInviteCodeChange: (value: string) => void
  onOpenMediaPicker: (target: 'icon' | 'banner') => void
}

export function ServerSettingsModalOverviewSection({
  server,
  nameDraft,
  descriptionDraft,
  inviteCodeDraft,
  isOwner,
  canManageServer,
  sectionBusy,
  onNameChange,
  onDescriptionChange,
  onInviteCodeChange,
  onOpenMediaPicker,
}: ServerSettingsModalOverviewSectionProps) {
  const displayName = nameDraft.trim() || server.name
  const serverIconUrl = resolveMediaUrl(server.iconUrl)
  const serverBannerUrl = resolveMediaUrl(server.bannerUrl)
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
    || 'SV'

  return (
    <ServerSettingsContentShell>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 overflow-hidden rounded-2xl border border-[var(--b1)] bg-[var(--s3)]">
          <div className="relative h-44 border-b border-[var(--b1)] bg-[var(--s2)]">
            {serverBannerUrl ? (
              <img src={serverBannerUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-[linear-gradient(135deg,rgba(122,149,255,0.5),rgba(129,83,255,0.35),rgba(23,25,31,0.95))]" />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(12,14,18,0.82))]" />
            <div className="absolute bottom-4 left-4 flex items-end gap-3">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-[var(--s3)] bg-[var(--s2)]">
                {serverIconUrl ? (
                  <img src={serverIconUrl} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <span className="font-display text-xl font-800 text-white">{initials}</span>
                )}
              </div>
              <div className="pb-1">
                <p className="font-display text-xl font-800 text-white">{displayName}</p>
                <p className="text-sm text-white/75">/{inviteCodeDraft || server.inviteCode}</p>
              </div>
            </div>
          </div>
        </div>

        <SettingBlock icon={<Shield size={16} />} title="General" description="Nombre, descripcion e invitacion.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre">
              <input
                value={nameDraft}
                onChange={(event) => onNameChange(event.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none"
                disabled={!canManageServer || sectionBusy}
              />
            </Field>
            <Field label="Codigo de invitacion">
              <input
                value={inviteCodeDraft}
                onChange={(event) => onInviteCodeChange(event.target.value.toLowerCase())}
                className="h-11 w-full rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none"
                disabled={!canManageServer || sectionBusy}
              />
            </Field>
          </div>
          <Field label="Descripcion">
            <textarea
              value={descriptionDraft}
              onChange={(event) => onDescriptionChange(event.target.value)}
              rows={4}
              className="min-h-[112px] w-full resize-y rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 py-2.5 text-sm text-[var(--t1)] outline-none"
              disabled={!canManageServer || sectionBusy}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onOpenMediaPicker('icon')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--surface-soft)] px-4 py-3 text-sm font-700 text-[var(--t1)]"
              disabled={!isOwner || sectionBusy}
            >
              <Camera size={14} />
              Cambiar icono
            </button>
            <button
              type="button"
              onClick={() => onOpenMediaPicker('banner')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--surface-soft)] px-4 py-3 text-sm font-700 text-[var(--t1)]"
              disabled={!isOwner || sectionBusy}
            >
              <ImagePlus size={14} />
              Cambiar banner
            </button>
          </div>
        </SettingBlock>
      </div>
    </ServerSettingsContentShell>
  )
}
