import type { SettingsView } from '@/components/user/UserSettingsModal/UserSettingsModalFrameParts.module'
import type { ReactNode } from 'react'
import type { User, VoiceInputProfile } from '@/lib/types'

export interface UserPanelVisualProps {
  user: User | null
  isSettingsOpen: boolean
  settingsInitialView: SettingsView
  isThemeWorkspaceOpen: boolean
  isMicMuted: boolean
  isHeadphonesMuted: boolean
  inputVolume: number
  outputVolume: number
  voiceInputProfile: VoiceInputProfile
  voiceInputTone: number
  voiceInputEffectMix: number
  onToggleMic: () => void
  onToggleHeadphones: () => void
  onSetInputVolume: (value: number) => void
  onSetOutputVolume: (value: number) => void
  onSetVoiceInputProfile: (value: VoiceInputProfile) => void
  onSetVoiceInputTone: (value: number) => void
  onSetVoiceInputEffectMix: (value: number) => void
  onOpenSettings: (view?: SettingsView) => void
  onCloseSettings: () => void
  onOpenThemeWorkspace: () => void
  onCloseThemeWorkspace: () => void
  onBackToAppearanceSettings: () => void
}

export interface PanelButtonProps {
  icon: ReactNode
  title: string
  active?: boolean
  onClick?: () => void
}
