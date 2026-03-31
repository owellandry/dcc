'use client'

import { resolveMediaUrl } from '@/lib/api'
import { usePresenceStore } from '@/stores/presenceStore'
import { avatarColor, type UserAvatarProps, type UserAvatarVisualProps } from './UserAvatar.shared'

export function useUserAvatarModel({
  user,
  size = 40,
  showStatus = false,
  className,
}: UserAvatarProps): UserAvatarVisualProps {
  const status = usePresenceStore((state) => state.presence[user.id]?.status ?? user.status ?? 'offline')

  return {
    username: user.username,
    avatarUrl: resolveMediaUrl(user.avatarUrl),
    initials: user.username.slice(0, 2).toUpperCase(),
    status,
    size,
    showStatus,
    className,
    backgroundColor: avatarColor(user.username),
    boxShadow: 'none',
  }
}
