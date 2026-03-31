export type AppearanceTheme = 'oscuro' | 'claro' | 'sistema' | 'personalizado'
export type ResolvedAppearanceTheme = Exclude<AppearanceTheme, 'sistema'>
export type AppearanceDensity = 'comoda' | 'compacta'

export interface AppearancePalette {
  colorScheme: 'dark' | 'light'
  themeColor: string
  variables: Record<string, string>
}

interface ApplyAppearanceThemeToDocumentOptions {
  resolvedTheme: ResolvedAppearanceTheme
  palette: AppearancePalette
  uiDensity: AppearanceDensity
  compactMode: boolean
}

interface BuildAppearancePaletteOptions {
  theme: ResolvedAppearanceTheme
  customPrimary: string
  customSecondary: string
  customIntensity?: number
}

type RgbColor = {
  r: number
  g: number
  b: number
}

const DEFAULT_PRIMARY = '#5865f2'
const DEFAULT_SECONDARY = '#ff6835'

const DARK_PALETTE: AppearancePalette = {
  colorScheme: 'dark',
  themeColor: '#111113',
  variables: {
    '--app-bg-gradient': 'radial-gradient(circle at top left, rgba(255,104,53,0.06), transparent 30%), radial-gradient(circle at top right, rgba(124,107,255,0.04), transparent 28%), linear-gradient(180deg, #111113 0%, #111113 100%)',
    '--s0': '#111113',
    '--s1': '#1a1b1e',
    '--s2': '#202124',
    '--s3': '#26272b',
    '--s4': '#2e3035',
    '--s5': '#383a40',
    '--s6': '#404349',
    '--s7': '#4b4e54',
    '--b0': 'rgba(255,255,255,0.04)',
    '--b1': 'rgba(255,255,255,0.07)',
    '--b2': 'rgba(255,255,255,0.11)',
    '--b3': 'rgba(255,255,255,0.18)',
    '--highlight-top': 'inset 0 1px 0 rgba(255,255,255,0.06)',
    '--highlight-top-strong': 'inset 0 1px 0 rgba(255,255,255,0.10)',
    '--t0': '#f2f3f5',
    '--t1': '#d4d5d9',
    '--t2': '#9ea0a8',
    '--t3': '#676970',
    '--t4': '#43444a',
    '--ember': '#ff6835',
    '--ember-hover': '#e85920',
    '--ember-dim': 'rgba(255,104,53,0.12)',
    '--ember-glow': 'rgba(255,104,53,0.30)',
    '--volt': '#7c6bff',
    '--volt-dim': 'rgba(124,107,255,0.12)',
    '--online': '#23d18b',
    '--online-glow': '0 0 0 3px rgba(35,209,139,0.25), 0 0 8px rgba(35,209,139,0.15)',
    '--idle': '#f5a623',
    '--idle-glow': '0 0 0 3px rgba(245,166,35,0.25)',
    '--dnd': '#f04747',
    '--dnd-glow': '0 0 0 3px rgba(240,71,71,0.25), 0 0 8px rgba(240,71,71,0.15)',
    '--offline': '#4e5058',
    '--shadow-sm': 'none',
    '--shadow-md': 'none',
    '--shadow-lg': 'none',
    '--shadow-xl': 'none',
    '--glass-bg': 'rgba(32,33,36,0.82)',
    '--glass-blur': 'blur(16px) saturate(160%)',
    '--glass-border': '1px solid rgba(255,255,255,0.09)',
    '--surface-soft': 'rgba(255,255,255,0.08)',
    '--surface-soft-hover': 'rgba(255,255,255,0.15)',
    '--surface-overlay': 'rgba(0,0,0,0.35)',
    '--surface-overlay-hover': 'rgba(0,0,0,0.5)',
    '--modal-scrim': 'rgba(0,0,0,0.7)',
    '--panel-shadow': 'none',
  },
}

