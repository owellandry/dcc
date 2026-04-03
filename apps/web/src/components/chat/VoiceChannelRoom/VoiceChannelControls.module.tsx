'use client'

import type { ReactNode } from 'react'
import {
  Headphones,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  VolumeX,
} from 'lucide-react'
import { cn } from '@/lib/cn'

interface Props {
  isConnected: boolean
  isMicMuted: boolean
  isHeadphonesMuted: boolean
  isScreenSharing: boolean
  screenShareState: 'idle' | 'requesting-media' | 'sharing' | 'error'
  onToggleMic: () => void
  onToggleHeadphones: () => void
  onStartScreenShare: () => void
  onStopScreenShare: () => void
  onLeave: () => void
}

export function VoiceChannelControls({
  isConnected,
  isMicMuted,
  isHeadphonesMuted,
  isScreenSharing,
  screenShareState,
  onToggleMic,
  onToggleHeadphones,
  onStartScreenShare,
  onStopScreenShare,
  onLeave,
}: Props) {
  if (!isConnected) return null

  const isRequestingScreen = screenShareState === 'requesting-media'

  return (
    <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
      <VoiceControlButton
        active={!isMicMuted}
        title={isMicMuted ? 'Activar microfono' : 'Silenciar microfono'}
        icon={isMicMuted ? <MicOff size={16} /> : <Mic size={16} />}
        onClick={onToggleMic}
      />
      <VoiceControlButton
        active={!isHeadphonesMuted}
        title={isHeadphonesMuted ? 'Activar audio' : 'Silenciar audio'}
        icon={isHeadphonesMuted ? <VolumeX size={16} /> : <Headphones size={16} />}
        onClick={onToggleHeadphones}
      />
      <VoiceControlButton
        active={isScreenSharing}
        title={isScreenSharing ? 'Dejar de compartir pantalla' : 'Compartir pantalla'}
        icon={<MonitorUp size={16} />}
        onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
        disabled={isRequestingScreen}
        accent="ember"
        label={isRequestingScreen ? 'Preparando pantalla...' : isScreenSharing ? 'Pantalla activa' : 'Compartir pantalla'}
      />
      <VoiceControlButton
        active={false}
        title="Salir del chat de voz"
        icon={<PhoneOff size={16} />}
        onClick={onLeave}
        accent="danger"
        label="Salir"
      />
    </div>
  )
}

function VoiceControlButton({
  active,
  title,
  icon,
  onClick,
  disabled = false,
  accent = 'neutral',
  label,
}: {
  active: boolean
  title: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
  accent?: 'neutral' | 'ember' | 'danger'
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-700 transition-all disabled:cursor-wait disabled:opacity-70',
        accent === 'danger'
          ? 'border-[var(--dnd)]/35 bg-[var(--surface-soft)] text-[var(--dnd)] hover:-translate-y-0.5 hover:bg-[var(--surface-soft-hover)]'
          : active
            ? 'border-[var(--ember)]/35 bg-[var(--ember-dim)] text-[var(--ember)] hover:-translate-y-0.5'
            : 'border-[var(--b1)] bg-[var(--surface-soft)] text-[var(--t2)] hover:-translate-y-0.5 hover:border-[var(--b2)] hover:text-[var(--t0)]'
      )}
      aria-label={title}
    >
      {icon}
      <span>{label ?? title}</span>
    </button>
  )
}
