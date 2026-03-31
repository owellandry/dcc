'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AppearanceCustomColorScheme,
  AppearanceDensity,
  AppearanceTheme,
} from '@/lib/theme/appearance.shared'

interface AppearanceState {
  theme: AppearanceTheme
  customPrimary: string
  customSecondary: string
  customIntensity: number
  customColorScheme: AppearanceCustomColorScheme
  compactMode: boolean
  uiDensity: AppearanceDensity
  setTheme: (theme: AppearanceTheme) => void
  setCustomPrimary: (color: string) => void
  setCustomSecondary: (color: string) => void
  setCustomIntensity: (value: number) => void
  setCustomColorScheme: (value: AppearanceCustomColorScheme) => void
  setCompactMode: (value: boolean) => void
  setUiDensity: (value: AppearanceDensity) => void
}

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      theme: 'oscuro',
      customPrimary: '#5865f2',
      customSecondary: '#ff6835',
      customIntensity: 74,
      customColorScheme: 'oscuro',
      compactMode: false,
      uiDensity: 'comoda',
      setTheme: (theme) => set({ theme }),
      setCustomPrimary: (customPrimary) => set({ customPrimary }),
      setCustomSecondary: (customSecondary) => set({ customSecondary }),
      setCustomIntensity: (customIntensity) => set({ customIntensity }),
      setCustomColorScheme: (customColorScheme) => set({ customColorScheme }),
      setCompactMode: (compactMode) => set({ compactMode }),
      setUiDensity: (uiDensity) => set({ uiDensity }),
    }),
    {
      name: 'dcc-appearance',
      partialize: (state) => ({
        theme: state.theme,
        customPrimary: state.customPrimary,
        customSecondary: state.customSecondary,
        customIntensity: state.customIntensity,
        customColorScheme: state.customColorScheme,
        compactMode: state.compactMode,
        uiDensity: state.uiDensity,
      }),
    }
  )
)
