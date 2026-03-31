import { useMemo } from 'react'
import { MOCK_FRIENDS, MOCK_SERVERS } from '@/lib/mock-data'
import { useAuthStore } from '@/stores/authStore'
import type {
  DMFriendCard,
  DMHomeViewModel,
  DMPendingFriendCard,
  DMQuickAccessItem,
  DMServerCard,
} from './DMHomeView.shared'

function resolveGreeting(hour: number) {
  if (hour < 12) return 'Buenos dias'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

function toQuickAccessItems(): DMQuickAccessItem[] {
  return MOCK_FRIENDS
    .filter((friendship) => friendship.status === 'accepted')
    .slice(0, 5)
    .map(({ id, user }) => ({
      id,
      href: `/channels/@me/${user.id}`,
      user,
    }))
}

function toFriendCards(): DMFriendCard[] {
  return MOCK_FRIENDS
    .filter((friendship) => friendship.status === 'accepted')
    .map(({ id, user }) => ({
      id,
      href: `/channels/@me/${user.id}`,
      user,
      subtitle: user.customStatus ?? user.bio ?? 'Disponible',
    }))
}

function toPendingFriendCards(): DMPendingFriendCard[] {
  return MOCK_FRIENDS
    .filter((friendship) => friendship.status === 'pending')
    .map(({ id, user }) => ({
      id,
      user,
      subtitle: user.customStatus ?? 'Quiere conectar contigo',
    }))
}

function toServerCards(): DMServerCard[] {
  return MOCK_SERVERS.map((server) => ({
    id: server.id,
    href: `/channels/${server.id}`,
    name: server.name,
    memberCount: server.memberCount,
    initials: server.name.slice(0, 2).toUpperCase(),
  }))
}

export function useDMHomeViewModel(): DMHomeViewModel {
  const username = useAuthStore((state) => state.user?.username ?? 'Tu')

  return useMemo(() => {
    const friendCards = toFriendCards()
    const pendingFriendCards = toPendingFriendCards()
    const serverCards = toServerCards()
    const quickAccessItems = toQuickAccessItems()
    const quickAccessOverflow = Math.max(friendCards.length - quickAccessItems.length, 0)

    return {
      greeting: resolveGreeting(new Date().getHours()),
      username,
      heroSubtitle: friendCards.length > 0
        ? `${friendCards.length} amigos disponibles`
        : 'Comienza a conectar con tus amigos',
      quickAccessItems,
      quickAccessOverflow,
      friendCards,
      pendingFriendCards,
      serverCards,
      showQuickAccess: quickAccessItems.length > 0,
      showFriendsSection: friendCards.length > 0,
      showPendingSection: pendingFriendCards.length > 0,
      showServersSection: serverCards.length > 0,
      showEmptyState: friendCards.length === 0 && pendingFriendCards.length === 0 && serverCards.length === 0,
    }
  }, [username])
}
