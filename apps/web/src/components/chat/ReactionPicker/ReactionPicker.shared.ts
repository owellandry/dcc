import type { RefObject } from 'react'

export interface ReactionPickerProps {
  pickerRef: RefObject<HTMLDivElement | null>
  onPick: (emoji: string) => void
}

export interface ReactionPickerVisualProps {
  pickerRef: RefObject<HTMLDivElement | null>
  pickerTheme: 'light' | 'dark'
  onPick: (emoji: string) => void
}
