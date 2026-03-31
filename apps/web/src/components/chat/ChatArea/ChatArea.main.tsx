'use client'

import { useChatAreaModel } from './ChatArea.logic'
import { type ChatAreaProps } from './ChatArea.shared'
import { ChatAreaVisual } from './ChatArea.visual'

export function ChatArea(props: ChatAreaProps) {
  const visualProps = useChatAreaModel(props)

  return <ChatAreaVisual {...visualProps} />
}
