'use client'

import { useEffect, useMemo, useState } from 'react'
import { useDragControls } from 'motion/react'
import {
  ArrowLeft,
  Check,
  Dice5,
  Palette,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react'
import { motion } from '@/lib/motion'
import { normalizeHexColor, type AppearanceCustomColorScheme } from '@/lib/theme/appearance.shared'

interface Props {
  primaryColor: string
  secondaryColor: string
  intensity: number
  colorScheme: AppearanceCustomColorScheme
  initialPrimaryColor: string
  initialSecondaryColor: string
  initialIntensity: number
  initialColorScheme: AppearanceCustomColorScheme
  onPrimaryColorChange: (value: string) => void
  onSecondaryColorChange: (value: string) => void
  onIntensityChange: (value: number) => void
  onColorSchemeChange: (value: AppearanceCustomColorScheme) => void
  onBack: () => void
  onApply: () => void
}

export function UserSettingsThemeCustomizerPanel({
  primaryColor,
  secondaryColor,
  intensity,
  colorScheme,
  initialPrimaryColor,
  initialSecondaryColor,
  initialIntensity,
  initialColorScheme,
  onPrimaryColorChange,
  onSecondaryColorChange,
  onIntensityChange,
  onColorSchemeChange,
  onBack,
  onApply,
}: Props) {
  const [primaryInput, setPrimaryInput] = useState(primaryColor.toUpperCase())
  const [secondaryInput, setSecondaryInput] = useState(secondaryColor.toUpperCase())
  const dragControls = useDragControls()

  useEffect(() => {
    setPrimaryInput(primaryColor.toUpperCase())
  }, [primaryColor])

  useEffect(() => {
    setSecondaryInput(secondaryColor.toUpperCase())
  }, [secondaryColor])

  const hasChanges = useMemo(
    () =>
      normalizeHexColor(primaryColor) !== normalizeHexColor(initialPrimaryColor)
      || normalizeHexColor(secondaryColor) !== normalizeHexColor(initialSecondaryColor)
      || intensity !== initialIntensity
      || colorScheme !== initialColorScheme,
    [initialColorScheme, initialIntensity, initialPrimaryColor, initialSecondaryColor, intensity, primaryColor, secondaryColor, colorScheme]
  )

  const applyHexDraft = (
    rawValue: string,
    fallback: string,
    setter: (value: string) => void,
    inputSetter: (value: string) => void
  ) => {
    const normalized = normalizeHexColor(rawValue, fallback).toUpperCase()
    setter(normalized)
    inputSetter(normalized)
  }

  const handleHexInputChange = (
    rawValue: string,
    inputSetter: (value: string) => void,
    setter: (value: string) => void,
    fallback: string
  ) => {
    const nextValue = rawValue.startsWith('#') ? rawValue.toUpperCase() : `#${rawValue.toUpperCase()}`
    if (!/^#[0-9A-F]{0,6}$/.test(nextValue)) return

    inputSetter(nextValue)
    if (nextValue.length === 7) {
      setter(nextValue)
    } else if (nextValue.length === 4) {
      setter(normalizeHexColor(nextValue, fallback).toUpperCase())
    }
  }

  const handleShuffle = () => {
    const [nextPrimary, nextSecondary] = generateRandomThemePair()
    onPrimaryColorChange(nextPrimary)
    onSecondaryColorChange(nextSecondary)
    onIntensityChange(55 + Math.round(Math.random() * 35))
  }

  const handleReset = () => {
    onPrimaryColorChange(normalizeHexColor(initialPrimaryColor).toUpperCase())
    onSecondaryColorChange(normalizeHexColor(initialSecondaryColor).toUpperCase())
    onIntensityChange(initialIntensity)
    onColorSchemeChange(initialColorScheme)
  }

  return (
    <motion.aside
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      className="flex h-full min-h-[720px] flex-col overflow-hidden rounded-3xl border border-[var(--b1)] bg-[var(--s2)] shadow-[var(--shadow-xl)]"
    >
      <div className="flex items-center gap-3 border-b border-[var(--b1)] px-5 py-4">
        <div
          className="flex min-w-0 flex-1 cursor-grab items-center gap-3 active:cursor-grabbing"
          onPointerDown={(event) => dragControls.start(event)}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--ember-dim)] text-[var(--ember)]">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-700 text-[var(--t0)]">Personaliza tu tema</p>
            <p className="text-sm text-[var(--t3)]">Prueba colores en tiempo real antes de aplicarlos.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-[var(--t3)] transition-colors hover:bg-[var(--surface-soft-hover)] hover:text-[var(--t0)]"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
      </div>

      <div className="scrollable flex-1 px-5 py-5">
        <section className="rounded-2xl border border-[var(--b1)] bg-[var(--s1)] p-4">
          <div className="flex items-center gap-2 text-sm font-700 text-[var(--t2)]">
            <Palette size={15} />
            Colores
          </div>
          <div
            className="mt-4 h-28 rounded-2xl border border-[var(--b1)]"
            style={{ background: `linear-gradient(145deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
          />
          <p className="mt-3 font-mono text-xs leading-5 text-[var(--t2)]">
            {`background: linear-gradient(145deg, ${primaryColor} 0%, ${secondaryColor} 100%);`}
          </p>

          <div className="mt-4 space-y-4">
            <ColorField
              label="Color 1"
              color={primaryColor}
              inputValue={primaryInput}
              onInputChange={(value) => handleHexInputChange(value, setPrimaryInput, onPrimaryColorChange, initialPrimaryColor)}
              onInputBlur={() => applyHexDraft(primaryInput, initialPrimaryColor, onPrimaryColorChange, setPrimaryInput)}
              onColorChange={(value) => onPrimaryColorChange(value.toUpperCase())}
            />
            <ColorField
              label="Color 2"
              color={secondaryColor}
              inputValue={secondaryInput}
              onInputChange={(value) => handleHexInputChange(value, setSecondaryInput, onSecondaryColorChange, initialSecondaryColor)}
              onInputBlur={() => applyHexDraft(secondaryInput, initialSecondaryColor, onSecondaryColorChange, setSecondaryInput)}
              onColorChange={(value) => onSecondaryColorChange(value.toUpperCase())}
            />
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[var(--b1)] bg-[var(--s1)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-700 text-[var(--t0)]">Base del tema</p>
              <p className="mt-1 text-sm text-[var(--t3)]">Elige si tus colores deben vivir sobre superficies claras u oscuras.</p>
            </div>
            <div className="inline-flex rounded-xl bg-[var(--s0)] p-1">
              <button
                type="button"
                onClick={() => onColorSchemeChange('claro')}
                className={`rounded-lg px-3 py-2 text-xs font-700 transition-colors ${
                  colorScheme === 'claro' ? 'bg-[var(--ember)] text-[var(--ember-contrast)]' : 'text-[var(--t3)] hover:bg-[var(--surface-soft)]'
                }`}
              >
                Clara
              </button>
              <button
                type="button"
                onClick={() => onColorSchemeChange('oscuro')}
                className={`rounded-lg px-3 py-2 text-xs font-700 transition-colors ${
                  colorScheme === 'oscuro' ? 'bg-[var(--ember)] text-[var(--ember-contrast)]' : 'text-[var(--t3)] hover:bg-[var(--surface-soft)]'
                }`}
              >
                Oscura
              </button>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[var(--b1)] bg-[var(--s1)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-700 text-[var(--t0)]">Intensidad de color</p>
              <p className="mt-1 text-sm text-[var(--t3)]">Define cuanta presencia tienen tus colores en paneles y superficies.</p>
            </div>
            <div className="rounded-xl border border-[var(--b1)] bg-[var(--s0)] px-3 py-2 font-mono text-sm text-[var(--t1)]">
              {intensity}%
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={intensity}
            onChange={(event) => onIntensityChange(Number(event.target.value))}
            className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--s0)] accent-[var(--ember)]"
          />
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleShuffle}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--b1)] bg-[var(--s1)] px-4 py-3 text-sm font-700 text-[var(--t1)] transition-colors hover:bg-[var(--surface-soft)]"
          >
            <Dice5 size={16} />
            Sorprendeme
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={!hasChanges}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--b1)] bg-[var(--s1)] px-4 py-3 text-sm font-700 text-[var(--t1)] transition-colors hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw size={16} />
            Reiniciar
          </button>
        </section>
      </div>

      <div className="flex items-center gap-3 border-t border-[var(--b1)] px-5 py-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-2xl border border-[var(--b1)] bg-[var(--s1)] px-4 py-3 text-sm font-700 text-[var(--t1)] transition-colors hover:bg-[var(--surface-soft)]"
        >
          <ArrowLeft size={16} />
          Atras
        </button>
        <button
          type="button"
          onClick={onApply}
          className="ml-auto inline-flex items-center gap-2 rounded-2xl bg-[var(--ember)] px-5 py-3 text-sm font-700 text-[var(--ember-contrast)] transition-opacity hover:opacity-90"
        >
          <Check size={16} />
          Aplicar
        </button>
      </div>
    </motion.aside>
  )
}

function ColorField({
  label,
  color,
  inputValue,
  onInputChange,
  onInputBlur,
  onColorChange,
}: {
  label: string
  color: string
  inputValue: string
  onInputChange: (value: string) => void
  onInputBlur: () => void
  onColorChange: (value: string) => void
}) {
  return (
    <div className="rounded-2xl border border-[var(--b1)] bg-[var(--s0)] p-3">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl border border-[var(--b1)]" style={{ backgroundColor: color }} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-700 text-[var(--t0)]">{label}</p>
          <p className="text-xs text-[var(--t3)]">Hexadecimal editable y selector visual</p>
        </div>
        <input
          type="color"
          value={color}
          onChange={(event) => onColorChange(event.target.value.toUpperCase())}
          className="h-11 w-14 cursor-pointer rounded-xl border border-[var(--b1)] bg-transparent p-1"
        />
      </div>
      <input
        type="text"
        maxLength={7}
        value={inputValue}
        onChange={(event) => onInputChange(event.target.value)}
        onBlur={onInputBlur}
        placeholder="#5865F2"
        className="mt-3 h-11 w-full rounded-xl border border-[var(--b1)] bg-[var(--s1)] px-3 font-mono text-sm text-[var(--t1)] outline-none transition-colors focus:border-[var(--ember)]"
      />
    </div>
  )
}

function generateRandomThemePair(): [string, string] {
  const palettes: Array<[string, string]> = [
    ['#5865F2', '#FF6835'],
    ['#00C2FF', '#7C6BFF'],
    ['#22C55E', '#14B8A6'],
    ['#F97316', '#EF4444'],
    ['#E879F9', '#6366F1'],
    ['#FACC15', '#FB7185'],
    ['#38BDF8', '#34D399'],
  ]

  return palettes[Math.floor(Math.random() * palettes.length)] ?? ['#5865F2', '#FF6835']
}
