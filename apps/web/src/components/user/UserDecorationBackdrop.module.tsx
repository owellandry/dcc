'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { resolveMediaUrl } from '@/lib/api'
import { cn } from '@/lib/cn'
import { useCachedRemoteGifUrl } from '@/lib/media/remoteGifCache.shared'
import { useAppearanceStore } from '@/stores/appearanceStore'

export type UserDecorationTone = 'light' | 'dark'

export interface UserDecorationPresentation {
  resolvedSrc: string | undefined
  tone: UserDecorationTone
  atmosphereStyle: CSSProperties
  scrimStyle: CSSProperties
  borderStyle: CSSProperties
}

interface UserDecorationBackdropProps {
  src?: string | null
  className?: string | undefined
  imageClassName?: string | undefined
  presentation?: UserDecorationPresentation | undefined
}

const toneCache = new Map<string, UserDecorationTone>()
const tonePromiseCache = new Map<string, Promise<UserDecorationTone>>()

function analyzeDecorationTone(src: string): Promise<UserDecorationTone> {
  const cachedTone = toneCache.get(src)
  if (cachedTone) return Promise.resolve(cachedTone)

  const pendingTone = tonePromiseCache.get(src)
  if (pendingTone) return pendingTone

  const tonePromise = new Promise<UserDecorationTone>((resolve) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.decoding = 'async'
    image.src = src

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const width = Math.max(24, Math.min(64, image.naturalWidth || 48))
        const height = Math.max(16, Math.min(40, image.naturalHeight || 24))
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) {
          toneCache.set(src, 'light')
          resolve('light')
          return
        }

        context.drawImage(image, 0, 0, width, height)
        const { data } = context.getImageData(0, 0, width, height)

        let weightedLuminance = 0
        let totalWeight = 0

        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            const index = (y * width + x) * 4
            const alpha = (data[index + 3] ?? 0) / 255
            if (alpha < 0.08) continue

            const red = data[index] ?? 0
            const green = data[index + 1] ?? 0
            const blue = data[index + 2] ?? 0
            const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255
            const leftBias = x < width * 0.42 ? 1.65 : x < width * 0.68 ? 1.2 : 0.9
            const verticalBias = y > height * 0.18 && y < height * 0.82 ? 1.1 : 0.95
            const weight = alpha * leftBias * verticalBias

            weightedLuminance += luminance * weight
            totalWeight += weight
          }
        }

        const averageLuminance = totalWeight > 0 ? weightedLuminance / totalWeight : 0.35
        const nextTone: UserDecorationTone = averageLuminance >= 0.58 ? 'dark' : 'light'
        toneCache.set(src, nextTone)
        resolve(nextTone)
      } catch {
        toneCache.set(src, 'light')
        resolve('light')
      }
    }

    image.onerror = () => {
      toneCache.set(src, 'light')
      resolve('light')
    }
  }).finally(() => {
    tonePromiseCache.delete(src)
  })

  tonePromiseCache.set(src, tonePromise)
  return tonePromise
}

export function useUserDecorationPresentation(
  src?: string | null
): UserDecorationPresentation | null {
  const customColorScheme = useAppearanceStore((state) => state.customColorScheme)
  const baseResolvedSrc = resolveMediaUrl(src)
  const resolvedSrc = useCachedRemoteGifUrl(baseResolvedSrc) ?? baseResolvedSrc
  const fallbackTone: UserDecorationTone = customColorScheme === 'oscuro' ? 'light' : 'dark'
  const [tone, setTone] = useState<UserDecorationTone>(() => {
    if (!resolvedSrc) return fallbackTone
    return toneCache.get(resolvedSrc) ?? fallbackTone
  })

  useEffect(() => {
    if (!resolvedSrc) {
      setTone(fallbackTone)
      return
    }

    const cachedTone = toneCache.get(resolvedSrc)
    if (cachedTone) {
      setTone(cachedTone)
      return
    }

    let cancelled = false

    void analyzeDecorationTone(resolvedSrc).then((nextTone) => {
      if (cancelled) return
      setTone(nextTone)
    })

    return () => {
      cancelled = true
    }
  }, [fallbackTone, resolvedSrc])

  return useMemo(() => {
    if (!resolvedSrc) return null

    const isLightText = tone === 'light'
    const isDarkMode = customColorScheme === 'oscuro'

    return {
      resolvedSrc,
      tone,
      atmosphereStyle: {
        background: isLightText
          ? `linear-gradient(90deg, ${
              isDarkMode ? 'rgba(72, 104, 190, 0.12)' : 'rgba(72, 104, 190, 0.08)'
            } 0%, ${isDarkMode ? 'rgba(72, 104, 190, 0.22)' : 'rgba(72, 104, 190, 0.14)'} 100%)`
          : `linear-gradient(90deg, ${
              isDarkMode ? 'rgba(120, 164, 255, 0.12)' : 'rgba(120, 164, 255, 0.08)'
            } 0%, ${isDarkMode ? 'rgba(120, 164, 255, 0.3)' : 'rgba(120, 164, 255, 0.18)'} 100%)`,
      },
      scrimStyle: {
        background: isLightText
          ? `linear-gradient(90deg, ${
              isDarkMode ? 'rgba(8, 12, 20, 0.84)' : 'rgba(24, 30, 44, 0.74)'
            } 0%, ${
              isDarkMode ? 'rgba(10, 16, 28, 0.58)' : 'rgba(24, 30, 44, 0.46)'
            } 38%, rgba(10, 16, 28, 0.08) 100%)`
          : `linear-gradient(90deg, ${
              isDarkMode ? 'rgba(246, 249, 255, 0.94)' : 'rgba(250, 251, 255, 0.86)'
            } 0%, ${
              isDarkMode ? 'rgba(231, 238, 255, 0.74)' : 'rgba(235, 241, 255, 0.62)'
            } 38%, rgba(214, 226, 255, 0.12) 100%)`,
      },
      borderStyle: {
        borderColor: isLightText ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.18)',
      },
    }
  }, [customColorScheme, resolvedSrc, tone])
}

export function getUserDecorationToneColors(tone: UserDecorationTone) {
  if (tone === 'dark') {
    return {
      title: '#162033',
      titleHover: '#0f1728',
      subtitle: '#4b5b7a',
      subtitleStrong: '#33415c',
    }
  }

  return {
    title: '#f8fbff',
    titleHover: '#ffffff',
    subtitle: 'rgba(237, 244, 255, 0.82)',
    subtitleStrong: 'rgba(248, 251, 255, 0.92)',
  }
}

export function UserDecorationBackdrop({
  src,
  className,
  imageClassName,
  presentation,
}: UserDecorationBackdropProps) {
  const computedPresentation = useUserDecorationPresentation(src)
  const activePresentation = presentation ?? computedPresentation
  if (!activePresentation?.resolvedSrc) return null

  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]',
        className
      )}
    >
      <span className="absolute inset-0" style={activePresentation.atmosphereStyle} />
      <img
        src={activePresentation.resolvedSrc}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className={cn(
          'absolute inset-0 h-full w-full object-cover object-right opacity-95',
          imageClassName
        )}
      />
      <span className="absolute inset-0" style={activePresentation.scrimStyle} />
      <span
        className="absolute inset-0 rounded-[inherit] border"
        style={activePresentation.borderStyle}
      />
    </div>
  )
}
