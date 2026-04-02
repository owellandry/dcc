'use client'

import { cn } from '@/lib/cn'
import { type UserAvatarVisualProps } from './UserAvatar.shared'
import { UserAvatarImage } from './UserAvatarImage.module'
import { STATUS_BG } from './UserAvatar.shared'

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

      {showStatus ? (
        <span
          className="absolute bottom-0 right-0 rounded-full"
          aria-hidden="true"
          style={{
            width: Math.max(10, Math.round(size * 0.3)),
            height: Math.max(10, Math.round(size * 0.3)),
            background: STATUS_BG[status],
            border: `${Math.max(2, Math.round(size * 0.08))}px solid var(--s1)`,
            boxShadow: '0 0 0 1px rgba(0,0,0,0.12)',
          }}
        />
      ) : null}
    </div>
  )
}
