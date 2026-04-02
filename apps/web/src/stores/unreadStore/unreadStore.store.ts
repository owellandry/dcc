'use client'

import { create } from 'zustand'
import type { ChannelReadState, Message, User } from '@/lib/types'

interface UnreadState {
  channels: Record<string, ChannelReadState>
  setStates: (states: ChannelReadState[]) => void
  upsertState: (state: ChannelReadState) => void
  incrementFromMessage: (channelId: string, message: Message, viewer: User) => void
  markReadLocal: (channelId: string, lastReadMessageId?: string | null) => void
  clearChannel: (channelId: string) => void
}

const EMPTY_LAST_READ_AT = new Date(0).toISOString()

function mentionsViewer(message: Message, viewer: User) {
  if (message.replyTo?.author.id === viewer.id) return true

  const content = message.content?.toLocaleLowerCase() ?? ''
  if (!content) return false

  const usernameMention = `@${viewer.username.toLocaleLowerCase()}`
  if (content.includes(usernameMention)) return true

  const displayName = viewer.displayName?.trim().toLocaleLowerCase()
  return Boolean(displayName && content.includes(`@${displayName}`))
}

function getDefaultState(channelId: string): ChannelReadState {
  return {
    channelId,
    lastReadMessageId: null,
    lastReadAt: EMPTY_LAST_READ_AT,
    unreadCount: 0,
    mentionCount: 0,
  }
}

export const useUnreadStore = create<UnreadState>((set) => ({
  channels: {},

  setStates: (states) =>
    set({
      channels: Object.fromEntries(states.map((state) => [state.channelId, state])),
    }),

  upsertState: (state) =>
    set((current) => ({
      channels: {
        ...current.channels,
        [state.channelId]: state,
      },
    })),

  incrementFromMessage: (channelId, message, viewer) =>
    set((current) => {
      const previous = current.channels[channelId] ?? getDefaultState(channelId)
      return {
        channels: {
          ...current.channels,
          [channelId]: {
            ...previous,
            unreadCount: previous.unreadCount + 1,
            mentionCount: previous.mentionCount + (mentionsViewer(message, viewer) ? 1 : 0),
          },
        },
      }
    }),

  markReadLocal: (channelId, lastReadMessageId = null) =>
    set((current) => {
      const previous = current.channels[channelId] ?? getDefaultState(channelId)
      return {
        channels: {
          ...current.channels,
          [channelId]: {
            ...previous,
            lastReadMessageId,
            lastReadAt: new Date().toISOString(),
            unreadCount: 0,
            mentionCount: 0,
          },
        },
      }
    }),

  clearChannel: (channelId) =>
    set((current) => {
      if (!(channelId in current.channels)) return current
      const nextChannels = { ...current.channels }
      delete nextChannels[channelId]
      return { channels: nextChannels }
    }),
}))
