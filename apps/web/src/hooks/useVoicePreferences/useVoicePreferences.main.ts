'use client'

import { useCallback, useEffect, useRef, type MutableRefObject } from 'react'
import { usersApi } from '@/lib/api'
import type { VoiceInputProfile } from '@/lib/types'
import { useAuthStore } from '@/stores/authStore'
import { useVoiceStore } from '@/stores/voiceStore'

interface UseVoicePreferencesResult {
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
}

export function useVoicePreferences(): UseVoicePreferencesResult {
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const isMicMuted = useVoiceStore((state) => state.isMicMuted)
  const isHeadphonesMuted = useVoiceStore((state) => state.isHeadphonesMuted)
  const inputVolume = useVoiceStore((state) => state.inputVolume)
  const outputVolume = useVoiceStore((state) => state.outputVolume)
  const voiceInputProfile = useVoiceStore((state) => state.voiceInputProfile)
  const voiceInputTone = useVoiceStore((state) => state.voiceInputTone)
  const voiceInputEffectMix = useVoiceStore((state) => state.voiceInputEffectMix)
  const setMicMuted = useVoiceStore((state) => state.setMicMuted)
  const setHeadphonesMuted = useVoiceStore((state) => state.setHeadphonesMuted)
  const setInputVolume = useVoiceStore((state) => state.setInputVolume)
  const setOutputVolume = useVoiceStore((state) => state.setOutputVolume)
  const setVoiceInputProfile = useVoiceStore((state) => state.setVoiceInputProfile)
  const setVoiceInputTone = useVoiceStore((state) => state.setVoiceInputTone)
  const setVoiceInputEffectMix = useVoiceStore((state) => state.setVoiceInputEffectMix)
  const pendingMicRef = useRef<boolean | null>(null)
  const pendingHeadphonesRef = useRef<boolean | null>(null)
  const pendingVoiceProfileRef = useRef<VoiceInputProfile | null>(null)
  const pendingVoiceToneRef = useRef<number | null>(null)
  const pendingVoiceEffectMixRef = useRef<number | null>(null)
  const voiceConfigCommitTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    syncVoicePreferenceFromUser(user?.voiceMicMuted, pendingMicRef, setMicMuted)
  }, [setMicMuted, user?.id, user?.voiceMicMuted])

  useEffect(() => {
    syncVoicePreferenceFromUser(user?.voiceHeadphonesMuted, pendingHeadphonesRef, setHeadphonesMuted)
  }, [setHeadphonesMuted, user?.id, user?.voiceHeadphonesMuted])

  useEffect(() => {
    syncVoicePreferenceFromUser(user?.voiceInputProfile, pendingVoiceProfileRef, setVoiceInputProfile)
  }, [setVoiceInputProfile, user?.id, user?.voiceInputProfile])

  useEffect(() => {
    syncVoicePreferenceFromUser(user?.voiceInputTone, pendingVoiceToneRef, setVoiceInputTone)
  }, [setVoiceInputTone, user?.id, user?.voiceInputTone])

  useEffect(() => {
    syncVoicePreferenceFromUser(user?.voiceInputEffectMix, pendingVoiceEffectMixRef, setVoiceInputEffectMix)
  }, [setVoiceInputEffectMix, user?.id, user?.voiceInputEffectMix])

  useEffect(
    () => () => {
      if (voiceConfigCommitTimeoutRef.current !== null) {
        window.clearTimeout(voiceConfigCommitTimeoutRef.current)
      }
    },
    []
  )

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

  const restoreVoiceConfigFromUser = useCallback(() => {
    if (typeof user?.voiceInputProfile === 'string') {
      setVoiceInputProfile(user.voiceInputProfile)
    }
    if (typeof user?.voiceInputTone === 'number') {
      setVoiceInputTone(user.voiceInputTone)
    }
    if (typeof user?.voiceInputEffectMix === 'number') {
      setVoiceInputEffectMix(user.voiceInputEffectMix)
    }
  }, [setVoiceInputEffectMix, setVoiceInputProfile, setVoiceInputTone, user?.voiceInputEffectMix, user?.voiceInputProfile, user?.voiceInputTone])

  const commitVoiceInputConfig = useCallback(
    (mode: 'immediate' | 'debounced' = 'debounced') => {
      const flush = () => {
        const state = useVoiceStore.getState()
        const payload = {
          voiceInputProfile: state.voiceInputProfile,
          voiceInputTone: state.voiceInputTone,
          voiceInputEffectMix: state.voiceInputEffectMix,
        }

        pendingVoiceProfileRef.current = payload.voiceInputProfile
        pendingVoiceToneRef.current = payload.voiceInputTone
        pendingVoiceEffectMixRef.current = payload.voiceInputEffectMix

        void usersApi
          .update(payload)
          .then((response) => {
            setUser(response.data)
          })
          .catch(() => {
            pendingVoiceProfileRef.current = null
            pendingVoiceToneRef.current = null
            pendingVoiceEffectMixRef.current = null
            restoreVoiceConfigFromUser()
          })
      }

      if (voiceConfigCommitTimeoutRef.current !== null) {
        window.clearTimeout(voiceConfigCommitTimeoutRef.current)
        voiceConfigCommitTimeoutRef.current = null
      }

      if (mode === 'immediate') {
        flush()
        return
      }

      voiceConfigCommitTimeoutRef.current = window.setTimeout(() => {
        voiceConfigCommitTimeoutRef.current = null
        flush()
      }, 220)
    },
    [restoreVoiceConfigFromUser, setUser]
  )

  return {
    isMicMuted,
    isHeadphonesMuted,
    inputVolume,
    outputVolume,
    voiceInputProfile,
    voiceInputTone,
    voiceInputEffectMix,
    onToggleMic: handleToggleMic,
    onToggleHeadphones: handleToggleHeadphones,
    onSetInputVolume: setInputVolume,
    onSetOutputVolume: setOutputVolume,
    onSetVoiceInputProfile: (value) => {
      setVoiceInputProfile(value)
      commitVoiceInputConfig('immediate')
    },
    onSetVoiceInputTone: (value) => {
      setVoiceInputTone(value)
      commitVoiceInputConfig('debounced')
    },
    onSetVoiceInputEffectMix: (value) => {
      setVoiceInputEffectMix(value)
      commitVoiceInputConfig('debounced')
    },
  }
}

function syncVoicePreferenceFromUser<T extends boolean | number | string>(
  serverValue: T | undefined,
  pendingRef: MutableRefObject<T | null>,
  apply: (value: T) => void
) {
  if (typeof serverValue === 'undefined') return

  if (pendingRef.current !== null) {
    if (serverValue === pendingRef.current) {
      pendingRef.current = null
    } else {
      return
    }
  }

  apply(serverValue)
}
