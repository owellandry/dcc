import type { Message } from '@/lib/types'

export interface SystemWelcomeCardProps {
  message: Message
}

export interface SystemWelcomeCardVisualProps {
  message: Message
  title: string
  joinedAt: string
  serverId: string | null
  serverName: string | null
  sideImage: string | undefined
  serverInitials: string
  welcomeChannelId: string | null
  rulesChannelId: string | null
}
