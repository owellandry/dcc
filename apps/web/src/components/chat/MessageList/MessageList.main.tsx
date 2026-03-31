'use client'

import { useMessageListModel } from './MessageList.logic'
import { type MessageListProps } from './MessageList.shared'
import { MessageListVisual } from './MessageList.visual'

export function MessageList(props: MessageListProps) {
  const visualProps = useMessageListModel(props)

  return <MessageListVisual {...visualProps} />
}
