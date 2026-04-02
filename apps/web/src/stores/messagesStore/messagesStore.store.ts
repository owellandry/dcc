'use client'

import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import type { Message } from '@/lib/types'

interface ChannelMessages {
  messages: Message[]
  hasMoreBefore: boolean
  hasMoreAfter: boolean
  isLoading: boolean
  hasLoadedInitial: boolean
}

interface MessagesState {
  channels: Record<string, ChannelMessages>
  // Typing: channelId -> userId -> timestamp
  typing: Record<string, Record<string, number>>
  replyTargets: Record<string, Message | null>

  // Actions
  setMessages: (channelId: string, messages: Message[], hasMoreBefore: boolean) => void
  prependMessages: (channelId: string, messages: Message[], hasMoreBefore: boolean) => void
  appendMessage: (message: Message) => void
  updateMessage: (channelId: string, messageId: string, patch: Partial<Message>) => void
  syncUser: (userId: string, patch: Partial<Message['author']>) => void
  deleteMessage: (channelId: string, messageId: string) => void
  addReaction: (channelId: string, messageId: string, emoji: string, userId: string, meId: string) => void
  removeReaction: (channelId: string, messageId: string, emoji: string, userId: string, meId: string) => void
  setReplyTarget: (channelId: string, message: Message) => void
  clearReplyTarget: (channelId: string) => void
  setTyping: (channelId: string, userId: string) => void
  clearStaleTyping: () => void
  setLoading: (channelId: string, v: boolean) => void
}

const TYPING_TIMEOUT_MS = 8000
const EMPTY_TYPING_USERS: string[] = []

const defaultChannelState = (): ChannelMessages => ({
  messages: [],
  hasMoreBefore: true,
  hasMoreAfter: false,
  isLoading: false,
  hasLoadedInitial: false,
})

