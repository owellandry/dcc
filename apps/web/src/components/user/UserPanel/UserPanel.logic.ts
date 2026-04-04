'use client'

import { useState } from 'react'
import type { SettingsView } from '@/components/user/UserSettingsModal/UserSettingsModalFrameParts.module'
import { useAuthStore } from '@/stores/authStore'
import { useVoicePreferences } from '@/hooks/useVoicePreferences'
import { type UserPanelVisualProps } from './UserPanel.shared'

export function useUserPanelModel(): UserPanelVisualProps {
  const user = useAuthStore((state) => state.user)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsInitialView, setSettingsInitialView] = useState<SettingsView>('account')
  const [isThemeWorkspaceOpen, setIsThemeWorkspaceOpen] = useState(false)
  const {
    isMicMuted,
    isHeadphonesMuted,
    inputVolume,
    outputVolume,
    voiceInputProfile,
    voiceInputTone,
    voiceInputEffectMix,
    onToggleMic,
    onToggleHeadphones,
    onSetInputVolume,
    onSetOutputVolume,
    onSetVoiceInputProfile,
    onSetVoiceInputTone,
    onSetVoiceInputEffectMix,
  } = useVoicePreferences()

  return {
    user,
    isSettingsOpen,
    settingsInitialView,
    isThemeWorkspaceOpen,
    isMicMuted,
    isHeadphonesMuted,
    inputVolume,
    outputVolume,
    voiceInputProfile,
    voiceInputTone,
    voiceInputEffectMix,
    onToggleMic,
    onToggleHeadphones,
    onSetInputVolume,
    onSetOutputVolume,
    onSetVoiceInputProfile,
    onSetVoiceInputTone,
    onSetVoiceInputEffectMix,
    onOpenSettings: (view = 'account') => {
      setSettingsInitialView(view)
      setIsSettingsOpen(true)
    },
    onCloseSettings: () => setIsSettingsOpen(false),
    onOpenThemeWorkspace: () => setIsThemeWorkspaceOpen(true),
    onCloseThemeWorkspace: () => setIsThemeWorkspaceOpen(false),
    onBackToAppearanceSettings: () => {
      setIsThemeWorkspaceOpen(false)
      setSettingsInitialView('appearance')
      setIsSettingsOpen(true)
    },
  }
}
