import type { User, UserStatus } from '@/lib/types'

export interface UserAvatarProps {
  user: Pick<User, 'id' | 'username' | 'avatarUrl'> & { status?: UserStatus }
  size?: number
  showStatus?: boolean
  className?: string
}

export interface UserAvatarVisualProps {
  username: string
  avatarUrl: string | undefined
  initials: string
  status: UserStatus
  size: number
  showStatus: boolean
  className: string | undefined
  backgroundColor: string
  boxShadow: string
}

export const STATUS_BG: Record<UserStatus, string> = {
  online: 'var(--online)',
  idle: 'var(--idle)',
  dnd: 'var(--dnd)',
  offline: 'var(--offline)',
}

export function avatarColor(username: string): string {
  const colors = [
    'var(--ember)',
    'var(--ember-hover)',
    'var(--volt)',
    '#6557e8',
    'var(--online)',
    'var(--idle)',
    'var(--dnd)',
    '#4285f4',
  ]
  let hash = 0
  for (let index = 0; index < username.length; index++) {
    hash = username.charCodeAt(index) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]!
}
