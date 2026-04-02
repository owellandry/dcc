import type { User } from '@/lib/types'

export type DMSidebarProps = Record<string, never>

export interface DMSidebarItem {
  user: User
  active: boolean
  isLoading: boolean
  unreadCount: number
  mentionCount: number
}

export interface DMSidebarVisualProps {
  pathname: string
  badgeCount: number
  unreadBadgeCount: number
  items: DMSidebarItem[]
  onOpenDm: (user: User) => void
}
