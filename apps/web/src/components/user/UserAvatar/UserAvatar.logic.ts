'use client'

import { resolveMediaUrl } from '@/lib/api'
import { getUserDisplayName } from '@/lib/users/displayName.shared'
import { usePresenceStore } from '@/stores/presenceStore'
import { avatarColor, type UserAvatarProps, type UserAvatarVisualProps } from './UserAvatar.shared'

export function useUserAvatarModel({
  user,
  size = 40,
  showStatus = false,
  className,
}: UserAvatarProps): UserAvatarVisualProps {
  const status = usePresenceStore((state) => state.presence[user.id]?.status ?? user.status ?? 'offline')
  const displayName = getUserDisplayName(user)
  const initialsSource = displayName.replace(/\s+/g, ' ').trim()
  const initials = initialsSource
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
    || user.username.slice(0, 2).toUpperCase()

  return {
    username: displayName,
    avatarUrl: resolveMediaUrl(user.avatarUrl),
    initials,
    status,
    size,
    showStatus,
    className,
    backgroundColor: avatarColor(user.username),
    boxShadow: 'none',
  }
}
