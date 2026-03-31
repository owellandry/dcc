'use client'

import { useChatHeaderModel } from './ChatHeader.logic'
import { type ChatHeaderProps } from './ChatHeader.shared'
import { ChatHeaderVisual } from './ChatHeader.visual'

export function ChatHeader(props: ChatHeaderProps) {
  const visualProps = useChatHeaderModel(props)

  return <ChatHeaderVisual {...visualProps} />
}
