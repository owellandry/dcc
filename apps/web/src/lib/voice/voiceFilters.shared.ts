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
  lowShelfFrequencyHz: number
  lowShelfGain: number
  highShelfFrequencyHz: number
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
    lowShelfFrequencyHz: 210,
    lowShelfGain: 0,
    highShelfFrequencyHz: 3_400,
    highShelfGain: 0,
    presenceGain: 0,
    presenceFrequencyHz: 2_400,
    distortionAmount: 0,
  },
  deep: {
    // Thanos-like: massive bass boost, hard treble cut, gravelly distortion
    highPassHz: 40,
    lowPassHz: 6_000,
    lowShelfFrequencyHz: 180,
    lowShelfGain: 13,
    highShelfFrequencyHz: 2_800,
    highShelfGain: -10,
    presenceGain: -2,
    presenceFrequencyHz: 1_800,
    distortionAmount: 25,
  },
  bright: {
    // Noticeably bright: strong bass cut, aggressive high shelf, high presence
    highPassHz: 200,
    lowPassHz: 18_000,
    lowShelfFrequencyHz: 280,
    lowShelfGain: -9,
    highShelfFrequencyHz: 3_500,
    highShelfGain: 13,
    presenceGain: 7,
    presenceFrequencyHz: 4_000,
    distortionAmount: 0,
  },
  radio: {
    highPassHz: 280,
    lowPassHz: 3_450,
    lowShelfFrequencyHz: 210,
    lowShelfGain: -5,
    highShelfFrequencyHz: 3_400,
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
    lowShelfFrequencyHz: profileConfig.lowShelfFrequencyHz,
    lowShelfGain: profileConfig.lowShelfGain - tone * 8,
    highShelfFrequencyHz: profileConfig.highShelfFrequencyHz,
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
