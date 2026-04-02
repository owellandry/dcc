'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useShallow } from 'zustand/react/shallow'
import { dmsApi, friendsApi } from '@/lib/api'
import { getUserDisplayName } from '@/lib/users/displayName.shared'
import { isMockSession } from '@/lib/mock-init'
import { MOCK_FRIENDS } from '@/lib/mock-data'
import { useServersStore } from '@/stores/serversStore'
import type { Channel, Friendship, User } from '@/lib/types'
import { type DMSidebarItem, type DMSidebarVisualProps } from './DMSidebar.shared'

const MOCK_DM_USERS: User[] = MOCK_FRIENDS
  .filter((friendship) => friendship.status === 'accepted')
  .map((friendship) => friendship.user)

const MOCK_PENDING_COUNT = MOCK_FRIENDS.filter((friendship) => friendship.status === 'pending').length

export function useDMSidebarModel(): DMSidebarVisualProps {
  const pathname = usePathname()
  const router = useRouter()
  const upsertChannel = useServersStore((state) => state.upsertChannel)
  const dmChannels = useServersStore(
    useShallow((state) =>
      Object.values(state.channels).filter(
        (channel) => channel.serverId == null && (channel.type === 'dm' || channel.type === 'group_dm')
      )
    )
  )
  const [friends, setFriends] = useState<User[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [openingUserId, setOpeningUserId] = useState<string | null>(null)
  const isMock = isMockSession()

  useEffect(() => {
    if (isMock) return

    let cancelled = false

    ;(async () => {
      try {
        const [friendsResponse, dmsResponse] = await Promise.all([friendsApi.list(), dmsApi.list()])
        if (cancelled) return

        const acceptedFriends = friendsResponse.data
          .filter((friendship: Friendship) => friendship.status === 'accepted')
          .map((friendship: Friendship) => friendship.user)

        setFriends(acceptedFriends)
        setPendingCount(
          friendsResponse.data.filter((friendship: Friendship) => friendship.status === 'pending').length
        )

        dmsResponse.data.forEach((channel) => {
          upsertChannel(withDerivedDmName(channel))
        })
      } catch (error) {
        console.error('Failed to load direct messages', error)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isMock, upsertChannel])

  const currentChannelId = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean)
    if (parts[0] !== 'channels' || parts[1] !== '@me') return null
    return parts[2] ?? null
  }, [pathname])

  const dmUsers = isMock ? MOCK_DM_USERS : friends
  const badgeCount = isMock ? MOCK_PENDING_COUNT : pendingCount

  const items = useMemo<DMSidebarItem[]>(() => {
    return dmUsers.map((user) => {
      const existingChannel = dmChannels.find((channel) =>
        channel.participants?.some((participant) => participant.id === user.id)
      )

      return {
        user,
        active: isMock ? pathname.includes(user.id) : currentChannelId === existingChannel?.id,
        isLoading: openingUserId === user.id,
      }
    })
  }, [currentChannelId, dmChannels, dmUsers, isMock, openingUserId, pathname])

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
