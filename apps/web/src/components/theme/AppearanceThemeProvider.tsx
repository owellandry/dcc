'use client'

import { useEffect, useState } from 'react'
import {
  applyAppearanceThemeToDocument,
  buildAppearancePalette,
  resolveAppearanceTheme,
} from '@/lib/theme/appearance.shared'
import { useAppearanceStore } from '@/stores/appearanceStore'

export function AppearanceThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppearanceStore((state) => state.theme)
  const customPrimary = useAppearanceStore((state) => state.customPrimary)
  const customSecondary = useAppearanceStore((state) => state.customSecondary)
  const customIntensity = useAppearanceStore((state) => state.customIntensity)
  const compactMode = useAppearanceStore((state) => state.compactMode)
  const uiDensity = useAppearanceStore((state) => state.uiDensity)
  const [prefersDark, setPrefersDark] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => setPrefersDark(mediaQuery.matches)

    sync()
    mediaQuery.addEventListener('change', sync)
    return () => mediaQuery.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const resolvedTheme = resolveAppearanceTheme(theme, prefersDark)
    const palette = buildAppearancePalette({
      theme: resolvedTheme,
      customPrimary,
      customSecondary,
      customIntensity,
    })
    applyAppearanceThemeToDocument({
      resolvedTheme,
      palette,
      uiDensity,
      compactMode,
    })
  }, [compactMode, customIntensity, customPrimary, customSecondary, prefersDark, theme, uiDensity])

  return children
}
