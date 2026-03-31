'use client'

import { useChatComposerPanelModel } from './ChatComposerPanel.logic'
import { type ChatComposerPanelProps } from './ChatComposerPanel.shared'
import { ChatComposerPanelVisual } from './ChatComposerPanel.visual'

export function ChatComposerPanel(props: ChatComposerPanelProps) {
  const visualProps = useChatComposerPanelModel(props)

  return <ChatComposerPanelVisual {...visualProps} />
}
