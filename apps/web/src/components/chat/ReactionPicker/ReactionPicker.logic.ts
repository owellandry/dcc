'use client'

import { useEffect, useState } from 'react'
import { buildAppearancePalette, resolveAppearanceTheme } from '@/lib/theme/appearance.shared'
import { useAppearanceStore } from '@/stores/appearanceStore'
import { type ReactionPickerProps, type ReactionPickerVisualProps } from './ReactionPicker.shared'

export function useReactionPickerController({
  pickerRef,
  onPick,
}: ReactionPickerProps): ReactionPickerVisualProps {
  const theme = useAppearanceStore((state) => state.theme)
  const customPrimary = useAppearanceStore((state) => state.customPrimary)
  const customSecondary = useAppearanceStore((state) => state.customSecondary)
  const customIntensity = useAppearanceStore((state) => state.customIntensity)
  const customColorScheme = useAppearanceStore((state) => state.customColorScheme)
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
  const palette = buildAppearancePalette({
    theme: resolvedTheme,
    customPrimary,
    customSecondary,
    customIntensity,
    customColorScheme,
  })
  const pickerTheme = palette.colorScheme === 'light' ? 'light' : 'dark'

  return {
    pickerRef,
    pickerTheme,
    onPick,
  }
}
