import type { ReactNode } from 'react'

export interface ChannelHeaderBarProps {
  channelName: string
  topic?: string
  channelType?: 'text' | 'voice'
  isMemberListOpen?: boolean
  onToggleMemberList?: () => void
}

export interface ChannelHeaderBarVisualProps {
  channelName: string
  topic?: string
  channelKind: 'default' | 'rules' | 'welcome' | 'voice'
  isMemberListOpen?: boolean
  onToggleMemberList?: () => void
}

export interface HeaderButtonProps {
  icon: ReactNode
  title: string
  active?: boolean
  onClick?: () => void
}
