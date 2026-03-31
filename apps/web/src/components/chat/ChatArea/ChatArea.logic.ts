'use client'

import { useShallow } from 'zustand/react/shallow'
import { Permissions } from '@/lib/permissions'
import { useAuthStore } from '@/stores/authStore'
import { useServersStore } from '@/stores/serversStore'
import { type ChatAreaProps, type ChatAreaVisualProps } from './ChatArea.shared'

export function useChatAreaModel({ channelId }: ChatAreaProps): ChatAreaVisualProps {
  const myUserId = useAuthStore((state) => state.user?.id ?? null)
  const { channel, isServerAdmin } = useServersStore(
    useShallow((state) => {
      const currentChannel = state.channels[channelId]
      const serverId = currentChannel?.serverId ?? null
      const ownerId = serverId ? state.servers[serverId]?.ownerId ?? null : null
      const myMembership = serverId && myUserId ? state.members[serverId]?.[myUserId] ?? null : null
      const hasAdminRole =
        myMembership?.roles.some((role) => (role.permissions & Permissions.ADMINISTRATOR) !== 0) ?? false

      return {
        channel: currentChannel,
        isServerAdmin: Boolean(myUserId && ownerId && ownerId === myUserId) || hasAdminRole,
      }
    })
  )

  return {
    channelId,
    channelName:
      channel?.type === 'dm' || channel?.type === 'group_dm'
        ? `@${channel?.name ?? 'usuario'}`
        : channel?.name ?? 'channel',
    canSendMessages: channel?.canSendMessages ?? true,
    showComposer: (channel?.canSendMessages ?? true) || isServerAdmin,
  }
}
