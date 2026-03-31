'use client'

import { create } from 'zustand'
import type { VoiceParticipant } from '@/lib/types'

export type VoiceConnectionState = 'idle' | 'requesting-media' | 'joining' | 'connected' | 'error'

interface VoiceState {
  activeServerId: string | null
  activeChannelId: string | null
  joinedAt: string | null
  connectionState: VoiceConnectionState
  errorMessage: string | null
  isMicMuted: boolean
  isHeadphonesMuted: boolean
  participantsByChannel: Record<string, Record<string, VoiceParticipant>>
  joinVoiceChannel: (serverId: string, channelId: string) => void
  leaveVoiceChannel: () => void
  setConnectionState: (value: VoiceConnectionState) => void
  setErrorMessage: (value: string | null) => void
  syncParticipants: (channelId: string, participants: VoiceParticipant[]) => void
  upsertParticipant: (participant: VoiceParticipant) => void
  removeParticipant: (channelId: string, userId: string) => void
  clearParticipants: (channelId?: string) => void
  toggleMic: () => void
  toggleHeadphones: () => void
  setMicMuted: (value: boolean) => void
  setHeadphonesMuted: (value: boolean) => void
}

export const useVoiceStore = create<VoiceState>((set) => ({
  activeServerId: null,
  activeChannelId: null,
  joinedAt: null,
  connectionState: 'idle',
  errorMessage: null,
  isMicMuted: false,
  isHeadphonesMuted: false,
  participantsByChannel: {},

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
      isMicMuted: false,
      isHeadphonesMuted: false,
      participantsByChannel: state.activeChannelId
        ? Object.fromEntries(
            Object.entries(state.participantsByChannel).filter(([channelId]) => channelId !== state.activeChannelId)
          )
        : state.participantsByChannel,
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

  clearParticipants: (channelId) =>
    set((state) => {
      if (!channelId) return { participantsByChannel: {} }
      return {
        participantsByChannel: Object.fromEntries(
          Object.entries(state.participantsByChannel).filter(([currentChannelId]) => currentChannelId !== channelId)
        ),
      }
    }),

  toggleMic: () => set((state) => ({ isMicMuted: !state.isMicMuted })),
  toggleHeadphones: () => set((state) => ({ isHeadphonesMuted: !state.isHeadphonesMuted })),
  setMicMuted: (value) => set({ isMicMuted: value }),
  setHeadphonesMuted: (value) => set({ isHeadphonesMuted: value }),
}))
