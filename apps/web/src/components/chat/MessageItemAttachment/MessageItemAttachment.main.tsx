'use client'

import { useMessageItemAttachmentModel } from './MessageItemAttachment.logic'
import { type MessageItemAttachmentProps } from './MessageItemAttachment.shared'
import { MessageItemAttachmentVisual } from './MessageItemAttachment.visual'

export function MessageItemAttachment(props: MessageItemAttachmentProps) {
  const visualProps = useMessageItemAttachmentModel(props)

  return <MessageItemAttachmentVisual {...visualProps} />
}
