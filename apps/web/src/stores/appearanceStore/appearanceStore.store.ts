'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppearanceDensity, AppearanceTheme } from '@/lib/theme/appearance.shared'

interface AppearanceState {
  theme: AppearanceTheme
  customPrimary: string
  customSecondary: string
  customIntensity: number
  compactMode: boolean
  uiDensity: AppearanceDensity
  setTheme: (theme: AppearanceTheme) => void
  setCustomPrimary: (color: string) => void
  setCustomSecondary: (color: string) => void
  setCustomIntensity: (value: number) => void
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
      compactMode: false,
      uiDensity: 'comoda',
      setTheme: (theme) => set({ theme }),
      setCustomPrimary: (customPrimary) => set({ customPrimary }),
      setCustomSecondary: (customSecondary) => set({ customSecondary }),
      setCustomIntensity: (customIntensity) => set({ customIntensity }),
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
        compactMode: state.compactMode,
        uiDensity: state.uiDensity,
      }),
    }
  )
)
