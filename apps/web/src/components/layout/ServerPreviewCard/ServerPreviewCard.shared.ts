import type { RefObject } from 'react'
import type { Server } from '@/lib/types'

export interface ServerPreviewCardProps {
  server: Server
  x: number
  y: number
  containerRef: RefObject<HTMLDivElement | null>
}

export interface ServerPreviewCardVisualProps {
  server: Server
  x: number
  y: number
  containerRef: RefObject<HTMLDivElement | null>
  copied: boolean
  initials: string
  bannerBackground: string
  inviteUrl: string
  category: string
  isPartner: boolean
  categoryKind: 'gaming' | 'design' | 'tech'
  onCopyInvite: () => void
}
