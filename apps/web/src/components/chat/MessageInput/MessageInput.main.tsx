'use client'

import { useMessageInputController } from './MessageInput.logic'
import { type MessageInputProps } from './MessageInput.shared'
import { MessageInputVisual } from './MessageInput.visual'

export function MessageInput(props: MessageInputProps) {
  const visualProps = useMessageInputController(props)

  return <MessageInputVisual {...visualProps} />
}
