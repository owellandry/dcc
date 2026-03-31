'use client'

import { LoaderCircle, LogOut, Monitor, Shield, Smartphone, X } from 'lucide-react'

export type DeviceSession = {
  id: string
  device: string
  client: string
  location: string
  lastSeen: string
  isCurrent: boolean
  kind: 'desktop' | 'mobile'
}

interface UserSettingsModalDevicesModuleProps {
  sessions: DeviceSession[]
  closingSessionId: string | null
  isClosingAllOtherSessions: boolean
  onCloseCurrentSession: () => void
  onCloseOtherSession: (sessionId: string) => void
  onCloseAllOtherSessions: () => void
}

export function UserSettingsModalDevicesModule({
  sessions,
  closingSessionId,
  isClosingAllOtherSessions,
  onCloseCurrentSession,
  onCloseOtherSession,
  onCloseAllOtherSessions,
}: UserSettingsModalDevicesModuleProps) {
  const currentSession = sessions.find((session) => session.isCurrent) ?? null
  const otherSessions = sessions.filter((session) => !session.isCurrent)

  const renderDeviceSession = (session: DeviceSession, canClose: boolean) => (
    <div
      key={session.id}
      className={`flex items-center justify-between gap-3 py-3 ${canClose ? 'border-b border-[var(--b1)] last:border-b-0' : ''}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--b1)] bg-[var(--s1)] text-[var(--t2)]">
          {session.kind === 'mobile' ? <Smartphone size={18} /> : <Monitor size={18} />}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-700 uppercase tracking-[0.14em] text-[var(--t4)]">
            <span>{session.device}</span>
            <span>·</span>
            <span>{session.client}</span>
          </div>
          <p className="truncate text-sm text-[var(--t1)]">{session.location}</p>
          <p className="text-xs text-[var(--t4)]">{session.lastSeen}</p>
        </div>
      </div>

      {canClose && (
        <button
          type="button"
          onClick={() => onCloseOtherSession(session.id)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--dnd)]/10 text-[var(--dnd)] transition-colors hover:bg-[var(--dnd)]/20 disabled:opacity-60"
          disabled={closingSessionId === session.id}
          aria-label="Cerrar sesion en este dispositivo"
        >
          {closingSessionId === session.id ? <LoaderCircle size={15} className="animate-spin" /> : <X size={16} />}
        </button>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--b1)] bg-[var(--s2)] p-4">
        <p className="text-sm leading-6 text-[var(--t2)]">
          Estos son los dispositivos donde hay una sesion iniciada con tu cuenta. Puedes cerrar sesion en cada uno
          individualmente o cerrar todas las demas sesiones. Si ves un dispositivo que no reconoces, cierralo y cambia
          tu contrasena inmediatamente.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--b1)] bg-[var(--s2)] p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-700 text-[var(--t0)]">Dispositivo actual</h3>
          <button
            type="button"
            onClick={onCloseCurrentSession}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--dnd)]/10 px-3 py-2 text-xs font-700 text-[var(--dnd)] transition-colors hover:bg-[var(--dnd)]/15"
          >
            <LogOut size={14} />
            Cerrar sesion aqui
          </button>
        </div>
        {currentSession ? renderDeviceSession(currentSession, false) : (
          <div className="rounded-xl border border-[var(--b1)] bg-[var(--s1)] px-3 py-3 text-sm text-[var(--t3)]">
            No se pudo identificar la sesion actual.
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--b1)] bg-[var(--s2)] p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-700 text-[var(--t0)]">Otros dispositivos</h3>
          <button
            type="button"
            onClick={onCloseAllOtherSessions}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--dnd)]/10 px-3 py-2 text-xs font-700 text-[var(--dnd)] transition-colors hover:bg-[var(--dnd)]/15 disabled:opacity-60"
            disabled={otherSessions.length === 0 || isClosingAllOtherSessions}
          >
            {isClosingAllOtherSessions ? <LoaderCircle size={14} className="animate-spin" /> : <Shield size={14} />}
            Cerrar todas las demas
          </button>
        </div>

        {otherSessions.length > 0 ? (
          <div className="rounded-xl border border-[var(--b1)] bg-[var(--s1)] px-3">
            {otherSessions.map((session) => renderDeviceSession(session, true))}
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--b1)] bg-[var(--s1)] px-3 py-3 text-sm text-[var(--t3)]">
            No hay otras sesiones activas.
          </div>
        )}
      </div>
    </div>
  )
}
