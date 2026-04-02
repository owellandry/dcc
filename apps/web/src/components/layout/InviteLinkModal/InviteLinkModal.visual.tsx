'use client'

import { AppModalShell } from '@/components/ui/AppModalShell.main'
import {
  INVITE_DURATION_OPTIONS,
  INVITE_MAX_USES_OPTIONS,
  type InviteLinkModalVisualProps,
} from './InviteLinkModal.shared'

export function InviteLinkModalVisual({
  isOpen,
  inviteExpiresInSeconds,
  inviteMaxUses,
  inviteUrl,
  inviteError,
  isGeneratingInvite,
  isCopyingInvite,
  onClose,
  onChangeExpiresInSeconds,
  onChangeMaxUses,
  onGenerateInvite,
  onCopyInvite,
}: InviteLinkModalVisualProps) {
  return (
    <AppModalShell
      open={isOpen}
      onClose={onClose}
      panelClassName="w-full max-w-sm rounded-xl border border-[var(--b1)] bg-[var(--s1)] shadow-[0_22px_44px_rgba(0,0,0,0.46)]"
      overlayClassName="z-[120]"
      closeDisabled={isGeneratingInvite || isCopyingInvite}
    >
      <div className="border-b border-[var(--b1)] px-4 py-3">
        <p className="font-display font-700 text-[16px] text-[var(--t0)]">Crear invitacion</p>
        <p className="mt-1 text-[12px] text-[var(--t3)]">Configura duracion y limite de usos.</p>
      </div>

      <div className="space-y-3 px-4 py-4">
        <div>
          <label className="font-700 mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-[var(--t4)]">
            Duracion
          </label>
          <select
            value={inviteExpiresInSeconds === null ? 'never' : String(inviteExpiresInSeconds)}
            onChange={(event) => onChangeExpiresInSeconds(event.target.value)}
            className="h-9 w-full rounded-md border border-[var(--b1)] bg-[var(--s4)] px-3 text-sm text-[var(--t1)] outline-none transition-colors focus:border-[var(--b3)]"
          >
            {INVITE_DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            <option value="never">Sin expiracion</option>
          </select>
        </div>

        <div>
          <label className="font-700 mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-[var(--t4)]">
            Maximo de usos
          </label>
          <select
            value={inviteMaxUses === null ? 'unlimited' : String(inviteMaxUses)}
            onChange={(event) => onChangeMaxUses(event.target.value)}
            className="h-9 w-full rounded-md border border-[var(--b1)] bg-[var(--s4)] px-3 text-sm text-[var(--t1)] outline-none transition-colors focus:border-[var(--b3)]"
          >
            {INVITE_MAX_USES_OPTIONS.map((uses) => (
              <option key={uses} value={uses}>
                {uses} usos
              </option>
            ))}
            <option value="unlimited">Sin limite</option>
          </select>
        </div>

        {inviteUrl && (
          <div className="rounded-md border border-[var(--b1)] bg-[var(--s4)] p-2.5">
            <p className="truncate text-[12px] text-[var(--t2)]">{inviteUrl}</p>
          </div>
        )}

        {inviteError && <p className="text-ember text-[12px]">{inviteError}</p>}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-[var(--b1)] px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="font-600 rounded-md px-3 py-1.5 text-[13px] text-[var(--t3)] transition-colors hover:text-[var(--t1)]"
          disabled={isGeneratingInvite || isCopyingInvite}
        >
          Cerrar
        </button>
        <button
          type="button"
          onClick={onGenerateInvite}
          className="font-700 rounded-md bg-[var(--ember)] px-3 py-1.5 text-[13px] text-[var(--ember-contrast)] transition-opacity hover:opacity-90 disabled:opacity-60"
          disabled={isGeneratingInvite || isCopyingInvite}
        >
          {isGeneratingInvite ? 'Generando...' : 'Generar'}
        </button>
        <button
          type="button"
          onClick={onCopyInvite}
          className="font-700 rounded-md bg-[var(--s3)] px-3 py-1.5 text-[13px] text-[var(--t1)] transition-colors hover:bg-[var(--s4)] disabled:opacity-60"
          disabled={!inviteUrl || isGeneratingInvite || isCopyingInvite}
        >
          {isCopyingInvite ? 'Copiando...' : 'Copiar'}
        </button>
      </div>
    </AppModalShell>
  )
}
