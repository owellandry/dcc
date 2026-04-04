'use client'

import type { VoiceInputProfile } from '@/lib/types'
import {
  VOICE_INPUT_PROFILE_OPTIONS,
  getVoiceInputProfileLabel,
} from '@/lib/voice/voiceFilters.shared'
import { cn } from '@/lib/cn'

interface UserPanelVoiceFilterSectionProps {
  profile: VoiceInputProfile
  tone: number
  effectMix: number
  onProfileChange: (value: VoiceInputProfile) => void
  onToneChange: (value: number) => void
  onEffectMixChange: (value: number) => void
}

export function UserPanelVoiceFilterSection({
  profile,
  tone,
  effectMix,
  onProfileChange,
  onToneChange,
  onEffectMixChange,
}: UserPanelVoiceFilterSectionProps) {
  return (
    <div className="mt-2 rounded-xl border border-[var(--b1)] bg-[var(--s1)] px-3 py-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-700 text-[var(--t0)]">Filtro de voz</p>
          <p className="text-xs text-[var(--t4)]">{getVoiceInputProfileLabel(profile)}</p>
        </div>
        <span className="rounded-full bg-[var(--ember)]/12 px-2 py-1 text-[10px] font-700 uppercase tracking-[0.08em] text-[var(--ember)]">
          Tiempo real
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {VOICE_INPUT_PROFILE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onProfileChange(option.id)}
            className={cn(
              'rounded-xl border px-3 py-2 text-left transition-colors',
              option.id === profile
                ? 'border-[var(--ember)] bg-[var(--ember)]/10 text-[var(--t0)]'
                : 'border-[var(--b1)] bg-[var(--s2)] text-[var(--t2)] hover:border-[var(--b2)] hover:text-[var(--t0)]'
            )}
          >
            <p className="text-sm font-700">{option.label}</p>
            <p className="mt-1 text-[11px] text-[var(--t4)]">{option.description}</p>
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-3">
        <VoiceFilterSlider
          label="Tono"
          value={tone}
          valueLabel={tone === 0 ? 'Neutral' : tone > 0 ? `+${tone}` : `${tone}`}
          min={-100}
          max={100}
          onChange={onToneChange}
        />
        <VoiceFilterSlider
          label="Intensidad"
          value={effectMix}
          valueLabel={`${effectMix}%`}
          min={0}
          max={100}
          onChange={onEffectMixChange}
        />
      </div>
    </div>
  )
}

function VoiceFilterSlider({
  label,
  value,
  valueLabel,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  valueLabel: string
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-700 text-[var(--t0)]">{label}</p>
        <span className="text-xs text-[var(--t4)]">{valueLabel}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[var(--ember)]"
        aria-label={label}
      />
    </div>
  )
}
