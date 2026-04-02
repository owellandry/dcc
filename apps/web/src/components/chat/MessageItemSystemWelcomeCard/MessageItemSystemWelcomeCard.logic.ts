'use client'

import { format } from 'date-fns'
import { useShallow } from 'zustand/react/shallow'
import { resolveMediaUrl } from '@/lib/api'
import { getUserDisplayName } from '@/lib/users/displayName.shared'
import { useServersStore } from '@/stores/serversStore'
import { type SystemWelcomeCardProps, type SystemWelcomeCardVisualProps } from './MessageItemSystemWelcomeCard.shared'

export function useSystemWelcomeCardModel({
  message,
}: SystemWelcomeCardProps): SystemWelcomeCardVisualProps {
  const title = message.content ?? `${getUserDisplayName(message.author)} se unio al servidor. Bienvenido.`
  const joinedAt = format(new Date(message.createdAt), 'HH:mm')
  const { serverId, serverName, serverIconUrl, rulesChannelId, welcomeChannelId } = useServersStore(
    useShallow((state) => {
      const channel = state.channels[message.channelId]
      const resolvedServerId = channel?.serverId ?? null
      let resolvedRulesChannelId: string | null = null
      let resolvedWelcomeChannelId: string | null = null

      if (resolvedServerId) {
        for (const currentChannel of Object.values(state.channels)) {
          if (currentChannel.serverId !== resolvedServerId || currentChannel.type !== 'text') continue
          const normalized = (currentChannel.name ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
          if (!resolvedWelcomeChannelId && /\b(bienvenida|bienvenidas|welcome)\b/.test(normalized)) {
            resolvedWelcomeChannelId = currentChannel.id
          }
          if (!resolvedRulesChannelId && /\b(regla|reglas|rule|rules)\b/.test(normalized)) {
            resolvedRulesChannelId = currentChannel.id
          }
          if (resolvedWelcomeChannelId && resolvedRulesChannelId) break
        }
      }

      return {
        serverId: resolvedServerId,
        serverName: resolvedServerId ? state.servers[resolvedServerId]?.name ?? null : null,
        serverIconUrl: resolvedServerId ? state.servers[resolvedServerId]?.iconUrl ?? null : null,
        rulesChannelId: resolvedRulesChannelId,
        welcomeChannelId: resolvedWelcomeChannelId,
      }
    }),
  )

  const serverInitials = (serverName ?? 'Server')
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')

  const sideImage = resolveMediaUrl(serverIconUrl)

  return {
    message,
    title,
    joinedAt,
    serverId,
    serverName,
    sideImage,
    serverInitials,
    welcomeChannelId,
    rulesChannelId,
  }
}
