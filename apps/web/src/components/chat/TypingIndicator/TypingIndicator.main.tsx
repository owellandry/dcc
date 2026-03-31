'use client'

import { useTypingIndicatorModel } from './TypingIndicator.logic'
import { type TypingIndicatorProps } from './TypingIndicator.shared'
import { TypingIndicatorVisual } from './TypingIndicator.visual'

export function TypingIndicator(props: TypingIndicatorProps) {
  const visualProps = useTypingIndicatorModel(props)

  return <TypingIndicatorVisual {...visualProps} />
}
