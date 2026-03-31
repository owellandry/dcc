'use client'

import { useChannelSidebarModel } from './ChannelSidebar.logic'
import { type ChannelSidebarProps } from './ChannelSidebar.shared'
import { ChannelSidebarVisual } from './ChannelSidebar.visual'

export function ChannelSidebar(props: ChannelSidebarProps) {
  const visualProps = useChannelSidebarModel(props)

  return <ChannelSidebarVisual {...visualProps} />
}