export const useMessagesStore = create<MessagesState>((set, get) => ({
  channels: {},
  typing: {},
  replyTargets: {},

  setMessages: (channelId, messages, hasMoreBefore) =>
    set((s) => ({
      channels: {
        ...s.channels,
        [channelId]: {
          ...(s.channels[channelId] ?? defaultChannelState()),
          messages: mergeMessages(s.channels[channelId]?.messages ?? [], messages),
          hasMoreBefore,
          hasLoadedInitial: true,
        },
      },
    })),

  prependMessages: (channelId, messages, hasMoreBefore) =>
    set((s) => {
      const current = s.channels[channelId] ?? defaultChannelState()
      return {
        channels: {
          ...s.channels,
          [channelId]: {
            ...current,
            messages: mergeMessages(messages, current.messages),
            hasMoreBefore,
            hasLoadedInitial: current.hasLoadedInitial,
          },
        },
      }
    }),

  appendMessage: (message) =>
    set((s) => {
      const current = s.channels[message.channelId] ?? defaultChannelState()
      // Deduplicate
      if (current.messages.some((m) => m.id === message.id)) return {}
      return {
        channels: {
          ...s.channels,
          [message.channelId]: {
            ...current,
            messages: mergeMessages(current.messages, [message]),
          },
        },
      }
    }),

  updateMessage: (channelId, messageId, patch) =>
    set((s) => {
      const current = s.channels[channelId]
      if (!current) return {}
      return {
        channels: {
          ...s.channels,
          [channelId]: {
            ...current,
            messages: current.messages.map((m) =>
              m.id === messageId ? { ...m, ...patch } : m
            ),
          },
        },
      }
    }),

  syncUser: (userId, patch) =>
    set((s) => {
      let changed = false
      const nextChannels = { ...s.channels }

      for (const [channelId, channel] of Object.entries(s.channels)) {
        let channelChanged = false
        const nextMessages = channel.messages.map((message) => {
          let nextMessage = message

          if (message.author.id === userId) {
            nextMessage = {
              ...nextMessage,
              author: { ...nextMessage.author, ...patch },
            }
            channelChanged = true
          }

          if (message.replyTo?.author.id === userId) {
            const replyTo = message.replyTo
            if (!replyTo) return nextMessage
            nextMessage = {
              ...nextMessage,
              replyTo: {
                ...replyTo,
                author: { ...replyTo.author, ...patch },
              },
            }
            channelChanged = true
          }

          return nextMessage
        })

        if (!channelChanged) continue
        changed = true
        nextChannels[channelId] = { ...channel, messages: nextMessages }
      }

      if (!changed) return {}
      return { channels: nextChannels }
    }),

  deleteMessage: (channelId, messageId) =>
    set((s) => {
      const current = s.channels[channelId]
      if (!current) return {}
      return {
        channels: {
          ...s.channels,
          [channelId]: {
            ...current,
            messages: current.messages.filter((m) => m.id !== messageId),
          },
        },
      }
    }),

  addReaction: (channelId, messageId, emoji, _userId, meId) =>
    set((s) => {
      const current = s.channels[channelId]
      if (!current) return {}
      return {
        channels: {
          ...s.channels,
          [channelId]: {
            ...current,
            messages: current.messages.map((m) => {
              if (m.id !== messageId) return m
              const existing = m.reactions.find((r) => r.emoji === emoji)
              if (existing && _userId === meId && existing.meReacted) return m
              const reactions = existing
                ? m.reactions.map((r) =>
                    r.emoji === emoji
                      ? { ...r, count: r.count + 1, meReacted: r.meReacted || _userId === meId }
                      : r
                  )
                : [...m.reactions, { emoji, count: 1, meReacted: _userId === meId }]
              return { ...m, reactions }
            }),
          },
        },
      }
    }),

  removeReaction: (channelId, messageId, emoji, _userId, meId) =>
    set((s) => {
      const current = s.channels[channelId]
      if (!current) return {}
      return {
        channels: {
          ...s.channels,
          [channelId]: {
            ...current,
            messages: current.messages.map((m) => {
              if (m.id !== messageId) return m
              const existing = m.reactions.find((r) => r.emoji === emoji)
              if (!existing) return m
              if (_userId === meId && !existing.meReacted) return m
              const reactions = m.reactions
                .map((r) =>
                  r.emoji === emoji
                    ? { ...r, count: r.count - 1, meReacted: _userId === meId ? false : r.meReacted }
                    : r
                )
                .filter((r) => r.count > 0)
              return { ...m, reactions }
            }),
          },
        },
      }
    }),

  setReplyTarget: (channelId, message) =>
    set((s) => ({
      replyTargets: {
        ...s.replyTargets,
        [channelId]: message,
      },
    })),

  clearReplyTarget: (channelId) =>
    set((s) => {
      if (!(channelId in s.replyTargets)) return {}
      const nextReplyTargets = { ...s.replyTargets }
      delete nextReplyTargets[channelId]
      return { replyTargets: nextReplyTargets }
    }),

  setTyping: (channelId, userId) =>
    set((s) => ({
      typing: {
        ...s.typing,
        [channelId]: { ...(s.typing[channelId] ?? {}), [userId]: Date.now() },
      },
    })),

  clearStaleTyping: () => {
    const now = Date.now()
    const { typing } = get()
    const next: typeof typing = {}
    let changed = false

    for (const [channelId, users] of Object.entries(typing)) {
      const filtered = Object.fromEntries(
        Object.entries(users).filter(([, ts]) => now - ts < TYPING_TIMEOUT_MS)
      )

      if (Object.keys(filtered).length !== Object.keys(users).length) {
        changed = true
      }

      if (Object.keys(filtered).length) next[channelId] = filtered
    }

    if (!changed && Object.keys(typing).length === Object.keys(next).length) {
      return
    }

    set({ typing: next })
  },

  setLoading: (channelId, isLoading) =>
    set((s) => ({
      channels: {
        ...s.channels,
        [channelId]: { ...(s.channels[channelId] ?? defaultChannelState()), isLoading },
      },
    })),
}))

// ── Selectors ─────────────────────────────────────────────────────────────────

const EMPTY_CHANNEL: ChannelMessages = {
  messages: [],
  hasMoreBefore: false,
  hasMoreAfter: false,
  isLoading: false,
  hasLoadedInitial: false,
}

export function useChannelMessages(channelId: string | null) {
  return useMessagesStore(
    useShallow((s) => channelId ? (s.channels[channelId] ?? EMPTY_CHANNEL) : EMPTY_CHANNEL)
  )
}

export function useTypingUsers(channelId: string | null) {
  return useMessagesStore(
    useShallow((s) =>
      channelId ? Object.keys(s.typing[channelId] ?? {}) : EMPTY_TYPING_USERS
    )
  )
}

export function useReplyTarget(channelId: string | null) {
  return useMessagesStore((s) => (channelId ? (s.replyTargets[channelId] ?? null) : null))
}

function mergeMessages(existingMessages: Message[], incomingMessages: Message[]) {
  const merged = new Map<string, Message>()

  for (const message of existingMessages) {
    merged.set(message.id, message)
  }

  for (const message of incomingMessages) {
    const previousMessage = merged.get(message.id)
    merged.set(message.id, previousMessage ? { ...previousMessage, ...message } : message)
  }

  return Array.from(merged.values()).sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  )
}
