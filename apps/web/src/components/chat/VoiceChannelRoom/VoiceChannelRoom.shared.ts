import type { ServerMember } from '@/lib/types'
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
  isMicMuted: boolean
  isHeadphonesMuted: boolean
  activeMemberCount: number
  connectedMembers: ServerMember[]
  availableMembers: ServerMember[]
  onJoin: () => void
  onLeave: () => void
  onToggleMic: () => void
  onToggleHeadphones: () => void
}
