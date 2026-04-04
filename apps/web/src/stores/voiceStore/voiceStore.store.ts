'use client'

import { create } from 'zustand'
import type { VoiceInputProfile, VoiceParticipant, VoiceScreenShare } from '@/lib/types'

export type VoiceConnectionState = 'idle' | 'requesting-media' | 'joining' | 'connected' | 'error'

interface VoiceState {
  activeServerId: string | null
  activeChannelId: string | null
  joinedAt: string | null
  connectionState: VoiceConnectionState
  errorMessage: string | null
  isMicMuted: boolean
  isHeadphonesMuted: boolean
  inputVolume: number
  outputVolume: number
  voiceInputProfile: VoiceInputProfile
  voiceInputTone: number
  voiceInputEffectMix: number
  participantsByChannel: Record<string, Record<string, VoiceParticipant>>
  screenSharesByChannel: Record<string, Record<string, VoiceScreenShare>>
  joinVoiceChannel: (serverId: string, channelId: string) => void
  leaveVoiceChannel: () => void
  setConnectionState: (value: VoiceConnectionState) => void
  setErrorMessage: (value: string | null) => void
  syncParticipants: (channelId: string, participants: VoiceParticipant[]) => void
  syncScreenShares: (channelId: string, screenShares: VoiceScreenShare[]) => void
  upsertParticipant: (participant: VoiceParticipant) => void
  upsertScreenShare: (screenShare: VoiceScreenShare) => void
  removeParticipant: (channelId: string, userId: string) => void
  removeScreenShare: (channelId: string, userId: string) => void
  clearParticipants: (channelId?: string) => void
  clearScreenShares: (channelId?: string) => void
  toggleMic: () => void
  toggleHeadphones: () => void
  setMicMuted: (value: boolean) => void
  setHeadphonesMuted: (value: boolean) => void
  setInputVolume: (value: number) => void
  setOutputVolume: (value: number) => void
  setVoiceInputProfile: (value: VoiceInputProfile) => void
  setVoiceInputTone: (value: number) => void
  setVoiceInputEffectMix: (value: number) => void
}

export const useVoiceStore = create<VoiceState>((set) => ({
  activeServerId: null,
  activeChannelId: null,
  joinedAt: null,
  connectionState: 'idle',
  errorMessage: null,
  isMicMuted: false,
  isHeadphonesMuted: false,
  inputVolume: 100,
  outputVolume: 100,
  voiceInputProfile: 'natural',
  voiceInputTone: 0,
  voiceInputEffectMix: 60,
  participantsByChannel: {},
  screenSharesByChannel: {},

  joinVoiceChannel: (serverId, channelId) =>
    set({
      activeServerId: serverId,
      activeChannelId: channelId,
      joinedAt: new Date().toISOString(),
      connectionState: 'joining',
      errorMessage: null,
    }),

  leaveVoiceChannel: () =>
    set((state) => ({
      activeServerId: null,
      activeChannelId: null,
      joinedAt: null,
      connectionState: 'idle',
      errorMessage: null,
      participantsByChannel: state.participantsByChannel,
      screenSharesByChannel: state.screenSharesByChannel,
    })),

  setConnectionState: (value) => set({ connectionState: value }),
  setErrorMessage: (value) => set({ errorMessage: value }),

  syncParticipants: (channelId, participants) =>
    set((state) => ({
      participantsByChannel: {
        ...state.participantsByChannel,
        [channelId]: Object.fromEntries(participants.map((participant) => [participant.userId, participant])),
      },
    })),

  syncScreenShares: (channelId, screenShares) =>
    set((state) => ({
      screenSharesByChannel: {
        ...state.screenSharesByChannel,
        [channelId]: Object.fromEntries(screenShares.map((screenShare) => [screenShare.userId, screenShare])),
      },
    })),

  upsertParticipant: (participant) =>
    set((state) => ({
      participantsByChannel: {
        ...state.participantsByChannel,
        [participant.channelId]: {
          ...(state.participantsByChannel[participant.channelId] ?? {}),
          [participant.userId]: participant,
        },
      },
    })),

  upsertScreenShare: (screenShare) =>
    set((state) => ({
      screenSharesByChannel: {
        ...state.screenSharesByChannel,
        [screenShare.channelId]: {
          ...(state.screenSharesByChannel[screenShare.channelId] ?? {}),
          [screenShare.userId]: screenShare,
        },
      },
    })),

  removeParticipant: (channelId, userId) =>
    set((state) => {
      const participants = { ...(state.participantsByChannel[channelId] ?? {}) }
      delete participants[userId]
      return {
        participantsByChannel: {
          ...state.participantsByChannel,
          [channelId]: participants,
        },
      }
    }),

  removeScreenShare: (channelId, userId) =>
    set((state) => {
      const screenShares = { ...(state.screenSharesByChannel[channelId] ?? {}) }
      delete screenShares[userId]
      return {
        screenSharesByChannel: {
          ...state.screenSharesByChannel,
          [channelId]: screenShares,
        },
      }
    }),

  clearParticipants: (channelId) =>
    set((state) => {
      if (!channelId) return { participantsByChannel: {} }
      return {
        participantsByChannel: Object.fromEntries(
          Object.entries(state.participantsByChannel).filter(([currentChannelId]) => currentChannelId !== channelId)
        ),
      }
    }),

  clearScreenShares: (channelId) =>
    set((state) => {
      if (!channelId) return { screenSharesByChannel: {} }
      return {
        screenSharesByChannel: Object.fromEntries(
          Object.entries(state.screenSharesByChannel).filter(([currentChannelId]) => currentChannelId !== channelId)
        ),
      }
    }),

  toggleMic: () => set((state) => ({ isMicMuted: !state.isMicMuted })),
  toggleHeadphones: () => set((state) => ({ isHeadphonesMuted: !state.isHeadphonesMuted })),
  setMicMuted: (value) => set({ isMicMuted: value }),
  setHeadphonesMuted: (value) => set({ isHeadphonesMuted: value }),
  setInputVolume: (value) => set({ inputVolume: clampAudioSetting(value) }),
  setOutputVolume: (value) => set({ outputVolume: clampAudioSetting(value) }),
  setVoiceInputProfile: (value) => set({ voiceInputProfile: value }),
  setVoiceInputTone: (value) => set({ voiceInputTone: clampVoiceTone(value) }),
  setVoiceInputEffectMix: (value) => set({ voiceInputEffectMix: clampAudioSetting(value) }),
}))

function clampAudioSetting(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)))
}

function clampVoiceTone(value: number) {
  return Math.min(100, Math.max(-100, Math.round(value)))
}
