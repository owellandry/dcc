import type { ServerMember, VoiceScreenSurface } from '@/lib/types'
import type { VoiceConnectionState } from '@/stores/voiceStore'

export interface VoiceChannelRoomProps {
  serverId: string
  channelId: string
}

export interface VoiceChannelRoomVisualProps {
  channelName: string
  serverName: string
  isConnected: boolean
  connectionState: VoiceConnectionState
  errorMessage: string | null
  isScreenSharing: boolean
  screenShareState: 'idle' | 'requesting-media' | 'sharing' | 'error'
  screenShareError: string | null
  isMicMuted: boolean
  isHeadphonesMuted: boolean
  activeMemberCount: number
  connectedMembers: ServerMember[]
  availableMembers: ServerMember[]
  screenShareTiles: VoiceChannelScreenShareTile[]
  onJoin: () => void
  onLeave: () => void
  onToggleMic: () => void
  onToggleHeadphones: () => void
  onStartScreenShare: () => void
  onStopScreenShare: () => void
}

export interface VoiceChannelScreenShareTile {
  userId: string
  label: string
  subtitle: string
  stream: MediaStream
  isLocal: boolean
  surface: VoiceScreenSurface
}
