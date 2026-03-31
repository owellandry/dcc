'use client'

import { cn } from '@/lib/cn'
import { type UserAvatarVisualProps } from './UserAvatar.shared'
import { UserAvatarImage } from './UserAvatarImage.module'

export function UserAvatarVisual({
  username,
  avatarUrl,
  initials,
  status,
  size,
  showStatus,
  className,
  backgroundColor,
  boxShadow,
}: UserAvatarVisualProps) {
  return (
    <div
      className={cn('relative shrink-0 rounded-full transition-shadow duration-300', className)}
      style={{
        width: size,
        height: size,
        ...(boxShadow === 'none' ? {} : { boxShadow }),
      }}
    >
      <div
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-full"
        style={{
          ...(avatarUrl ? {} : { background: backgroundColor }),
        }}
      >
        {avatarUrl ? (
          <UserAvatarImage src={avatarUrl} alt={username} status={status} />
        ) : (
          <span
            className="font-display font-700 text-white"
            style={{ fontSize: Math.max(10, size * 0.36) }}
          >
            {initials}
          </span>
        )}
      </div>
    </div>
  )
}
