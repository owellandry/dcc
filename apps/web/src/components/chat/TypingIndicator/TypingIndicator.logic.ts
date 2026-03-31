'use client'

import { useEffect, useMemo } from 'react'
import { useMessagesStore, useTypingUsers } from '@/stores/messagesStore'
import { useServersStore } from '@/stores/serversStore'
import { type TypingIndicatorProps, type TypingIndicatorVisualProps } from './TypingIndicator.shared'

export function useTypingIndicatorModel({
  channelId,
}: TypingIndicatorProps): TypingIndicatorVisualProps {
  const typingUserIds = useTypingUsers(channelId)
  const clearStaleTyping = useMessagesStore((state) => state.clearStaleTyping)
  const members = useServersStore((state) => state.members)

  useEffect(() => {
    const interval = setInterval(clearStaleTyping, 2000)
    return () => clearInterval(interval)
  }, [clearStaleTyping])

  const names = useMemo(() => {
    return typingUserIds.slice(0, 3).map((userId) => {
      for (const serverMembers of Object.values(members)) {
        const member = serverMembers[userId]
        if (member) return member.nickname ?? member.user.username
      }
      return 'Someone'
    })
  }, [members, typingUserIds])

  return {
    showIndicator: typingUserIds.length > 0,
    label: buildTypingLabel(names),
  }
}

function buildTypingLabel(names: string[]) {
  if (names.length === 1) return `${names[0]} está escribiendo`
  if (names.length === 2) return `${names[0]} y ${names[1]} están escribiendo`
  if (names.length === 3) return `${names[0]}, ${names[1]} y ${names[2]} están escribiendo`
  return 'Varias personas están escribiendo'
}
