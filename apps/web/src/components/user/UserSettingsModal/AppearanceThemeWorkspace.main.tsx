'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  applyAppearanceThemeToDocument,
  buildAppearancePalette,
  normalizeHexColor,
  resolveAppearanceTheme,
  type AppearanceCustomColorScheme,
} from '@/lib/theme/appearance.shared'
import { useAppearanceStore } from '@/stores/appearanceStore'
import { UserSettingsThemeCustomizerPanel } from './UserSettingsThemeCustomizerPanel.module'

interface Props {
  open: boolean
  onClose: () => void
  onBackToSettings: () => void
}

interface WorkspaceDraft {
  primaryColor: string
  secondaryColor: string
  intensity: number
  colorScheme: AppearanceCustomColorScheme
}

export function AppearanceThemeWorkspace({ open, onClose, onBackToSettings }: Props) {
  const storedTheme = useAppearanceStore((state) => state.theme)
  const storedCustomPrimary = useAppearanceStore((state) => state.customPrimary)
  const storedCustomSecondary = useAppearanceStore((state) => state.customSecondary)
  const storedCustomIntensity = useAppearanceStore((state) => state.customIntensity)
  const storedCustomColorScheme = useAppearanceStore((state) => state.customColorScheme)
  const compactMode = useAppearanceStore((state) => state.compactMode)
  const uiDensity = useAppearanceStore((state) => state.uiDensity)
  const setTheme = useAppearanceStore((state) => state.setTheme)
  const setCustomPrimary = useAppearanceStore((state) => state.setCustomPrimary)
  const setCustomSecondary = useAppearanceStore((state) => state.setCustomSecondary)
  const setCustomIntensity = useAppearanceStore((state) => state.setCustomIntensity)
  const setCustomColorScheme = useAppearanceStore((state) => state.setCustomColorScheme)
  const [prefersDark, setPrefersDark] = useState(true)
  const [draft, setDraft] = useState<WorkspaceDraft>({
    primaryColor: '#5865F2',
    secondaryColor: '#FF6835',
    intensity: 74,
    colorScheme: 'oscuro',
  })

  useEffect(() => {
    if (!open) return

    setDraft({
      primaryColor: normalizeHexColor(storedCustomPrimary).toUpperCase(),
      secondaryColor: normalizeHexColor(storedCustomSecondary).toUpperCase(),
      intensity: storedCustomIntensity,
      colorScheme: storedCustomColorScheme,
    })
  }, [open, storedCustomColorScheme, storedCustomIntensity, storedCustomPrimary, storedCustomSecondary])

  useEffect(() => {
    if (!open) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => setPrefersDark(mediaQuery.matches)

    sync()
    mediaQuery.addEventListener('change', sync)
    return () => mediaQuery.removeEventListener('change', sync)
  }, [open])

  const storedResolvedTheme = resolveAppearanceTheme(storedTheme, prefersDark)

  const restoreStoredAppearance = () => {
    const storedPalette = buildAppearancePalette({
      theme: storedResolvedTheme,
      customPrimary: storedCustomPrimary,
      customSecondary: storedCustomSecondary,
      customIntensity: storedCustomIntensity,
      customColorScheme: storedCustomColorScheme,
    })

    applyAppearanceThemeToDocument({
      resolvedTheme: storedResolvedTheme,
      palette: storedPalette,
      uiDensity,
      compactMode,
    })
  }

  const previewPalette = useMemo(
    () =>
      buildAppearancePalette({
        theme: 'personalizado',
        customPrimary: draft.primaryColor,
        customSecondary: draft.secondaryColor,
        customIntensity: draft.intensity,
        customColorScheme: draft.colorScheme,
      }),
    [draft]
  )

  useEffect(() => {
    if (!open) return

    applyAppearanceThemeToDocument({
      resolvedTheme: 'personalizado',
      palette: previewPalette,
      uiDensity,
      compactMode,
    })

    return () => restoreStoredAppearance()
  }, [compactMode, open, previewPalette, uiDensity])

  if (!open) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[155]">
      <div className="pointer-events-auto absolute inset-y-0 right-0 w-full max-w-[430px] p-3 sm:p-4">
        <UserSettingsThemeCustomizerPanel
          primaryColor={draft.primaryColor}
          secondaryColor={draft.secondaryColor}
          intensity={draft.intensity}
          colorScheme={draft.colorScheme}
          initialPrimaryColor={normalizeHexColor(storedCustomPrimary).toUpperCase()}
          initialSecondaryColor={normalizeHexColor(storedCustomSecondary).toUpperCase()}
          initialIntensity={storedCustomIntensity}
          initialColorScheme={storedCustomColorScheme}
          onPrimaryColorChange={(value) => setDraft((current) => ({ ...current, primaryColor: normalizeHexColor(value).toUpperCase() }))}
          onSecondaryColorChange={(value) => setDraft((current) => ({ ...current, secondaryColor: normalizeHexColor(value).toUpperCase() }))}
          onIntensityChange={(value) => setDraft((current) => ({ ...current, intensity: value }))}
          onColorSchemeChange={(value) => setDraft((current) => ({ ...current, colorScheme: value }))}
          onBack={() => {
            restoreStoredAppearance()
            onBackToSettings()
          }}
          onApply={() => {
            setTheme('personalizado')
            setCustomPrimary(draft.primaryColor)
            setCustomSecondary(draft.secondaryColor)
            setCustomIntensity(draft.intensity)
            setCustomColorScheme(draft.colorScheme)
            onClose()
          }}
        />
      </div>
    </div>
  )
}
