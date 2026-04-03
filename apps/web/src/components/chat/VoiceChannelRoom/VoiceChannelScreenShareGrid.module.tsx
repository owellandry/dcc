'use client'

import { MonitorUp } from 'lucide-react'
import { cn } from '@/lib/cn'
import { type VoiceChannelScreenShareTile } from './VoiceChannelRoom.shared'
import { VoiceChannelScreenShareTileCard } from './VoiceChannelScreenShareTile.module'

interface Props {
  tiles: VoiceChannelScreenShareTile[]
}

export function VoiceChannelScreenShareGrid({ tiles }: Props) {
  if (tiles.length === 0) return null

  return (
    <section className="mb-8 w-full max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-700 uppercase tracking-[0.18em] text-[var(--ember)]">
            Screen share
          </p>
          <h2 className="mt-1 font-display text-[28px] font-700 tracking-[-0.04em] text-white">
            Pantallas compartidas
          </h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--b1)] bg-[var(--surface-soft)] px-3 py-2 text-[13px] font-600 text-[var(--t2)]">
          <MonitorUp size={15} className="text-[var(--ember)]" />
          {tiles.length} en vivo
        </div>
      </div>

      <div className={cn('grid gap-4', tiles.length > 1 && 'xl:grid-cols-2')}>
        {tiles.map((tile) => (
          <VoiceChannelScreenShareTileCard key={tile.userId} tile={tile} />
        ))}
      </div>
    </section>
  )
}
