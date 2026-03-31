'use client'

import { useEffect, useState } from 'react'
import { resolveAppearanceTheme } from '@/lib/theme/appearance.shared'
import { useAppearanceStore } from '@/stores/appearanceStore'
import { type ReactionPickerProps, type ReactionPickerVisualProps } from './ReactionPicker.shared'

export function useReactionPickerController({
  pickerRef,
  onPick,
}: ReactionPickerProps): ReactionPickerVisualProps {
  const theme = useAppearanceStore((state) => state.theme)
  const [prefersDark, setPrefersDark] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => setPrefersDark(mediaQuery.matches)

    sync()
    mediaQuery.addEventListener('change', sync)
    return () => mediaQuery.removeEventListener('change', sync)
  }, [])

  const resolvedTheme = resolveAppearanceTheme(theme, prefersDark)
  const pickerTheme = resolvedTheme === 'claro' ? 'light' : 'dark'

  return {
    pickerRef,
    pickerTheme,
    onPick,
  }
}
