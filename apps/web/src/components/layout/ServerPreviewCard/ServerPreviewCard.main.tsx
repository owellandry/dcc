'use client'

import { useServerPreviewCardModel } from './ServerPreviewCard.logic'
import { type ServerPreviewCardProps } from './ServerPreviewCard.shared'
import { ServerPreviewCardVisual } from './ServerPreviewCard.visual'

export function ServerPreviewCard(props: ServerPreviewCardProps) {
  const visualProps = useServerPreviewCardModel(props)

  return <ServerPreviewCardVisual {...visualProps} />
}
