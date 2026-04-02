import type { CSSProperties } from 'react'

export interface ChannelAppearanceConfig {
  fontKey?: string | null | undefined
  fontWeight?: number | null | undefined
}

export interface ChannelFontOption {
  key: string
  label: string
  fontFamily: string
}

export const CHANNEL_FONT_OPTIONS: ChannelFontOption[] = [
  { key: 'k2d', label: 'K2D', fontFamily: "var(--font-display)" },
  { key: 'manrope', label: 'Manrope', fontFamily: "'Manrope', var(--font-body)" },
  { key: 'space-grotesk', label: 'Space Grotesk', fontFamily: "'Space Grotesk', var(--font-body)" },
  { key: 'jetbrains-mono', label: 'JetBrains Mono', fontFamily: "var(--font-mono)" },
]

export const CHANNEL_FONT_WEIGHT_OPTIONS = [
  { value: 300, label: '300 · Light' },
  { value: 400, label: '400 · Regular' },
  { value: 500, label: '500 · Medium' },
  { value: 600, label: '600 · SemiBold' },
  { value: 700, label: '700 · Bold' },
  { value: 800, label: '800 · ExtraBold' },
] as const

const DEFAULT_FONT_KEY = 'k2d'

export function getChannelFontOption(fontKey: string | null | undefined) {
  return CHANNEL_FONT_OPTIONS.find((option) => option.key === fontKey)
    ?? CHANNEL_FONT_OPTIONS[0]
    ?? { key: DEFAULT_FONT_KEY, label: 'K2D', fontFamily: 'var(--font-display)' }
}

export function getChannelNameTextStyle(config: ChannelAppearanceConfig): CSSProperties {
  const fontOption = getChannelFontOption(config.fontKey ?? DEFAULT_FONT_KEY)

  return {
    fontFamily: fontOption.fontFamily,
    ...(config.fontWeight ? { fontWeight: config.fontWeight } : {}),
  }
}
