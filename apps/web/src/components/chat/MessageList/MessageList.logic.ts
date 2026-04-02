'use client'

import { useCallback, useEffect, useRef } from 'react'
import { getUserDisplayName } from '@/lib/users/displayName.shared'
import { useAuthStore } from '@/stores/authStore'
import { usePresenceStore } from '@/stores/presenceStore'
import { useServersStore } from '@/stores/serversStore'
import { useMessages } from '@/hooks/useMessages'
import { type Message } from '@/lib/types'
import { type MessageGroup, type MessageListProps, type MessageListVisualProps } from './MessageList.shared'

export function useMessageListModel({ channelId }: MessageListProps): MessageListVisualProps {
  const { messages, hasMoreBefore, isLoading, loadBefore } = useMessages(channelId)
  const parentRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const hasAutoScrolledRef = useRef(false)
  const pendingPrependDistanceRef = useRef<number | null>(null)
  const myUserId = useAuthStore((state) => state.user?.id ?? null)
  const channel = useServersStore((state) => state.channels[channelId] ?? null)
  const dmUser = channel?.type === 'dm' || channel?.type === 'group_dm'
    ? channel.participants?.find((participant) => participant.id !== myUserId) ?? channel.participants?.[0] ?? null
    : null
  const dmStatus = usePresenceStore((state) =>
    dmUser ? state.presence[dmUser.id]?.status ?? dmUser.status ?? 'offline' : 'offline'
  )
  const groupedMessages = groupMessages(messages)
  const dmIntro = dmUser
    ? {
        user: dmUser,
        status: dmStatus,
        discriminatorLabel: `${dmUser.username}#${String(dmUser.discriminator).padStart(4, '0')}`,
        subtitle: `Este es el inicio del historial de mensajes directos con ${getUserDisplayName(dmUser)}.`,
      }
    : null

  useEffect(() => {
    if (!channelId) return
    isAtBottomRef.current = true
    hasAutoScrolledRef.current = false
    pendingPrependDistanceRef.current = null
  }, [channelId])

  useEffect(() => {
    const element = parentRef.current
    if (!element) return

    if (pendingPrependDistanceRef.current !== null) {
      const distanceFromBottom = pendingPrependDistanceRef.current
      pendingPrependDistanceRef.current = null

      requestAnimationFrame(() => {
        const nextScrollTop = Math.max(0, element.scrollHeight - distanceFromBottom)
        element.scrollTop = nextScrollTop
      })
      return
    }

    if (!isAtBottomRef.current || groupedMessages.length === 0) return

    element.scrollTo({
      top: element.scrollHeight,
      behavior: hasAutoScrolledRef.current ? 'smooth' : 'auto',
    })
    hasAutoScrolledRef.current = true
  }, [groupedMessages.length, messages.length])

  const handleScroll = useCallback(() => {
    const element = parentRef.current
    if (!element) return
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight
    isAtBottomRef.current = distanceFromBottom < 80
    if (element.scrollTop < 200 && hasMoreBefore && !isLoading) {
      pendingPrependDistanceRef.current = element.scrollHeight - element.scrollTop
      void loadBefore()
    }
  }, [hasMoreBefore, isLoading, loadBefore])

  return {
    isEmpty: messages.length === 0 && !isLoading,
    isLoading,
    hasMoreBefore,
    groupedMessages,
    parentRef,
    dmIntro,
    onScroll: handleScroll,
  }
}

function groupMessages(messages: Message[]): MessageGroup[] {
  return messages.map((message, index) => {
    const previousMessage = messages[index - 1]
    const grouped =
      !!previousMessage &&
      previousMessage.author.id === message.author.id &&
      new Date(message.createdAt).getTime() - new Date(previousMessage.createdAt).getTime() < 5 * 60 * 1000 &&
      message.type === 'default' &&
      previousMessage.type === 'default'

    return { message, grouped }
  })
}
