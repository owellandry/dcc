import type { VoiceInputProfile } from '@/lib/types'

export interface VoiceFilterSettings {
  profile: VoiceInputProfile
  tone: number
  effectMix: number
  inputVolume: number
}

interface VoiceFilterProfileConfig {
  highPassHz: number
  lowPassHz: number
  lowShelfGain: number
  highShelfGain: number
  presenceGain: number
  presenceFrequencyHz: number
  distortionAmount: number
}

export const VOICE_INPUT_PROFILE_OPTIONS: Array<{
  id: VoiceInputProfile
  label: string
  description: string
}> = [
  { id: 'natural', label: 'Natural', description: 'Limpia y equilibrada' },
  { id: 'deep', label: 'Grave', description: 'Mas cuerpo y bajos' },
  { id: 'bright', label: 'Aguda', description: 'Mas aire y presencia' },
  { id: 'radio', label: 'Radio', description: 'Estrecha y con caracter' },
]

const VOICE_FILTER_PROFILE_CONFIGS: Record<VoiceInputProfile, VoiceFilterProfileConfig> = {
  natural: {
    highPassHz: 70,
    lowPassHz: 18_000,
    lowShelfGain: 0,
    highShelfGain: 0,
    presenceGain: 0,
    presenceFrequencyHz: 2_400,
    distortionAmount: 0,
  },
  deep: {
    highPassHz: 58,
    lowPassHz: 14_500,
    lowShelfGain: 6,
    highShelfGain: -1,
    presenceGain: 1.5,
    presenceFrequencyHz: 2_100,
    distortionAmount: 0,
  },
  bright: {
    highPassHz: 92,
    lowPassHz: 17_000,
    lowShelfGain: -1.5,
    highShelfGain: 7,
    presenceGain: 4,
    presenceFrequencyHz: 2_900,
    distortionAmount: 0,
  },
  radio: {
    highPassHz: 280,
    lowPassHz: 3_450,
    lowShelfGain: -5,
    highShelfGain: 2.5,
    presenceGain: 5.5,
    presenceFrequencyHz: 1_850,
    distortionAmount: 20,
  },
}

export function getVoiceInputProfileLabel(profile: VoiceInputProfile) {
  return VOICE_INPUT_PROFILE_OPTIONS.find((option) => option.id === profile)?.label ?? 'Natural'
}

export function clampVoiceTone(value: number) {
  return Math.min(100, Math.max(-100, Math.round(value)))
}

export function clampVoiceMix(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)))
}

export function getResolvedVoiceFilterConfig(settings: VoiceFilterSettings) {
  const profileConfig = VOICE_FILTER_PROFILE_CONFIGS[settings.profile]
  const tone = clampVoiceTone(settings.tone) / 100
  const effectMix = clampVoiceMix(settings.effectMix) / 100
  const inputVolume = clampVoiceMix(settings.inputVolume) / 100

  return {
    highPassHz: profileConfig.highPassHz,
    lowPassHz: profileConfig.lowPassHz,
    lowShelfGain: profileConfig.lowShelfGain - tone * 8,
    highShelfGain: profileConfig.highShelfGain + tone * 8,
    presenceGain: profileConfig.presenceGain + tone * 2.5,
    presenceFrequencyHz: profileConfig.presenceFrequencyHz,
    distortionAmount: profileConfig.distortionAmount * effectMix,
    wetGain: effectMix,
    dryGain: settings.profile === 'natural' ? 1 - effectMix * 0.78 : 1 - effectMix,
    outputGain: inputVolume,
  }
}

export function createDistortionCurve(amount: number) {
  if (amount <= 0) return null

  const normalizedAmount = Math.max(1, amount)
  const samples = 44_100
  const curve = new Float32Array(samples)
  const deg = Math.PI / 180

  for (let index = 0; index < samples; index += 1) {
    const x = (index * 2) / samples - 1
    curve[index] = ((3 + normalizedAmount) * x * 20 * deg) / (Math.PI + normalizedAmount * Math.abs(x))
  }

  return curve
}
