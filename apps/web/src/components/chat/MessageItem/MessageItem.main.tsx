'use client'

import { useMessageItemController } from './MessageItem.logic'
import { type MessageItemProps } from './MessageItem.shared'
import { MessageItemVisual } from './MessageItem.visual'

export function MessageItem(props: MessageItemProps) {
  const visualProps = useMessageItemController(props)

  return <MessageItemVisual {...visualProps} />
}
