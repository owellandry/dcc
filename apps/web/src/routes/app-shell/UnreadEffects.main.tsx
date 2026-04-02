'use client'

import { useEffect, useMemo, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { channelsApi, readStatesApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useMessagesStore } from '@/stores/messagesStore'
import { useServersStore } from '@/stores/serversStore'
import { useUnreadStore } from '@/stores/unreadStore/unreadStore.store'

const TITLE_BASE = 'DCC'

function getActiveChannelId(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] !== 'channels') return null
  if (parts[1] === '@me') return parts[2] ?? null
  return parts[2] ?? null
}

function drawFaviconBadge(totalUnread: number) {
  if (typeof document === 'undefined') return

  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }

  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const context = canvas.getContext('2d')
  if (!context) return

  context.clearRect(0, 0, 64, 64)

  context.fillStyle = '#5865F2'
  context.beginPath()
  context.roundRect(6, 6, 52, 52, 16)
  context.fill()

  context.fillStyle = '#FFFFFF'
  context.beginPath()
  context.roundRect(18, 18, 28, 20, 8)
  context.fill()
  context.beginPath()
  context.moveTo(24, 38)
  context.lineTo(18, 46)
  context.lineTo(29, 40)
  context.closePath()
  context.fill()

  if (totalUnread > 0) {
    const badgeLabel = totalUnread > 99 ? '99+' : String(totalUnread)
    context.fillStyle = '#ED4245'
    context.beginPath()
    context.roundRect(34, 4, 26, 22, 11)
    context.fill()

    context.fillStyle = '#FFFFFF'
    context.font = badgeLabel.length > 2 ? 'bold 11px sans-serif' : 'bold 13px sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(badgeLabel, 47, 15)
  }

  link.href = canvas.toDataURL('image/png')
}

export function UnreadEffects() {
  const pathname = usePathname()
  const viewer = useAuthStore((state) => state.user)
  const setActiveChannel = useServersStore((state) => state.setActiveChannel)
  const activeChannelId = useMemo(() => getActiveChannelId(pathname), [pathname])
  const serverChannelLastMessageId = useServersStore((state) =>
    activeChannelId ? state.channels[activeChannelId]?.lastMessageId ?? null : null
  )
  const loadedLastMessageId = useMessagesStore((state) =>
    activeChannelId
      ? state.channels[activeChannelId]?.messages[state.channels[activeChannelId]!.messages.length - 1]?.id ?? null
      : null
  )
  const totalUnread = useUnreadStore((state) =>
    Object.values(state.channels).reduce((sum, channel) => sum + channel.unreadCount, 0)
  )
  const setStates = useUnreadStore((state) => state.setStates)
  const upsertState = useUnreadStore((state) => state.upsertState)
  const lastSyncedByChannelRef = useRef<Record<string, string | null>>({})
  const targetMessageId = loadedLastMessageId ?? serverChannelLastMessageId

  useEffect(() => {
    setActiveChannel(activeChannelId)
    return () => {
      setActiveChannel(null)
    }
  }, [activeChannelId, setActiveChannel])

  useEffect(() => {
    if (!viewer) return

    readStatesApi
      .list()
      .then((response) => {
        setStates(response.data)
        for (const state of response.data) {
          lastSyncedByChannelRef.current[state.channelId] = state.lastReadMessageId
        }
      })
      .catch(() => undefined)
  }, [viewer?.id, setStates])

  useEffect(() => {
    if (!viewer || !activeChannelId || !targetMessageId) return

    const markRead = () => {
      if (typeof document !== 'undefined' && document.hidden) return
      if (lastSyncedByChannelRef.current[activeChannelId] === targetMessageId) return

      channelsApi
        .markRead(activeChannelId)
        .then((response) => {
          upsertState(response.data)
          lastSyncedByChannelRef.current[activeChannelId] = response.data.lastReadMessageId
        })
        .catch(() => undefined)
    }

    const timeoutId = window.setTimeout(markRead, 250)
    const handleFocus = () => markRead()
    const handleVisibility = () => {
      if (!document.hidden) markRead()
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [activeChannelId, targetMessageId, upsertState, viewer?.id])

  useEffect(() => {
    drawFaviconBadge(totalUnread)
    document.title = totalUnread > 0 ? `(${totalUnread}) ${TITLE_BASE}` : TITLE_BASE
  }, [totalUnread])

  return null
}