const LIGHT_PALETTE: AppearancePalette = {
  colorScheme: 'light',
  themeColor: '#eef2f7',
  variables: {
    '--app-bg-gradient': 'radial-gradient(circle at top left, rgba(255,104,53,0.08), transparent 28%), radial-gradient(circle at top right, rgba(124,107,255,0.08), transparent 30%), linear-gradient(180deg, #f7f9fc 0%, #eef2f7 100%)',
    '--s0': '#eef2f7',
    '--s1': '#f7f9fc',
    '--s2': '#ffffff',
    '--s3': '#f4f7fb',
    '--s4': '#eef2f8',
    '--s5': '#e8edf5',
    '--s6': '#e0e6f0',
    '--s7': '#d7dfec',
    '--b0': 'rgba(15,23,42,0.04)',
    '--b1': 'rgba(15,23,42,0.08)',
    '--b2': 'rgba(15,23,42,0.14)',
    '--b3': 'rgba(15,23,42,0.22)',
    '--highlight-top': 'inset 0 1px 0 rgba(255,255,255,0.78)',
    '--highlight-top-strong': 'inset 0 1px 0 rgba(255,255,255,0.92)',
    '--t0': '#101828',
    '--t1': '#243041',
    '--t2': '#516074',
    '--t3': '#718198',
    '--t4': '#9aa7b8',
    '--ember': '#f0602b',
    '--ember-hover': '#db4b17',
    '--ember-dim': 'rgba(240,96,43,0.12)',
    '--ember-glow': 'rgba(240,96,43,0.24)',
    '--volt': '#6f63f6',
    '--volt-dim': 'rgba(111,99,246,0.12)',
    '--online': '#129f67',
    '--online-glow': '0 0 0 3px rgba(18,159,103,0.16)',
    '--idle': '#d98712',
    '--idle-glow': '0 0 0 3px rgba(217,135,18,0.18)',
    '--dnd': '#d74d4d',
    '--dnd-glow': '0 0 0 3px rgba(215,77,77,0.16)',
    '--offline': '#8b94a5',
    '--shadow-sm': 'none',
    '--shadow-md': 'none',
    '--shadow-lg': 'none',
    '--shadow-xl': 'none',
    '--glass-bg': 'rgba(255,255,255,0.78)',
    '--glass-blur': 'blur(16px) saturate(140%)',
    '--glass-border': '1px solid rgba(15,23,42,0.08)',
    '--surface-soft': 'rgba(15,23,42,0.05)',
    '--surface-soft-hover': 'rgba(15,23,42,0.10)',
    '--surface-overlay': 'rgba(255,255,255,0.74)',
    '--surface-overlay-hover': 'rgba(255,255,255,0.9)',
    '--modal-scrim': 'rgba(15,23,42,0.42)',
    '--panel-shadow': 'none',
  },
}

export function resolveAppearanceTheme(theme: AppearanceTheme, prefersDark: boolean): ResolvedAppearanceTheme {
  if (theme === 'sistema') return prefersDark ? 'oscuro' : 'claro'
  return theme
}

export function normalizeHexColor(input: string, fallback = DEFAULT_PRIMARY) {
  const trimmed = input.trim()
  if (!trimmed) return fallback

  const normalized = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed
  if (/^[0-9a-fA-F]{3}$/.test(normalized)) {
    return `#${normalized.split('').map((value) => `${value}${value}`).join('').toLowerCase()}`
  }
  if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `#${normalized.toLowerCase()}`
  }

  return fallback
}

