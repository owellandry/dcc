'use client'

import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { ServerMember } from '@/lib/types'
import { useVoiceChannel } from '@/hooks/useVoiceChannel'
import { useAuthStore } from '@/stores/authStore'
import { useServersStore } from '@/stores/serversStore'
import { useVoiceStore } from '@/stores/voiceStore'
import { type VoiceChannelRoomProps, type VoiceChannelRoomVisualProps } from './VoiceChannelRoom.shared'

const EMPTY_MEMBERS: Record<string, ServerMember> = {}

export function useVoiceChannelRoomModel({
  serverId,
  channelId,
}: VoiceChannelRoomProps): VoiceChannelRoomVisualProps {
  const myUserId = useAuthStore((state) => state.user?.id ?? null)
  const channel = useServersStore((state) => state.channels[channelId] ?? null)
  const server = useServersStore((state) => state.servers[serverId] ?? null)
  const membersById = useServersStore((state) => state.members[serverId] ?? EMPTY_MEMBERS)
  const {
    activeChannelId,
    connectionState,
    errorMessage,
    isMicMuted,
    isHeadphonesMuted,
    participantsByChannel,
    toggleMic,
    toggleHeadphones,
  } = useVoiceStore(
    useShallow((state) => ({
      activeChannelId: state.activeChannelId,
      connectionState: state.connectionState,
      errorMessage: state.errorMessage,
      isMicMuted: state.isMicMuted,
      isHeadphonesMuted: state.isHeadphonesMuted,
      participantsByChannel: state.participantsByChannel,
      toggleMic: state.toggleMic,
      toggleHeadphones: state.toggleHeadphones,
    }))
  )
  const { isConnected, join, leave } = useVoiceChannel({ serverId, channelId })

  const members = useMemo(() => Object.values(membersById), [membersById])
  const activeParticipants = useMemo(
    () => Object.values(participantsByChannel[channelId] ?? {}),
    [channelId, participantsByChannel]
  )

  const connectedMembers = useMemo(() => {
    const participantIds = new Set(activeParticipants.map((participant) => participant.userId))
    const knownMembers = members.filter((member) => participantIds.has(member.userId))

    if (knownMembers.length > 0 || !myUserId || !participantIds.has(myUserId)) {
      return knownMembers
    }

    return members.filter((member) => member.userId === myUserId)
  }, [activeParticipants, members, myUserId])

  const availableMembers = useMemo(() => {
    const activeIds = new Set(activeParticipants.map((participant) => participant.userId))
    return members.filter((member) => member.userId !== myUserId && !activeIds.has(member.userId)).slice(0, 8)
  }, [activeParticipants, members, myUserId])

  return {
    channelName: channel?.name ?? 'voice-room',
    serverName: server?.name ?? 'Server',
    isConnected: activeChannelId === channelId && isConnected,
    connectionState,
    errorMessage,
    isMicMuted,
    isHeadphonesMuted,
    activeMemberCount: activeParticipants.length,
    connectedMembers,
    availableMembers,
    onJoin: () => {
      void join()
    },
    onLeave: leave,
    onToggleMic: toggleMic,
    onToggleHeadphones: toggleHeadphones,
  }
}
