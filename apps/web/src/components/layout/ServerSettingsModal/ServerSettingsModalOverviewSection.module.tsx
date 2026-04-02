'use client'

import { Camera, ImagePlus, Shield } from 'lucide-react'
import { resolveMediaUrl } from '@/lib/api'
import type { Server } from '@/lib/types'
import { UserAvatarImage } from '@/components/user/UserAvatar/UserAvatarImage.module'
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
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="overflow-hidden rounded-2xl border border-[var(--b1)] bg-[var(--s3)]">
          <div className="relative h-44 border-b border-[var(--b1)] bg-[var(--s2)]">
            {serverBannerUrl ? (
              <img src={serverBannerUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-[linear-gradient(135deg,rgba(122,149,255,0.5),rgba(129,83,255,0.35),rgba(23,25,31,0.95))]" />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(12,14,18,0.82))]" />
            <div className="absolute bottom-4 left-4 flex items-end gap-3">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--s3)] bg-[var(--s2)]">
                  {serverIconUrl ? (
                    <UserAvatarImage src={serverIconUrl} alt={displayName} status="online" />
                  ) : (
                    <span className="font-display text-xl font-800 text-white">{initials}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onOpenMediaPicker('icon')}
                  className="absolute -bottom-1 -right-1 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-ember text-[var(--ember-contrast)] transition-opacity hover:opacity-90"
                  disabled={!isOwner || sectionBusy}
                >
                  <Camera size={15} />
                </button>
              </div>
              <div className="pb-1">
                <p className="font-display text-xl font-800 text-white">{displayName}</p>
                <p className="text-sm text-white/75">/{inviteCodeDraft || server.inviteCode}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenMediaPicker('banner')}
              className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-lg border border-[var(--b2)] bg-[var(--surface-overlay)] px-3 py-1.5 text-xs font-700 text-[var(--t0)] transition-colors hover:bg-[var(--surface-overlay-hover)]"
              disabled={!isOwner || sectionBusy}
            >
              <ImagePlus size={14} />
              Cambiar banner
            </button>
          </div>

          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-4 py-3">
              <div>
                <p className="text-[11px] font-700 uppercase tracking-[0.16em] text-[var(--t4)]">Nombre visible</p>
                <p className="mt-1 text-sm font-700 text-[var(--t0)]">{displayName}</p>
              </div>
              <span className="rounded-lg bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-700 text-[var(--t1)]">Servidor</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-4 py-3">
              <div>
                <p className="text-[11px] font-700 uppercase tracking-[0.16em] text-[var(--t4)]">Invitacion</p>
                <p className="mt-1 text-sm font-700 text-[var(--t0)]">/{inviteCodeDraft || server.inviteCode}</p>
              </div>
              <span className="rounded-lg bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-700 text-[var(--t1)]">Share</span>
            </div>
          </div>
        </div>

        <SettingBlock icon={<Shield size={16} />} title="General" description="Nombre, descripcion e invitacion.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre">
              <input
                value={nameDraft}
                onChange={(event) => onNameChange(event.target.value)}
                className="input-base h-11 rounded-xl bg-[var(--s2)] px-3 text-sm"
                disabled={!canManageServer || sectionBusy}
              />
            </Field>
            <Field label="Codigo de invitacion">
              <input
                value={inviteCodeDraft}
                onChange={(event) => onInviteCodeChange(event.target.value.toLowerCase())}
                className="input-base h-11 rounded-xl bg-[var(--s2)] px-3 text-sm"
                disabled={!canManageServer || sectionBusy}
              />
            </Field>
          </div>
          <Field label="Descripcion">
            <textarea
              value={descriptionDraft}
              onChange={(event) => onDescriptionChange(event.target.value)}
              rows={4}
              className="input-base min-h-[112px] resize-y rounded-xl bg-[var(--s2)] px-3 py-2.5 text-sm"
              disabled={!canManageServer || sectionBusy}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onOpenMediaPicker('icon')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--b1)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-700 text-[var(--t1)] transition-colors hover:bg-[var(--surface-soft-hover)]"
              disabled={!isOwner || sectionBusy}
            >
              <Camera size={14} />
              Cambiar icono
            </button>
            <button
              type="button"
              onClick={() => onOpenMediaPicker('banner')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--b1)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-700 text-[var(--t1)] transition-colors hover:bg-[var(--surface-soft-hover)]"
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
