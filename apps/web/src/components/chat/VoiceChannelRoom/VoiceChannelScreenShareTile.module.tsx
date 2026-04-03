'use client'

import { useEffect, useRef } from 'react'
import { MonitorUp, Radio } from 'lucide-react'
import { type VoiceChannelScreenShareTile } from './VoiceChannelRoom.shared'

interface Props {
  tile: VoiceChannelScreenShareTile
}

export function VoiceChannelScreenShareTileCard({ tile }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const element = videoRef.current
    if (!element) return

    if (element.srcObject !== tile.stream) {
      element.srcObject = tile.stream
    }

    void element.play().catch(() => undefined)

    return () => {
      if (element.srcObject === tile.stream) {
        element.srcObject = null
      }
    }
  }, [tile.stream])

  return (
    <article className="relative overflow-hidden rounded-[28px] border border-[var(--b1)] bg-[#090c14] shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
      <div className="relative aspect-video min-h-[240px] w-full bg-[radial-gradient(circle_at_top,rgba(255,145,96,0.2),transparent_32%),linear-gradient(180deg,#111827,#090c14)]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={tile.isLocal}
          className="h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,8,15,0.02),rgba(5,8,15,0.76))]" />

        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[11px] font-700 uppercase tracking-[0.12em] text-white/90 backdrop-blur-sm">
          <Radio size={12} className="text-[#ff9156]" />
          {tile.isLocal ? 'Tu preview' : 'En vivo'}
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="truncate font-display text-[22px] font-700 text-white">{tile.label}</p>
            <p className="mt-1 truncate text-sm text-white/70">{tile.subtitle}</p>
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
