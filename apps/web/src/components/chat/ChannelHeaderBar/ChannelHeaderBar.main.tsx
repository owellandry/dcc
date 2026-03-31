'use client'

import { useChannelHeaderBarModel } from './ChannelHeaderBar.logic'
import { type ChannelHeaderBarProps } from './ChannelHeaderBar.shared'
import { ChannelHeaderBarVisual } from './ChannelHeaderBar.visual'

export function ChannelHeaderBar(props: ChannelHeaderBarProps) {
  const visualProps = useChannelHeaderBarModel(props)

  return <ChannelHeaderBarVisual {...visualProps} />
}
