import type { User, UserStatus } from '@/lib/types'

export interface ChatHeaderProps {
  channelId: string
  serverId?: string
  isMemberListOpen?: boolean
  onToggleMemberList?: () => void
}

export interface ChatHeaderVisualProps {
  kind: 'channel' | 'dm'
  channelName: string
  topic?: string
  iconKey?: string | null
  fontKey?: string | null
  fontWeight?: number | null
  channelType?: 'text' | 'voice' | 'announcement'
  isMemberListOpen?: boolean
  onToggleMemberList?: () => void
  dmUser?: User | null
  dmStatus?: UserStatus
  dmSearchPlaceholder?: string
}
