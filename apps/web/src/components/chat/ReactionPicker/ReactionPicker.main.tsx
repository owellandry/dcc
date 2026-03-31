'use client'

import { useReactionPickerController } from './ReactionPicker.logic'
import { type ReactionPickerProps } from './ReactionPicker.shared'
import { ReactionPickerVisual } from './ReactionPicker.visual'

export function ReactionPicker(props: ReactionPickerProps) {
  const visualProps = useReactionPickerController(props)

  return <ReactionPickerVisual {...visualProps} />
}