export function buildAppearancePalette({
  theme,
  customPrimary,
  customSecondary,
  customIntensity = 74,
}: BuildAppearancePaletteOptions): AppearancePalette {
  if (theme === 'oscuro') return DARK_PALETTE
  if (theme === 'claro') return LIGHT_PALETTE

  const primary = normalizeHexColor(customPrimary, DEFAULT_PRIMARY)
  const secondary = normalizeHexColor(customSecondary, DEFAULT_SECONDARY)
  const blend = mixColors(primary, secondary, 0.5)
  const intensity = clamp(customIntensity, 0, 100) / 100
  const surfaceTint = 0.14 + intensity * 0.28
  const panelTint = 0.18 + intensity * 0.32
  const highlightTint = 0.22 + intensity * 0.36
  const base0 = mixColors('#090d16', blend, surfaceTint)
  const base1 = mixColors('#121827', primary, panelTint)
  const base2 = mixColors('#192234', blend, panelTint)
  const base3 = mixColors('#1d2740', secondary, panelTint)
  const base4 = mixColors('#26324d', blend, highlightTint)
  const base5 = mixColors('#304063', primary, highlightTint)
  const base6 = mixColors('#3b4d73', secondary, highlightTint)
  const base7 = mixColors('#4a5d86', blend, 0.28 + intensity * 0.42)

  return {
    colorScheme: 'dark',
    themeColor: base0,
    variables: {
      '--custom-theme-color-1': primary,
      '--custom-theme-color-2': secondary,
      '--app-bg-gradient': `linear-gradient(145deg, ${primary} 0%, ${secondary} 100%)`,
      '--s0': base0,
      '--s1': base1,
      '--s2': base2,
      '--s3': base3,
      '--s4': base4,
      '--s5': base5,
      '--s6': base6,
      '--s7': base7,
      '--b0': withAlpha('#ffffff', 0.05),
      '--b1': withAlpha('#ffffff', 0.08),
      '--b2': withAlpha('#ffffff', 0.14),
      '--b3': withAlpha('#ffffff', 0.22),
      '--highlight-top': 'inset 0 1px 0 rgba(255,255,255,0.08)',
      '--highlight-top-strong': 'inset 0 1px 0 rgba(255,255,255,0.13)',
      '--t0': '#f6f8ff',
      '--t1': '#d8def0',
      '--t2': '#afb8d2',
      '--t3': '#7b86a5',
      '--t4': '#5f6987',
      '--ember': primary,
      '--ember-hover': mixColors(primary, '#05070d', 0.22),
      '--ember-dim': withAlpha(primary, 0.1 + intensity * 0.12),
      '--ember-glow': withAlpha(primary, 0.22 + intensity * 0.16),
      '--volt': secondary,
      '--volt-dim': withAlpha(secondary, 0.1 + intensity * 0.12),
      '--online': '#28d490',
      '--online-glow': '0 0 0 3px rgba(40,212,144,0.25), 0 0 8px rgba(40,212,144,0.15)',
      '--idle': '#f7b13b',
      '--idle-glow': '0 0 0 3px rgba(247,177,59,0.22)',
      '--dnd': '#f35e67',
      '--dnd-glow': '0 0 0 3px rgba(243,94,103,0.22), 0 0 8px rgba(243,94,103,0.12)',
      '--offline': '#5f6881',
      '--shadow-sm': 'none',
      '--shadow-md': 'none',
      '--shadow-lg': 'none',
      '--shadow-xl': 'none',
      '--glass-bg': `${withAlpha(base2, 0.82)}`,
      '--glass-blur': 'blur(18px) saturate(150%)',
      '--glass-border': `1px solid ${withAlpha('#ffffff', 0.08)}`,
      '--surface-soft': withAlpha('#ffffff', 0.04 + intensity * 0.06),
      '--surface-soft-hover': withAlpha('#ffffff', 0.08 + intensity * 0.1),
      '--surface-overlay': 'rgba(4,8,18,0.38)',
      '--surface-overlay-hover': 'rgba(4,8,18,0.56)',
      '--modal-scrim': 'rgba(4,8,18,0.72)',
      '--panel-shadow': 'none',
    },
  }
}

export function applyAppearanceThemeToDocument({
  resolvedTheme,
  palette,
  uiDensity,
  compactMode,
}: ApplyAppearanceThemeToDocumentOptions) {
  const root = document.documentElement

  root.dataset.theme = resolvedTheme
  root.dataset.uiDensity = uiDensity
  root.dataset.messageLayout = compactMode ? 'compact' : 'comfortable'
  root.style.colorScheme = palette.colorScheme

  for (const [key, value] of Object.entries(palette.variables)) {
    root.style.setProperty(key, value)
  }

  let themeColorMeta = document.querySelector('meta[name="theme-color"]')
  if (!themeColorMeta) {
    themeColorMeta = document.createElement('meta')
    themeColorMeta.setAttribute('name', 'theme-color')
    document.head.appendChild(themeColorMeta)
  }
  themeColorMeta.setAttribute('content', palette.themeColor)
}

function mixColors(colorA: string, colorB: string, weightOfB: number) {
  const first = hexToRgb(colorA)
  const second = hexToRgb(colorB)
  const weight = clamp(weightOfB, 0, 1)

  return rgbToHex({
    r: Math.round(first.r * (1 - weight) + second.r * weight),
    g: Math.round(first.g * (1 - weight) + second.g * weight),
    b: Math.round(first.b * (1 - weight) + second.b * weight),
  })
}

function withAlpha(color: string, alpha: number) {
  const { r, g, b } = hexToRgb(color)
  return `rgba(${r},${g},${b},${clamp(alpha, 0, 1)})`
}

function hexToRgb(color: string): RgbColor {
  const normalized = normalizeHexColor(color, DEFAULT_PRIMARY)
  const value = normalized.slice(1)

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  }
}

function rgbToHex({ r, g, b }: RgbColor) {
  return `#${[r, g, b]
    .map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
