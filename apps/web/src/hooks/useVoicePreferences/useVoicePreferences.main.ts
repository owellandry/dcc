'use client'

import { useCallback, useEffect, useRef, type MutableRefObject } from 'react'
import { usersApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useVoiceStore } from '@/stores/voiceStore'

interface UseVoicePreferencesResult {
  isMicMuted: boolean
  isHeadphonesMuted: boolean
  onToggleMic: () => void
  onToggleHeadphones: () => void
}

export function useVoicePreferences(): UseVoicePreferencesResult {
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const isMicMuted = useVoiceStore((state) => state.isMicMuted)
  const isHeadphonesMuted = useVoiceStore((state) => state.isHeadphonesMuted)
  const setMicMuted = useVoiceStore((state) => state.setMicMuted)
  const setHeadphonesMuted = useVoiceStore((state) => state.setHeadphonesMuted)
  const pendingMicRef = useRef<boolean | null>(null)
  const pendingHeadphonesRef = useRef<boolean | null>(null)

  useEffect(() => {
    syncVoicePreferenceFromUser(user?.voiceMicMuted, pendingMicRef, setMicMuted)
  }, [setMicMuted, user?.id, user?.voiceMicMuted])

  useEffect(() => {
    syncVoicePreferenceFromUser(user?.voiceHeadphonesMuted, pendingHeadphonesRef, setHeadphonesMuted)
  }, [setHeadphonesMuted, user?.id, user?.voiceHeadphonesMuted])

  const handleToggleMic = useCallback(() => {
    const previous = useVoiceStore.getState().isMicMuted
    const next = !previous

    pendingMicRef.current = next
    setMicMuted(next)

    void usersApi
      .update({ voiceMicMuted: next })
      .then((response) => {
        setUser(response.data)
      })
      .catch(() => {
        pendingMicRef.current = null
        setMicMuted(previous)
      })
  }, [setMicMuted, setUser])

  const handleToggleHeadphones = useCallback(() => {
    const previous = useVoiceStore.getState().isHeadphonesMuted
    const next = !previous

    pendingHeadphonesRef.current = next
    setHeadphonesMuted(next)

    void usersApi
      .update({ voiceHeadphonesMuted: next })
      .then((response) => {
        setUser(response.data)
      })
      .catch(() => {
        pendingHeadphonesRef.current = null
        setHeadphonesMuted(previous)
      })
  }, [setHeadphonesMuted, setUser])

  return {
    isMicMuted,
    isHeadphonesMuted,
    onToggleMic: handleToggleMic,
    onToggleHeadphones: handleToggleHeadphones,
  }
}

function syncVoicePreferenceFromUser(
  serverValue: boolean | undefined,
  pendingRef: MutableRefObject<boolean | null>,
  apply: (value: boolean) => void
) {
  if (typeof serverValue !== 'boolean') return

  if (pendingRef.current !== null) {
    if (serverValue === pendingRef.current) {
      pendingRef.current = null
    } else {
      return
    }
  }

  apply(serverValue)
}
