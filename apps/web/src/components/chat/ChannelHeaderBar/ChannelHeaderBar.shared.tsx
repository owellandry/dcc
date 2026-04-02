import type { ReactNode } from 'react'

export interface ChannelHeaderBarProps {
  channelName: string
  topic?: string
  iconKey?: string | null
  fontKey?: string | null
  fontWeight?: number | null
  channelType?: 'text' | 'voice' | 'announcement'
  isMemberListOpen?: boolean
  onToggleMemberList?: () => void
}

export interface ChannelHeaderBarVisualProps {
  channelName: string
  topic?: string
  channelKind: 'default' | 'rules' | 'welcome' | 'voice'
  iconKey?: string | null
  fontKey?: string | null
  fontWeight?: number | null
  channelType?: 'text' | 'voice' | 'announcement'
  isMemberListOpen?: boolean
  onToggleMemberList?: () => void
}

export interface HeaderButtonProps {
  icon: ReactNode
  title: string
  active?: boolean
  onClick?: () => void
}
