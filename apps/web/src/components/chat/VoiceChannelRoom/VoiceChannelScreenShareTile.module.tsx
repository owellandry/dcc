'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Maximize2, Minimize2, MonitorUp, Radio } from 'lucide-react'
import { cn } from '@/lib/cn'
import { type VoiceChannelScreenShareTile } from './VoiceChannelRoom.shared'

interface Props {
  tile: VoiceChannelScreenShareTile
}

export function VoiceChannelScreenShareTileCard({ tile }: Props) {
  const articleRef = useRef<HTMLElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isFallbackExpanded, setIsFallbackExpanded] = useState(false)

  useEffect(() => {
    const element = videoRef.current
    if (!element) return
    let isDisposed = false

    // Render the remote screen with a video-only stream so autoplay rules
    // and duplicated audio tracks do not blank the element for viewers.
    const syncPlaybackStream = () => {
      if (isDisposed) return

      const videoTracks = tile.stream.getVideoTracks()
      if (videoTracks.length === 0) return

      const playbackStream = new MediaStream(videoTracks)
      if (element.srcObject !== playbackStream) {
        element.srcObject = playbackStream
      }

      element.muted = true
      void element.play().catch(() => undefined)
    }

    const handleLoadedMetadata = () => {
      void element.play().catch(() => undefined)
    }

    const videoTracks = tile.stream.getVideoTracks()
    videoTracks.forEach((track) => {
      track.onunmute = () => {
        syncPlaybackStream()
      }
    })

    tile.stream.addEventListener('addtrack', syncPlaybackStream)
    element.addEventListener('loadedmetadata', handleLoadedMetadata)

    syncPlaybackStream()

    return () => {
      isDisposed = true
      tile.stream.removeEventListener('addtrack', syncPlaybackStream)
      element.removeEventListener('loadedmetadata', handleLoadedMetadata)
      videoTracks.forEach((track) => {
        track.onunmute = null
      })
      element.pause()
      element.srcObject = null
    }
  }, [tile.stream])

  useEffect(() => {
    const handleFullscreenChange = () => {
      const article = articleRef.current
      const activeElement = typeof document === 'undefined' ? null : document.fullscreenElement
      setIsFullscreen(Boolean(article && activeElement === article))
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const enterExpandedView = useCallback(async () => {
    const article = articleRef.current
    if (!article) return

    if (typeof article.requestFullscreen === 'function') {
      try {
        await article.requestFullscreen()
        return
      } catch {
        // Fallback to in-app expanded mode if the browser blocks fullscreen.
      }
    }

    setIsFallbackExpanded(true)
  }, [])

  const exitExpandedView = useCallback(async () => {
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      try {
        await document.exitFullscreen()
        return
      } catch {
        // If exitFullscreen fails we still collapse the local fallback state below.
      }
    }

    setIsFallbackExpanded(false)
  }, [])

  const toggleExpandedView = useCallback(async () => {
    if (isFullscreen || isFallbackExpanded) {
      await exitExpandedView()
      return
    }

    await enterExpandedView()
  }, [enterExpandedView, exitExpandedView, isFallbackExpanded, isFullscreen])

  const isExpanded = isFullscreen || isFallbackExpanded

  return (
    <article
      ref={articleRef}
      onDoubleClick={() => {
        void toggleExpandedView()
      }}
      className={cn(
        'relative overflow-hidden rounded-[28px] border border-[var(--b1)] bg-[#090c14] shadow-[0_24px_70px_rgba(0,0,0,0.28)] transition-all',
        isExpanded
          ? 'fixed inset-0 z-[170] rounded-none border-0 bg-black shadow-none'
          : 'cursor-zoom-in'
      )}
    >
      <div
        className={cn(
          'relative aspect-video w-full bg-[radial-gradient(circle_at_top,rgba(255,145,96,0.2),transparent_32%),linear-gradient(180deg,#111827,#090c14)]',
          isExpanded ? 'h-screen min-h-screen' : 'min-h-[240px]'
        )}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-contain"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,8,15,0.02),rgba(5,8,15,0.76))]" />

        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[11px] font-700 uppercase tracking-[0.12em] text-white/90 backdrop-blur-sm">
          <Radio size={12} className="text-[#ff9156]" />
          {tile.isLocal ? 'Tu preview' : 'En vivo'}
        </div>

        <button
          type="button"
          onClick={() => {
            void toggleExpandedView()
          }}
          className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-2 text-xs font-700 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/60"
          aria-label={isExpanded ? `Salir de pantalla completa para ${tile.label}` : `Poner en pantalla completa ${tile.label}`}
        >
          {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          <span className="hidden sm:inline">{isExpanded ? 'Enchiquecer' : 'Agrandar'}</span>
        </button>

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="truncate font-display text-[22px] font-700 text-white">{tile.label}</p>
            <p className="mt-1 truncate text-sm text-white/70">{tile.subtitle}</p>
            <p className="mt-2 text-[11px] font-600 uppercase tracking-[0.12em] text-white/45">
              Doble clic para {isExpanded ? 'salir' : 'agrandar'}
            </p>
          </div>

          <div className="hidden shrink-0 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-2 text-xs font-600 text-white/80 backdrop-blur-sm sm:inline-flex">
            <MonitorUp size={14} />
            Pantalla
          </div>
        </div>
      </div>
    </article>
  )
}
