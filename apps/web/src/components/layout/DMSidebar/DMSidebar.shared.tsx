import type { User } from '@/lib/types'

export type DMSidebarProps = Record<string, never>

export interface DMSidebarItem {
  user: User
  active: boolean
  isLoading: boolean
}

export interface DMSidebarVisualProps {
  pathname: string
  badgeCount: number
  items: DMSidebarItem[]
  onOpenDm: (user: User) => void
}
