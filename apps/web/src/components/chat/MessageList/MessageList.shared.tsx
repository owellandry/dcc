import type { RefObject } from 'react'
import type { Message, User, UserStatus } from '@/lib/types'

export interface MessageListProps {
  channelId: string
}

export interface MessageGroup {
  message: Message
  grouped: boolean
}

export interface MessageListVisualProps {
  isEmpty: boolean
  isLoading: boolean
  hasMoreBefore: boolean
  groupedMessages: MessageGroup[]
  parentRef: RefObject<HTMLDivElement | null>
  dmIntro: DMIntroCardData | null
  onScroll: () => void
}

export interface DMIntroCardData {
  user: User
  status: UserStatus
  discriminatorLabel: string
  subtitle: string
}
