import type { User } from '@/lib/types'

export interface DMQuickAccessItem {
  id: string
  href: string
  user: User
}

export interface DMFriendCard {
  id: string
  href: string
  user: User
  subtitle: string
}

export interface DMPendingFriendCard {
  id: string
  user: User
  subtitle: string
}

export interface DMServerCard {
  id: string
  href: string
  name: string
  memberCount: number
  initials: string
}

export interface DMHomeViewModel {
  greeting: string
  username: string
  heroSubtitle: string
  quickAccessItems: DMQuickAccessItem[]
  quickAccessOverflow: number
  friendCards: DMFriendCard[]
  pendingFriendCards: DMPendingFriendCard[]
  serverCards: DMServerCard[]
  showQuickAccess: boolean
  showFriendsSection: boolean
  showPendingSection: boolean
  showServersSection: boolean
  showEmptyState: boolean
}

export interface DMHomeViewVisualProps {
  model: DMHomeViewModel
}
