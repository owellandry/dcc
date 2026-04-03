'use client'

import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { ServerMember, VoiceScreenShare } from '@/lib/types'
import { useVoiceChannel } from '@/hooks/useVoiceChannel'
import { useVoicePreferences } from '@/hooks/useVoicePreferences'
import { useAuthStore } from '@/stores/authStore'
import { useServersStore } from '@/stores/serversStore'
import { useVoiceStore } from '@/stores/voiceStore'
import { getUserDisplayName } from '@/lib/users/displayName.shared'
import { type VoiceChannelRoomProps, type VoiceChannelRoomVisualProps } from './VoiceChannelRoom.shared'

const EMPTY_MEMBERS: Record<string, ServerMember> = {}

export function useVoiceChannelRoomModel({
  serverId,
  channelId,
}: VoiceChannelRoomProps): VoiceChannelRoomVisualProps {
  const myUserId = useAuthStore((state) => state.user?.id ?? null)
  const currentUser = useAuthStore((state) => state.user)
  const channel = useServersStore((state) => state.channels[channelId] ?? null)
  const server = useServersStore((state) => state.servers[serverId] ?? null)
  const membersById = useServersStore((state) => state.members[serverId] ?? EMPTY_MEMBERS)
  const { isMicMuted, isHeadphonesMuted, onToggleMic, onToggleHeadphones } = useVoicePreferences()
  const {
    activeChannelId,
    connectionState,
    errorMessage,
    participantsByChannel,
    screenSharesByChannel,
  } = useVoiceStore(
    useShallow((state) => ({
      activeChannelId: state.activeChannelId,
      connectionState: state.connectionState,
      errorMessage: state.errorMessage,
      participantsByChannel: state.participantsByChannel,
      screenSharesByChannel: state.screenSharesByChannel,
    }))
  )
  const {
    isConnected,
    join,
    leave,
    isScreenSharing,
    screenShareState,
    screenShareError,
    screenStreams,
    startScreenShare,
    stopScreenShare,
  } = useVoiceChannel({ serverId, channelId })

  const members = useMemo(() => Object.values(membersById), [membersById])
  const activeParticipants = useMemo(
    () => Object.values(participantsByChannel[channelId] ?? {}),
    [channelId, participantsByChannel]
  )
  const screenShares = useMemo(
    () => screenSharesByChannel[channelId] ?? {},
    [channelId, screenSharesByChannel]
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

  const screenShareTiles = useMemo(() => {
    return screenStreams.map(({ userId, stream }) => {
      const member = membersById[userId]
      const share = screenShares[userId]
      const isLocal = userId === myUserId
      const label = isLocal
        ? 'Tu pantalla'
        : member
          ? getUserDisplayName(member.user, member.nickname)
          : currentUser && userId === currentUser.id
            ? getUserDisplayName(currentUser)
            : 'Pantalla compartida'

      return {
        userId,
        label,
        subtitle: getScreenShareSubtitle(share, isLocal),
        stream,
        isLocal,
        surface: share?.surface ?? 'unknown',
      }
    })
  }, [currentUser, membersById, myUserId, screenShares, screenStreams])

  return {
    channelName: channel?.name ?? 'voice-room',
    serverName: server?.name ?? 'Server',
    isConnected: activeChannelId === channelId && isConnected,
    connectionState,
    errorMessage,
    isScreenSharing,
    screenShareState,
    screenShareError,
    isMicMuted,
    isHeadphonesMuted,
    activeMemberCount: activeParticipants.length,
    connectedMembers,
    availableMembers,
    screenShareTiles,
    onJoin: () => {
      void join()
    },
    onLeave: leave,
    onToggleMic,
    onToggleHeadphones,
    onStartScreenShare: () => {
      void startScreenShare()
    },
    onStopScreenShare: () => {
      void stopScreenShare()
    },
  }
}

function getScreenShareSubtitle(screenShare: VoiceScreenShare | undefined, isLocal: boolean) {
  const lead = isLocal ? 'Compartiendo ' : 'Comparte '
  const surface = getScreenSurfaceLabel(screenShare?.surface)
  const quality = getScreenQualityLabel(screenShare?.height, screenShare?.frameRate)

  if (surface && quality) return `${lead}${surface} · ${quality}`
  if (surface) return `${lead}${surface}`
  if (quality) return quality
  return isLocal ? 'Tu vista se ajusta automaticamente a la red disponible.' : 'Vista en vivo'
}

function getScreenSurfaceLabel(surface: VoiceScreenShare['surface'] | undefined) {
  if (surface === 'monitor') return 'pantalla completa'
  if (surface === 'window') return 'ventana'
  if (surface === 'browser') return 'pestana'
  if (surface === 'application') return 'aplicacion'
  return null
}

function getScreenQualityLabel(height: number | null | undefined, frameRate: number | null | undefined) {
  if (!height && !frameRate) return null

  const resolution = height ? `${height}p` : null
  const fps = frameRate ? `${Math.round(frameRate)} fps` : null

  if (resolution && fps) return `${resolution} · ${fps}`
  return resolution ?? fps
}
