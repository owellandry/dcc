'use client'

import { memo, useEffect, useState } from 'react'
import type { UserStatus } from '@/lib/types'
import { cn } from '@/lib/cn'
import { useCachedRemoteGifUrl } from '@/lib/media/remoteGifCache.shared'

interface UserAvatarImageProps {
  src: string
  alt: string
  status: UserStatus
}

const gifStillFrameCache = new Map<string, string>()
const gifStillFramePromiseCache = new Map<string, Promise<string>>()

function isGifAvatar(src: string) {
  return /\.gif($|\?)/i.test(src)
}

function resolveGifStillFrame(src: string): Promise<string> {
  const cachedFrame = gifStillFrameCache.get(src)
  if (cachedFrame) {
    return Promise.resolve(cachedFrame)
  }

  const pendingFrame = gifStillFramePromiseCache.get(src)
  if (pendingFrame) {
    return pendingFrame
  }

  const framePromise = new Promise<string>((resolve) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.decoding = 'async'
    image.src = src
    image.onload = () => {
      const canvas = document.createElement('canvas')
      const width = image.naturalWidth || 1
      const height = image.naturalHeight || 1
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) {
        gifStillFrameCache.set(src, src)
        resolve(src)
        return
      }

      context.drawImage(image, 0, 0, width, height)

      try {
        const stillFrame = canvas.toDataURL('image/png')
        gifStillFrameCache.set(src, stillFrame)
        resolve(stillFrame)
      } catch {
        gifStillFrameCache.set(src, src)
        resolve(src)
      }
    }

    image.onerror = () => {
      gifStillFrameCache.set(src, src)
      resolve(src)
    }
  }).finally(() => {
    gifStillFramePromiseCache.delete(src)
  })

  gifStillFramePromiseCache.set(src, framePromise)
  return framePromise
}

export const UserAvatarImage = memo(function UserAvatarImage({ src, alt, status }: UserAvatarImageProps) {
  const cachedSrc = useCachedRemoteGifUrl(src) ?? src
  const isGif = isGifAvatar(cachedSrc)
  const [isHovered, setIsHovered] = useState(false)
  const [stillSrc, setStillSrc] = useState<string | null>(() => (isGif ? gifStillFrameCache.get(cachedSrc) ?? null : null))

  useEffect(() => {
    if (!isGif) {
      setStillSrc(null)
      return
    }

    const cachedFrame = gifStillFrameCache.get(cachedSrc)
    if (cachedFrame) {
      setStillSrc(cachedFrame)
      return
    }

    let cancelled = false

    void resolveGifStillFrame(cachedSrc).then((nextStillSrc) => {
      if (cancelled) return
      setStillSrc(nextStillSrc)
    })

    return () => {
      cancelled = true
    }
  }, [cachedSrc, isGif])

  const isActive = isHovered
  const resolvedSrc = isGif && !isActive ? (stillSrc ?? cachedSrc) : cachedSrc

  if (isGif && !isActive && stillSrc === null) {
    return (
      <span
        className={cn('block h-full w-full rounded-full bg-[var(--surface-soft)] transition-[filter] duration-300', status === 'offline' && 'grayscale')}
      />
    )
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={cn('h-full w-full rounded-full object-cover transition-[filter] duration-300', status === 'offline' && 'grayscale')}
    />
  )
}, areEqualAvatarImageProps)

function areEqualAvatarImageProps(previousProps: UserAvatarImageProps, nextProps: UserAvatarImageProps) {
  return (
    previousProps.src === nextProps.src &&
    previousProps.alt === nextProps.alt &&
    previousProps.status === nextProps.status
  )
}
