'use client'

import { MessageInput } from '../MessageInput'
import { TypingIndicator } from '../TypingIndicator'
import { type ChatComposerPanelProps } from './ChatComposerPanel.shared'

export function ChatComposerPanelVisual({
  channelId,
  channelName,
  canSendMessages,
}: ChatComposerPanelProps) {
  return (
    <div className="shrink-0 px-2 pb-2 pt-0">
      <TypingIndicator channelId={channelId} />
      <MessageInput
        channelId={channelId}
        channelName={channelName}
        canSendMessages={canSendMessages}
      />
    </div>
  )
}
