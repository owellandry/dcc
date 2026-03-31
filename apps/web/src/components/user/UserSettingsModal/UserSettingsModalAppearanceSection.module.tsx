'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { IconType } from 'react-icons'
import {
  MdAutoAwesome,
  MdDarkMode,
  MdLightMode,
  MdOutlineDesktopWindows,
  MdPalette,
  MdTune,
} from 'react-icons/md'
import {
  buildAppearancePalette,
  normalizeHexColor,
  resolveAppearanceTheme,
  type AppearanceDensity,
  type AppearanceTheme,
} from '@/lib/theme/appearance.shared'

const themeCards: Array<{
  value: AppearanceTheme
  label: string
  description: string
  icon: IconType
}> = [
  {
    value: 'oscuro',
    label: 'Oscuro',
    description: 'Reduce brillo y mantiene el look profundo del app.',
    icon: MdDarkMode,
  },
  {
    value: 'claro',
    label: 'Claro',
    description: 'Lleva toda la interfaz a una base blanca y limpia.',
    icon: MdLightMode,
  },
  {
    value: 'sistema',
    label: 'Sistema',
    description: 'Sigue automaticamente el modo de tu dispositivo.',
    icon: MdOutlineDesktopWindows,
  },
  {
    value: 'personalizado',
    label: 'Personalizado',
    description: 'Abre el editor lateral con preview global.',
    icon: MdAutoAwesome,
  },
]

interface Props {
  theme: AppearanceTheme
  customPrimary: string
  customSecondary: string
  customIntensity: number
  compactMode: boolean
  uiDensity: AppearanceDensity
  onThemeChange: (value: AppearanceTheme) => void
  onCompactModeChange: (value: boolean) => void
  onUiDensityChange: (value: AppearanceDensity) => void
  onOpenThemeWorkspace: () => void
}

