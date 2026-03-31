'use client'

import { useCallback, useEffect, useState } from 'react'
import { usersApi } from '@/lib/api'
import type { SettingsView } from '@/components/user/UserSettingsModal/UserSettingsModalFrameParts.module'
import { useAuthStore } from '@/stores/authStore'
import { useVoiceStore } from '@/stores/voiceStore'
import { type UserPanelVisualProps } from './UserPanel.shared'

export function useUserPanelModel(): UserPanelVisualProps {
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const isMicMuted = useVoiceStore((state) => state.isMicMuted)
  const isHeadphonesMuted = useVoiceStore((state) => state.isHeadphonesMuted)
  const setMicMuted = useVoiceStore((state) => state.setMicMuted)
  const setHeadphonesMuted = useVoiceStore((state) => state.setHeadphonesMuted)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsInitialView, setSettingsInitialView] = useState<SettingsView>('account')
  const [isThemeWorkspaceOpen, setIsThemeWorkspaceOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    if (typeof user.voiceMicMuted === 'boolean') {
      setMicMuted(user.voiceMicMuted)
    }
    if (typeof user.voiceHeadphonesMuted === 'boolean') {
      setHeadphonesMuted(user.voiceHeadphonesMuted)
    }
  }, [setHeadphonesMuted, setMicMuted, user])

  const handleToggleMic = useCallback(() => {
    const previous = useVoiceStore.getState().isMicMuted
    const next = !previous
    setMicMuted(next)
    void usersApi
      .update({ voiceMicMuted: next })
      .then((response) => {
        setUser(response.data)
      })
      .catch(() => {
        setMicMuted(previous)
      })
  }, [setMicMuted, setUser])

  const handleToggleHeadphones = useCallback(() => {
    const previous = useVoiceStore.getState().isHeadphonesMuted
    const next = !previous
    setHeadphonesMuted(next)
    void usersApi
      .update({ voiceHeadphonesMuted: next })
      .then((response) => {
        setUser(response.data)
      })
      .catch(() => {
        setHeadphonesMuted(previous)
      })
  }, [setHeadphonesMuted, setUser])

  return {
    user,
    isSettingsOpen,
    settingsInitialView,
    isThemeWorkspaceOpen,
    isMicMuted,
    isHeadphonesMuted,
    onToggleMic: handleToggleMic,
    onToggleHeadphones: handleToggleHeadphones,
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
