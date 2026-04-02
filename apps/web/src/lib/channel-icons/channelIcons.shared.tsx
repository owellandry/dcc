'use client'

import type { ComponentType } from 'react'
import {
  Bell,
  BookOpen,
  Briefcase,
  Film,
  Flame,
  Gamepad2,
  Hash,
  Heart,
  Megaphone,
  MessageSquareQuote,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Swords,
  Volume2,
} from 'lucide-react'
import type { IconType } from 'react-icons'
import {
  RiArchiveStackLine,
  RiCalendarEventLine,
  RiCompassDiscoverLine,
  RiEmojiStickerLine,
  RiRobot2Line,
  RiTeamLine,
} from 'react-icons/ri'
import type { ChannelType } from '@/lib/types'

type ChannelIconComponent = ComponentType<{ size?: number; className?: string }>

export interface ChannelIconOption {
  key: string
  label: string
  icon: ChannelIconComponent | IconType
}

export const CHANNEL_ICON_OPTIONS: ChannelIconOption[] = [
  { key: 'hash', label: 'Texto', icon: Hash },
  { key: 'megaphone', label: 'Anuncios', icon: Megaphone },
  { key: 'shield', label: 'Normas', icon: Shield },
  { key: 'sparkles', label: 'Destacado', icon: Sparkles },
  { key: 'book', label: 'Guia', icon: BookOpen },
  { key: 'quote', label: 'Foro', icon: MessageSquareQuote },
  { key: 'rocket', label: 'Lanzamiento', icon: Rocket },
  { key: 'flame', label: 'Trending', icon: Flame },
  { key: 'film', label: 'Media', icon: Film },
  { key: 'gamepad', label: 'Gaming', icon: Gamepad2 },
  { key: 'briefcase', label: 'Trabajo', icon: Briefcase },
  { key: 'swords', label: 'Competitivo', icon: Swords },
  { key: 'heart', label: 'Comunidad', icon: Heart },
  { key: 'star', label: 'VIP', icon: Star },
  { key: 'bell', label: 'Alertas', icon: Bell },
  { key: 'robot', label: 'Bots', icon: RiRobot2Line },
  { key: 'archive', label: 'Archivo', icon: RiArchiveStackLine },
  { key: 'discover', label: 'Descubrir', icon: RiCompassDiscoverLine },
  { key: 'events', label: 'Eventos', icon: RiCalendarEventLine },
  { key: 'stickers', label: 'Stickers', icon: RiEmojiStickerLine },
  { key: 'community-hub', label: 'Hub', icon: RiTeamLine },
  { key: 'voice', label: 'Voz', icon: Volume2 },
]

export function getChannelIconComponent(iconKey: string | null | undefined, type: ChannelType) {
  const match = CHANNEL_ICON_OPTIONS.find((option) => option.key === iconKey)
  if (match) return match.icon

  if (type === 'voice') return Volume2
  return type === 'announcement' ? Megaphone : Hash
}