export function UserSettingsModalAppearanceSection({
  theme,
  customPrimary,
  customSecondary,
  customIntensity,
  compactMode,
  uiDensity,
  onThemeChange,
  onCompactModeChange,
  onUiDensityChange,
  onOpenThemeWorkspace,
}: Props) {
  const [prefersDark, setPrefersDark] = useState(true)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => setPrefersDark(mediaQuery.matches)

    sync()
    mediaQuery.addEventListener('change', sync)
    return () => mediaQuery.removeEventListener('change', sync)
  }, [])

  const resolvedTheme = resolveAppearanceTheme(theme, prefersDark)
  const primaryColor = normalizeHexColor(customPrimary).toUpperCase()
  const secondaryColor = normalizeHexColor(customSecondary).toUpperCase()

  const previewPalette = useMemo(
    () =>
      buildAppearancePalette({
        theme: resolvedTheme,
        customPrimary: primaryColor,
        customSecondary: secondaryColor,
        customIntensity,
      }),
    [customIntensity, primaryColor, resolvedTheme, secondaryColor]
  )

  const previewStyle = useMemo(
    () =>
      ({
        ...previewPalette.variables,
        backgroundColor: 'var(--s2)',
        backgroundImage: 'var(--app-bg-gradient)',
        borderColor: 'var(--b2)',
        color: 'var(--t1)',
      }) as CSSProperties,
    [previewPalette.variables]
  )

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="rounded-2xl border border-[var(--b1)] bg-[var(--s2)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-700 text-[var(--t0)]">Apariencia</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--t3)]">
              Usa los temas rapidos aqui o abre el editor lateral para construir un tema personalizado a pantalla completa.
            </p>
          </div>
          <span className="rounded-full border border-[var(--b1)] bg-[var(--surface-soft)] px-3 py-1 text-[11px] font-700 uppercase tracking-[0.14em] text-[var(--t2)]">
            Editor lateral
          </span>
        </div>
      </div>

      <div className="rounded-2xl border p-5" style={previewStyle}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-700 uppercase tracking-[0.14em] text-[var(--t3)]">Resumen actual</p>
            <p className="mt-2 text-sm text-[var(--t2)]">
              {theme === 'sistema'
                ? `Ahora mismo el sistema esta en modo ${prefersDark ? 'oscuro' : 'claro'}.`
                : theme === 'personalizado'
                  ? 'Tu tema personalizado ya usa tus colores guardados.'
                  : `La interfaz esta preparada en modo ${theme}.`}
            </p>
          </div>
          <div
            className="h-12 w-28 rounded-2xl border"
            style={{ background: `linear-gradient(145deg, ${primaryColor} 0%, ${secondaryColor} 100%)`, borderColor: 'var(--b2)' }}
          />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-xl border border-[var(--b1)] bg-[var(--s1)] p-4 shadow-[var(--highlight-top)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-700 text-[var(--t0)]">#general</p>
                <p className="mt-1 text-xs text-[var(--t3)]">Este bloque te deja ver el estado general del tema.</p>
              </div>
              <span className="rounded-full bg-[var(--ember-dim)] px-2.5 py-1 text-[11px] font-700 text-[var(--ember)]">
                {theme === 'personalizado' ? 'Personalizado' : 'Base'}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-[var(--b1)] bg-[var(--s0)] px-4 py-3">
                <p className="text-sm font-700 text-[var(--t0)]">owellandry</p>
                <p className={`mt-1 text-sm text-[var(--t1)] ${compactMode ? 'leading-5' : 'leading-7'}`}>
                  Si quieres una edicion mas inmersiva, pulsa Personalizado y te abrimos el panel lateral.
                </p>
              </div>
              <div className="rounded-xl border border-[var(--b1)] bg-[var(--surface-soft)] px-4 py-3">
                <p className="text-sm text-[var(--t1)]">
                  Densidad <span className="font-700 text-[var(--t0)]">{uiDensity}</span> y color <span className="font-700 text-[var(--t0)]">{customIntensity}%</span>.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--b1)] bg-[var(--s1)] p-4 shadow-[var(--highlight-top)]">
            <p className="text-xs font-700 uppercase tracking-[0.14em] text-[var(--t4)]">Paleta</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <ColorChip label="Color 1" color={primaryColor} />
              <ColorChip label="Color 2" color={secondaryColor} />
            </div>
            <button
              type="button"
              onClick={onOpenThemeWorkspace}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ember)] px-4 py-3 text-sm font-700 text-white transition-opacity hover:opacity-90"
            >
              <MdAutoAwesome size={16} />
              Abrir editor personalizado
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--b1)] bg-[var(--s2)] p-5">
        <div className="flex items-center gap-2 text-sm font-700 uppercase tracking-[0.14em] text-[var(--t4)]">
          <MdPalette size={15} />
          Temas
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {themeCards.map((card) => {
            const Icon = card.icon
            const selected = theme === card.value

            return (
              <button
                key={card.value}
                type="button"
                onClick={() => {
                  if (card.value === 'personalizado') {
                    onOpenThemeWorkspace()
                    return
                  }
                  onThemeChange(card.value)
                }}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  selected
                    ? 'border-[var(--ember)] bg-[var(--ember-dim)]'
                    : 'border-[var(--b1)] bg-[var(--s1)] hover:border-[var(--b2)] hover:bg-[var(--surface-soft)]'
                }`}
              >
                <p className="flex items-center gap-2 text-sm font-700 text-[var(--t0)]">
                  <Icon size={16} className={selected ? 'text-[var(--ember)]' : 'text-[var(--t4)]'} />
                  {card.label}
                </p>
                <p className="mt-2 text-xs leading-5 text-[var(--t3)]">{card.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--b1)] bg-[var(--s2)] p-5">
        <div className="flex items-center gap-2 text-sm font-700 uppercase tracking-[0.14em] text-[var(--t4)]">
          <MdTune size={15} />
          Densidad y mensajes
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-[var(--b1)] bg-[var(--s1)] p-4">
            <p className="text-sm font-700 text-[var(--t0)]">Densidad de interfaz</p>
            <div className="mt-3 inline-flex rounded-lg bg-[var(--s0)] p-1">
              <button
                type="button"
                onClick={() => onUiDensityChange('comoda')}
                className={`rounded-md px-3 py-1.5 text-xs font-700 transition-colors ${
                  uiDensity === 'comoda' ? 'bg-[var(--ember)] text-white' : 'text-[var(--t3)] hover:bg-[var(--surface-soft)]'
                }`}
              >
                Comoda
              </button>
              <button
                type="button"
                onClick={() => onUiDensityChange('compacta')}
                className={`rounded-md px-3 py-1.5 text-xs font-700 transition-colors ${
                  uiDensity === 'compacta' ? 'bg-[var(--ember)] text-white' : 'text-[var(--t3)] hover:bg-[var(--surface-soft)]'
                }`}
              >
                Compacta
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--b1)] bg-[var(--s1)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-700 text-[var(--t0)]">Modo compacto de mensajes</p>
                <p className="mt-1 text-sm leading-6 text-[var(--t3)]">
                  Reduce espacios entre mensajes para mostrar mas contenido en pantalla.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={compactMode}
                onClick={() => onCompactModeChange(!compactMode)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors ${
                  compactMode
                    ? 'border-[var(--ember)] bg-[var(--ember)]'
                    : 'border-[var(--b1)] bg-[var(--surface-soft)]'
                }`}
              >
                <span
                  className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white transition-all ${
                    compactMode ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ColorChip({ label, color }: { label: string; color: string }) {
  return (
    <div className="rounded-xl border border-[var(--b1)] bg-[var(--s0)] p-3">
      <div className="h-12 rounded-xl border border-[var(--b1)]" style={{ backgroundColor: color }} />
      <p className="mt-3 text-xs font-700 uppercase tracking-[0.14em] text-[var(--t4)]">{label}</p>
      <p className="mt-1 font-mono text-sm text-[var(--t1)]">{color}</p>
    </div>
  )
}
