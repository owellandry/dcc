'use client'

import { useAuthStore } from '@/stores/authStore'
import { usePresenceStore } from '@/stores/presenceStore'
import { useServersStore } from '@/stores/serversStore'
import { type ChatHeaderProps, type ChatHeaderVisualProps } from './ChatHeader.shared'

export function useChatHeaderModel({
  channelId,
  isMemberListOpen,
  onToggleMemberList,
}: ChatHeaderProps): ChatHeaderVisualProps {
  const myUserId = useAuthStore((state) => state.user?.id ?? null)
  const channel = useServersStore((state) => state.channels[channelId])
  const dmUser = channel?.type === 'dm' || channel?.type === 'group_dm'
    ? channel.participants?.find((participant) => participant.id !== myUserId) ?? channel.participants?.[0] ?? null
    : null
  const dmStatus = usePresenceStore((state) =>
    dmUser ? state.presence[dmUser.id]?.status ?? dmUser.status ?? 'offline' : 'offline'
  )

  if (channel?.type === 'dm' || channel?.type === 'group_dm') {
    const dmTitle = dmUser?.username ?? channel?.name ?? 'direct-message'
    const dmDiscriminator = dmUser?.discriminator != null ? `#${String(dmUser.discriminator).padStart(4, '0')}` : ''

    return {
      kind: 'dm',
      channelName: dmTitle,
      dmUser,
      dmStatus,
      dmSearchPlaceholder: `Buscar ${dmTitle}${dmDiscriminator}`,
    }
  }

  return {
    kind: 'channel',
    channelName: channel?.name ?? '...',
    ...(channel?.topic != null ? { topic: channel.topic } : {}),
    ...(channel?.iconKey !== undefined ? { iconKey: channel.iconKey } : {}),
    ...(channel?.fontKey !== undefined ? { fontKey: channel.fontKey } : {}),
    ...(channel?.fontWeight !== undefined ? { fontWeight: channel.fontWeight } : {}),
    ...(channel?.type === 'voice' || channel?.type === 'text' || channel?.type === 'announcement'
      ? { channelType: channel.type }
      : {}),
    ...(isMemberListOpen !== undefined ? { isMemberListOpen } : {}),
    ...(onToggleMemberList !== undefined ? { onToggleMemberList } : {}),
  }
}
