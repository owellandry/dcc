'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useShallow } from 'zustand/react/shallow'
import { dmsApi, friendsApi } from '@/lib/api'
import { getUserDisplayName } from '@/lib/users/displayName.shared'
import { isMockSession } from '@/lib/mock-init'
import { MOCK_FRIENDS } from '@/lib/mock-data'
import { useFriendsStore } from '@/stores/friendsStore'
import { useServersStore } from '@/stores/serversStore'
import { useUnreadStore } from '@/stores/unreadStore/unreadStore.store'
import type { Channel, User } from '@/lib/types'
import { type DMSidebarItem, type DMSidebarVisualProps } from './DMSidebar.shared'

const MOCK_DM_USERS: User[] = MOCK_FRIENDS
  .filter((friendship) => friendship.status === 'accepted')
  .map((friendship) => friendship.user)

const MOCK_PENDING_COUNT = MOCK_FRIENDS.filter((friendship) => friendship.status === 'pending').length

export function useDMSidebarModel(): DMSidebarVisualProps {
  const pathname = usePathname()
  const router = useRouter()
  const upsertChannel = useServersStore((state) => state.upsertChannel)
  const friendships = useFriendsStore((state) => state.friendships)
  const friendshipsLoaded = useFriendsStore((state) => state.hasLoaded)
  const friendshipsLoading = useFriendsStore((state) => state.isLoading)
  const setFriendships = useFriendsStore((state) => state.setFriendships)
  const setFriendshipsLoading = useFriendsStore((state) => state.setLoading)
  const dmChannels = useServersStore(
    useShallow((state) =>
      Object.values(state.channels).filter(
        (channel) => channel.serverId == null && (channel.type === 'dm' || channel.type === 'group_dm')
      )
    )
  )
  const [openingUserId, setOpeningUserId] = useState<string | null>(null)
  const unreadByChannel = useUnreadStore((state) => state.channels)
  const isMock = isMockSession()

  useEffect(() => {
    if (isMock) {
      if (!friendshipsLoaded) setFriendships(MOCK_FRIENDS)
      return
    }

    if (friendshipsLoaded || friendshipsLoading) return

    let cancelled = false
    setFriendshipsLoading(true)

    ;(async () => {
      try {
        const [friendsResponse, dmsResponse] = await Promise.all([friendsApi.list(), dmsApi.list()])
        if (cancelled) return

        setFriendships(friendsResponse.data)

        dmsResponse.data.forEach((channel) => {
          upsertChannel(withDerivedDmName(channel))
        })
      } catch (error) {
        console.error('Failed to load direct messages', error)
        if (!cancelled) setFriendshipsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    friendshipsLoaded,
    friendshipsLoading,
    isMock,
    setFriendships,
    setFriendshipsLoading,
    upsertChannel,
  ])

  const currentChannelId = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean)
    if (parts[0] !== 'channels' || parts[1] !== '@me') return null
    return parts[2] ?? null
  }, [pathname])

  const dmUsers = useMemo(() => {
    if (isMock) return MOCK_DM_USERS

    const usersById = new Map<string, User>()
    for (const friendship of friendships.filter((friendship) => friendship.status === 'accepted')) {
      usersById.set(friendship.user.id, friendship.user)
    }
    for (const channel of dmChannels) {
      for (const participant of channel.participants ?? []) {
        usersById.set(participant.id, participant)
      }
    }
    return Array.from(usersById.values())
  }, [dmChannels, friendships, isMock])
  const badgeCount = isMock
    ? MOCK_PENDING_COUNT
    : friendships.filter((friendship) => friendship.status === 'pending').length
  const unreadBadgeCount = useMemo(
    () =>
      dmChannels.reduce((sum, channel) => {
        const unread = unreadByChannel[channel.id]
        return sum + (unread?.unreadCount ?? 0)
      }, 0),
    [dmChannels, unreadByChannel]
  )

  const items = useMemo<DMSidebarItem[]>(() => {
    return dmUsers.map((user) => {
      const existingChannel = dmChannels.find((channel) =>
        channel.participants?.some((participant) => participant.id === user.id)
      )
      const unreadState = existingChannel ? unreadByChannel[existingChannel.id] : undefined

      return {
        user,
        active: isMock ? pathname.includes(user.id) : currentChannelId === existingChannel?.id,
        isLoading: openingUserId === user.id,
        unreadCount: unreadState?.unreadCount ?? 0,
        mentionCount: unreadState?.mentionCount ?? 0,
      }
    })
  }, [currentChannelId, dmChannels, dmUsers, isMock, openingUserId, pathname, unreadByChannel])

  const openDm = async (user: User) => {
    if (isMock) {
      router.push(`/channels/@me/${user.id}`)
      return
    }

    const existingChannel = dmChannels.find((channel) =>
      channel.participants?.some((participant) => participant.id === user.id)
    )

    if (existingChannel) {
      router.push(`/channels/@me/${existingChannel.id}`)
      return
    }

    if (openingUserId === user.id) return

    try {
      setOpeningUserId(user.id)
      const response = await dmsApi.open(user.id)
      const channel = withDerivedDmName(response.data, user)
      upsertChannel(channel)
      router.push(`/channels/@me/${channel.id}`)
    } catch (error) {
      console.error('Failed to open direct message', error)
    } finally {
      setOpeningUserId((current) => (current === user.id ? null : current))
    }
  }

  return {
    pathname,
    badgeCount,
    unreadBadgeCount,
    items,
    onOpenDm: (user: User) => {
      void openDm(user)
    },
  }
}

function withDerivedDmName(channel: Channel, fallbackUser?: User): Channel {
  const primaryParticipant = channel.participants?.[0]

  return {
    ...channel,
    name: channel.name ?? (primaryParticipant ? getUserDisplayName(primaryParticipant) : null) ?? (fallbackUser ? getUserDisplayName(fallbackUser) : null) ?? 'direct-message',
  }
}
