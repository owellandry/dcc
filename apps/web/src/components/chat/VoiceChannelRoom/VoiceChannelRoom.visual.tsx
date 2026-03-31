'use client'

import type { ReactNode } from 'react'
import { PhoneOff, Volume2 } from 'lucide-react'
import { motion } from '@/lib/motion'
import { OfficialMemberTag, hasOfficialMemberBadge } from '@/components/user/Badge'
import { UserAvatar } from '@/components/user/UserAvatar'
import { type VoiceChannelRoomVisualProps } from './VoiceChannelRoom.shared'

export function VoiceChannelRoomVisual({
  channelName,
  serverName,
  isConnected,
  connectionState,
  errorMessage,
  activeMemberCount,
  connectedMembers,
  availableMembers,
  onJoin,
  onLeave,
}: VoiceChannelRoomVisualProps) {
  const connectionLabel = getConnectionLabel(isConnected, connectionState)

  return (
    <main className="relative flex min-h-0 flex-1 overflow-hidden bg-[var(--s3)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,122,92,0.09),transparent_34%),radial-gradient(circle_at_bottom,rgba(96,130,255,0.1),transparent_34%)]" />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="relative flex min-h-0 flex-1 items-start justify-center px-6 py-10">
          <motion.div
            className="relative z-10 flex w-full max-w-5xl flex-col items-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {connectedMembers.length > 0 ? (
              <div className="mb-8 flex min-h-[220px] w-full max-w-3xl items-center justify-center">
                <div className="grid w-full gap-3 sm:grid-cols-2">
                  {connectedMembers.map((member) => (
                    <div
                      key={member.userId}
                      className="rounded-xl border border-[var(--b1)] bg-[var(--s2)] p-4 shadow-xl"
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar user={member.user} size={52} showStatus />
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate font-display text-lg font-700 text-white">
                              {member.user.username}
                            </p>
                            {hasOfficialMemberBadge({ user: member.user, roles: member.roles }) && (
                              <OfficialMemberTag compact className="translate-y-[1px]" />
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-[var(--t3)]">
                            En el chat de voz
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--b1)] bg-[var(--s2)] px-6 py-7 text-center shadow-[0_8px_22px_rgba(0,0,0,0.16)]">
              <div className="absolute left-0 top-0 h-px w-full bg-[linear-gradient(90deg,transparent,var(--ember),transparent)]" />
              <div className="mb-5 flex justify-center">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl shadow-glow-ember"
                  style={{ background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))' }}
                >
                  <Volume2 size={18} className="text-white" />
                </div>
              </div>
              <h1 className="font-display text-[34px] font-700 tracking-[-0.04em] text-white md:text-[44px]">
                {channelName}
              </h1>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5 text-sm text-[var(--t2)]">
                <InfoChip icon={<Volume2 size={15} />} label={`${activeMemberCount} participante${activeMemberCount === 1 ? '' : 's'}`} />
                <InfoChip label={serverName} />
                <InfoChip label={connectionLabel} />
              </div>

              {connectedMembers.length === 0 ? (
                <p className="mx-auto mt-5 max-w-md text-[15px] leading-7 text-[var(--t3)]">
                  {activeMemberCount > 0
                    ? `Hay ${activeMemberCount} participante${activeMemberCount === 1 ? '' : 's'} en este canal. Estamos esperando terminar de resolver sus perfiles para mostrarlos correctamente.`
                    : 'No hay nadie en el chat de voz en este momento.'}
                </p>
              ) : null}

              {errorMessage ? (
                <p className="mx-auto mt-4 max-w-lg rounded-2xl border border-[var(--dnd)]/20 bg-[rgba(240,71,71,0.14)] px-4 py-3 text-sm leading-6 text-[#ffd1d1]">
                  {errorMessage}
                </p>
              ) : null}

              <div className="mt-7">
                {isConnected ? (
                  <button
                    type="button"
                    onClick={onLeave}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[var(--dnd)] px-6 py-3.5 text-sm font-700 text-white shadow-[0_18px_40px_rgba(240,71,71,0.24)] transition-transform hover:-translate-y-0.5"
                  >
                    <PhoneOff size={18} />
                    Salir del chat de voz
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onJoin}
                    className="inline-flex items-center gap-2 rounded-lg px-6 py-3.5 text-sm font-700 text-white shadow-glow-ember transition-all hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))' }}
                  >
                    <Volume2 size={18} />
                    Unirse al chat de voz
                  </button>
                )}
              </div>
            </div>

            {availableMembers.length > 0 ? (
              <div className="mt-6 flex w-full max-w-3xl flex-wrap items-center justify-center gap-3 rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-4 py-3 text-sm text-[var(--t2)]">
                {availableMembers.slice(0, 4).map((member) => (
                  <div key={member.userId} className="rounded-full ring-2 ring-[#161922]">
                    <UserAvatar user={member.user} size={34} showStatus />
                  </div>
                ))}
                <span className="ml-1 text-[var(--t3)]">
                  {availableMembers.length === 1
                    ? `${availableMembers[0]?.user.username ?? '1 persona'} esta disponible para entrar`
                    : `${availableMembers.length} personas disponibles para entrar`}
                </span>
              </div>
            ) : null}
          </motion.div>
        </div>

      </div>
    </main>
  )
}

function InfoChip({
  icon,
  label,
}: {
  icon?: ReactNode
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--b1)] bg-white/[0.03] px-3 py-2 text-[13px] font-600 text-[var(--t2)]">
      {icon ? <span className="text-[var(--t3)]">{icon}</span> : null}
      {label}
    </span>
  )
}

function getConnectionLabel(isConnected: boolean, connectionState: VoiceChannelRoomVisualProps['connectionState']) {
  if (connectionState === 'requesting-media') return 'Solicitando acceso al micrófono'
  if (connectionState === 'joining') return 'Entrando al canal'
  if (connectionState === 'error') return 'No se pudo conectar'
  return isConnected ? 'Conectado al chat de voz' : 'Fuera del canal'
}
