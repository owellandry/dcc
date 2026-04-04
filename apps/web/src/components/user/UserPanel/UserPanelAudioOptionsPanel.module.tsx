'use client'

import { useEffect, useRef } from 'react'
import { ChevronRight, Settings2 } from 'lucide-react'
import type { VoiceInputProfile } from '@/lib/types'
import { UserPanelVoiceFilterSection } from './UserPanelVoiceFilterSection.module'

export type AudioPanelMode = 'input' | 'output'

interface AudioOptionsPanelProps {
  open: boolean
  mode: AudioPanelMode
  currentDevice: string
  currentProfile: string
  volume: number
  voiceInputProfile?: VoiceInputProfile
  voiceInputTone?: number
  voiceInputEffectMix?: number
  onVolumeChange: (value: number) => void
  onSelectDevice: () => void
  onSelectProfile: () => void
  onVoiceInputProfileChange?: (value: VoiceInputProfile) => void
  onVoiceInputToneChange?: (value: number) => void
  onVoiceInputEffectMixChange?: (value: number) => void
  onOpenVoiceSettings: () => void
  onClose: () => void
}

export function UserPanelAudioOptionsPanel({
  open,
  mode,
  currentDevice,
  currentProfile,
  volume,
  voiceInputProfile,
  voiceInputTone,
  voiceInputEffectMix,
  onVolumeChange,
  onSelectDevice,
  onSelectProfile,
  onVoiceInputProfileChange,
  onVoiceInputToneChange,
  onVoiceInputEffectMixChange,
  onOpenVoiceSettings,
  onClose,
}: AudioOptionsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (panelRef.current && !panelRef.current.contains(target)) {
        onClose()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  const volumeLabel = mode === 'input' ? 'Volumen de entrada' : 'Volumen de salida'
  const deviceLabel = mode === 'input' ? 'Dispositivo de entrada' : 'Dispositivo de salida'
  const profileLabel = mode === 'input' ? 'Filtro de voz' : 'Perfil de salida'

  return (
    <div
      ref={panelRef}
      role="menu"
      className="absolute bottom-[calc(100%+8px)] left-0 z-[240] w-[290px] rounded-2xl border border-[var(--b1)] bg-[var(--s2)] p-2 shadow-[0_18px_40px_rgba(0,0,0,0.36)]"
    >
      <div role="group" className="space-y-1">
        <button
          type="button"
          role="menuitem"
          onClick={onSelectDevice}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-soft)]"
        >
          <div>
            <p className="text-sm font-700 text-[var(--t0)]">{deviceLabel}</p>
            <p className="text-xs text-[var(--t4)]">{currentDevice}</p>
          </div>
          <ChevronRight size={16} className="text-[var(--t4)]" />
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={onSelectProfile}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-soft)]"
        >
          <div>
            <p className="text-sm font-700 text-[var(--t0)]">{profileLabel}</p>
            <p className="text-xs text-[var(--t4)]">{currentProfile}</p>
          </div>
          <ChevronRight size={16} className="text-[var(--t4)]" />
        </button>
      </div>

      <div className="my-2 h-px bg-[var(--b1)]" />

      <div role="group" className="rounded-xl bg-[var(--s1)] px-3 py-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-700 text-[var(--t0)]">{volumeLabel}</p>
          <span className="text-xs text-[var(--t4)]">{volume}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(event) => onVolumeChange(Number(event.target.value))}
          className="w-full accent-[var(--ember)]"
          aria-label={volumeLabel}
        />
      </div>

      {mode === 'input' &&
      voiceInputProfile &&
      typeof voiceInputTone === 'number' &&
      typeof voiceInputEffectMix === 'number' &&
      onVoiceInputProfileChange &&
      onVoiceInputToneChange &&
      onVoiceInputEffectMixChange ? (
        <UserPanelVoiceFilterSection
          profile={voiceInputProfile}
          tone={voiceInputTone}
          effectMix={voiceInputEffectMix}
          onProfileChange={onVoiceInputProfileChange}
          onToneChange={onVoiceInputToneChange}
          onEffectMixChange={onVoiceInputEffectMixChange}
        />
      ) : null}

      <div className="my-2 h-px bg-[var(--b1)]" />

      <button
        type="button"
        role="menuitem"
        onClick={onOpenVoiceSettings}
        className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-soft)]"
      >
        <p className="text-sm font-700 text-[var(--t0)]">Ajustes de voz</p>
        <Settings2 size={16} className="text-[var(--t4)]" />
      </button>
    </div>
  )
}
