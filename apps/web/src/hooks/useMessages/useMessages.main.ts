'use client'

import { useCallback, useEffect } from 'react'
import { useMessagesStore, useChannelMessages } from '@/stores/messagesStore'
import { channelsApi } from '@/lib/api'
import { isMockSession } from '@/lib/mock-init'

export function useMessages(channelId: string | null) {
  const { setMessages, prependMessages, setLoading } = useMessagesStore()
  const state = useChannelMessages(channelId)

  // Initial load
  useEffect(() => {
    if (!channelId) return
    if (state.hasLoadedInitial) return
    if (isMockSession()) return // mock data already in store

    setLoading(channelId, true)
    channelsApi
      .getMessages(channelId, { limit: 50 })
      .then((res) => setMessages(channelId, res.data, res.meta.hasMore))
      .catch(console.error)
      .finally(() => setLoading(channelId, false))
  }, [channelId, setLoading, setMessages, state.hasLoadedInitial])

  // Load older messages (scroll up)
  const loadBefore = useCallback(async () => {
    if (!channelId || !state.hasMoreBefore || state.isLoading) return
    if (isMockSession()) return
    const oldest = state.messages[0]
    if (!oldest) return

    setLoading(channelId, true)
    try {
      const res = await channelsApi.getMessages(channelId, {
        before: oldest.id,
        limit: 50,
      })
      prependMessages(channelId, res.data, res.meta.hasMore)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(channelId, false)
    }
  }, [channelId, state.hasMoreBefore, state.isLoading, state.messages, prependMessages, setLoading])

  return { ...state, loadBefore }
}
