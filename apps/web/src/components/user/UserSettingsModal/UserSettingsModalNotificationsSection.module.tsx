'use client'

import { useState } from 'react'
import type { IconType } from 'react-icons'
import { MdNotificationsActive, MdOutlineCampaign, MdOutlineDesktopWindows, MdOutlineGraphicEq, MdOutlineVolumeUp } from 'react-icons/md'

type NotificationToggle = {
  id: string
  title: string
  description?: string
  icon: IconType
  enabledByDefault: boolean
}

const notificationToggles: NotificationToggle[] = [
  {
    id: 'desktop',
    title: 'Activar las notificaciones de escritorio',
    description:
      'Si buscas notificaciones por canal o por servidor, abre el menu contextual del servidor y entra a Ajustes de notificaciones.',
    icon: MdOutlineDesktopWindows,
    enabledByDefault: false,
  },
  {
    id: 'go-live',
    title: 'Personas que conozco empiezan a transmitir en servidores pequenos',
    icon: MdOutlineCampaign,
    enabledByDefault: true,
  },
  {
    id: 'voice-activity',
    title: 'Amigos cercanos se unen a canales de voz en servidores de 200 miembros o menos',
    icon: MdOutlineVolumeUp,
    enabledByDefault: true,
  },
  {
    id: 'sound',
    title: 'Reproducir sonido al recibir notificaciones',
    icon: MdOutlineGraphicEq,
    enabledByDefault: true,
  },
  {
    id: 'summary',
    title: 'Resumen semanal de notificaciones',
    description: 'Recibe un resumen por correo con la actividad importante de la semana.',
    icon: MdNotificationsActive,
    enabledByDefault: false,
  },
]

export function UserSettingsModalNotificationsSection() {
  const [toggleMap, setToggleMap] = useState<Record<string, boolean>>(
    () =>
      notificationToggles.reduce<Record<string, boolean>>((accumulator, toggle) => {
        accumulator[toggle.id] = toggle.enabledByDefault
        return accumulator
      }, {}),
  )

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="rounded-2xl border border-[var(--b1)] bg-[var(--s2)] p-5">
        <h2 className="text-2xl font-700 text-[var(--t0)]">Vista general</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--t3)]">
          Configura como y cuando quieres recibir alertas en escritorio, actividad social y recordatorios.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--b1)] bg-[var(--s2)] p-5">
        <div className="space-y-3">
          {notificationToggles.slice(0, 1).map((toggle) => {
            const Icon = toggle.icon
            const enabled = Boolean(toggleMap[toggle.id])

            return (
              <div key={toggle.id} className="rounded-xl border border-[var(--b1)] bg-[var(--s1)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-700 text-[var(--t0)]">
                      <Icon size={16} className="text-[var(--t4)]" />
                      {toggle.title}
                    </p>
                    {toggle.description ? (
                      <p className="mt-1 text-sm leading-6 text-[var(--t3)]">{toggle.description}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    onClick={() => setToggleMap((current) => ({ ...current, [toggle.id]: !enabled }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors ${
                      enabled
                        ? 'border-[#5865f2]/70 bg-[#5865f2]'
                        : 'border-[rgba(151,151,159,0.2)] bg-black/20'
                    }`}
                  >
                    <span
                      className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white transition-all ${
                        enabled ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <fieldset className="rounded-2xl border border-[var(--b1)] bg-[var(--s2)] p-5">
        <legend className="px-1 text-sm font-700 text-[var(--t0)]">Notificarme cuando...</legend>
        <div className="mt-3 space-y-3">
          {notificationToggles.slice(1).map((toggle) => {
            const Icon = toggle.icon
            const enabled = Boolean(toggleMap[toggle.id])

            return (
              <div key={toggle.id} className="rounded-xl border border-[var(--b1)] bg-[var(--s1)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-700 text-[var(--t0)]">
                      <Icon size={16} className="text-[var(--t4)]" />
                      {toggle.title}
                    </p>
                    {toggle.description ? (
                      <p className="mt-1 text-sm leading-6 text-[var(--t3)]">{toggle.description}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    onClick={() => setToggleMap((current) => ({ ...current, [toggle.id]: !enabled }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors ${
                      enabled
                        ? 'border-[#5865f2]/70 bg-[#5865f2]'
                        : 'border-[rgba(151,151,159,0.2)] bg-black/20'
                    }`}
                  >
                    <span
                      className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white transition-all ${
                        enabled ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </fieldset>
    </div>
  )
}
