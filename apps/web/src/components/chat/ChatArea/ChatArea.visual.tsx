'use client'

import { ChatComposerPanel } from '../ChatComposerPanel'
import { MessageList } from '../MessageList'
import { type ChatAreaVisualProps } from './ChatArea.shared'

export function ChatAreaVisual({
  channelId,
  channelName,
  canSendMessages,
  showComposer,
}: ChatAreaVisualProps) {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-[var(--s3)]">
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <MessageList channelId={channelId} />
      </div>

      {showComposer ? (
        <ChatComposerPanel
          channelId={channelId}
          channelName={channelName}
          canSendMessages={canSendMessages}
        />
      ) : null}
    </main>
  )
}
