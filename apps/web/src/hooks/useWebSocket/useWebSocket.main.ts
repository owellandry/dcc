'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useServersStore } from '@/stores/serversStore'
import { useMessagesStore } from '@/stores/messagesStore'
import { usePresenceStore } from '@/stores/presenceStore'
import { useVoiceStore } from '@/stores/voiceStore'
import type { GatewayEvent } from '@/lib/types'
import { getAccessToken } from '@/lib/api'
import { isMockSession } from '@/lib/mock-init'
import { emitGatewayEvent, setGatewaySender } from '@/lib/realtime/gatewayBus'
import { syncUserAcrossClientStores } from '@/lib/users/userSync.shared'

const WS_URL = resolveRuntimeWsUrl(process.env.NEXT_PUBLIC_WS_URL)
const MAX_RECONNECT_DELAY = 30_000

type WSReadyState = 'connecting' | 'open' | 'closed'

function resolveRuntimeWsUrl(explicitUrl: string | undefined) {
  const configuredUrl = explicitUrl ?? 'ws://localhost:8080'

  if (typeof window === 'undefined') return configuredUrl

  try {
    const resolvedUrl = new URL(configuredUrl)
    const browserHostname = window.location.hostname
    const isBrowserOnLan = browserHostname !== 'localhost' && browserHostname !== '127.0.0.1'
    const isConfiguredForLoopback =
      resolvedUrl.hostname === 'localhost' || resolvedUrl.hostname === '127.0.0.1'

    if (isBrowserOnLan && isConfiguredForLoopback) {
      resolvedUrl.hostname = browserHostname
      return resolvedUrl.toString().replace(/\/$/, '')
    }

    return configuredUrl
  } catch {
    return configuredUrl
  }
}

export function useWebSocket(enabled = true) {
  const wsRef = useRef<WebSocket | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shouldReconnectRef = useRef(false)
  const seqRef = useRef(0)
  const reconnectAttempts = useRef(0)
  const readyState = useRef<WSReadyState>('closed')

  const { setUser, isAuthenticated, isLoading } = useAuthStore()
  const { setServers, upsertServer, removeServer, upsertChannel, removeChannel, upsertMember, removeMember } = useServersStore()
  const { appendMessage, updateMessage, deleteMessage, addReaction, removeReaction, setTyping } = useMessagesStore()
  const { setPresence } = usePresenceStore()
  const {
    syncParticipants,
    upsertParticipant,
    removeParticipant,
    setConnectionState,
    setErrorMessage,
  } = useVoiceStore()
  const meId = useAuthStore((s) => s.user?.id ?? '')

  // Always-current ref so ws.onmessage and scheduleReconnect never hold stale closures
  const meIdRef = useRef(meId)
  meIdRef.current = meId

  const cleanup = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    if (reconnectRef.current) clearTimeout(reconnectRef.current)
    heartbeatRef.current = null
    reconnectRef.current = null
  }, [])

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
      return true
    }
    return false
  }, [])

  // Stable ref so scheduleReconnect can call the latest connect without being in deps
  const connectRef = useRef<() => void>(() => {})

  const scheduleReconnect = useCallback(() => {
    cleanup()
    const delay = Math.min(1000 * 2 ** reconnectAttempts.current, MAX_RECONNECT_DELAY)
    reconnectAttempts.current++
    reconnectRef.current = setTimeout(() => connectRef.current(), delay)
  }, [cleanup])

  const handleEvent = useCallback(
    (event: GatewayEvent) => {
      switch (event.op) {
        case 10: // HELLO
          heartbeatRef.current = setInterval(() => {
            send({ op: 1, d: { seq: seqRef.current } })
          }, event.d.heartbeatInterval)
          send({ op: 2, d: { token: getAccessToken() } }) // op 2 = IDENTIFY
          break

        case 11: // READY
          setUser(event.d.user)
          setServers(event.d.guilds)
          // Seed presence store from the current user's stored status
          setPresence(event.d.user.id, event.d.user.status ?? 'online', event.d.user.customStatus ?? null)
          reconnectAttempts.current = 0
          break

        case 'MESSAGE_CREATE':
          appendMessage(event.d)
          break

        case 'MESSAGE_UPDATE':
          updateMessage(event.d.channelId, event.d.id, event.d)
          break

        case 'MESSAGE_DELETE':
          deleteMessage(event.d.channelId, event.d.messageId)
          break

        case 'REACTION_ADD':
          addReaction(event.d.channelId, event.d.messageId, event.d.emoji, event.d.userId, meId)
          break

        case 'REACTION_REMOVE':
          removeReaction(event.d.channelId, event.d.messageId, event.d.emoji, event.d.userId, meId)
          break

        case 'TYPING_START':
          if (event.d.userId !== meId) setTyping(event.d.channelId, event.d.userId)
          break

        case 'PRESENCE_UPDATE':
          setPresence(event.d.userId, event.d.status, event.d.customStatus)
          syncUserAcrossClientStores(event.d.userId, {
            status: event.d.status,
            customStatus: event.d.customStatus,
          })
          if (event.d.userId === meIdRef.current) {
            const currentUser = useAuthStore.getState().user
            if (currentUser) {
              setUser({ ...currentUser, status: event.d.status, customStatus: event.d.customStatus })
            }
          }
          break

        case 'GUILD_CREATE':
          upsertServer(event.d)
          break

        case 'GUILD_UPDATE':
          upsertServer(event.d as import('@/lib/types').Server)
          break

        case 'GUILD_DELETE':
          removeServer(event.d.guildId)
          break

        case 'GUILD_MEMBER_ADD':
          upsertMember(event.d)
          break

        case 'GUILD_MEMBER_REMOVE':
          removeMember(event.d.guildId, event.d.userId)
          break

        case 'CHANNEL_CREATE':
        case 'CHANNEL_UPDATE':
          upsertChannel(event.d as import('@/lib/types').Channel)
          break

        case 'CHANNEL_DELETE':
          removeChannel(event.d.channelId)
          break

        case 'VOICE_STATE_SNAPSHOT':
          syncParticipants(event.d.channelId, event.d.participants)
          setConnectionState('connected')
          setErrorMessage(null)
          break

        case 'VOICE_USER_JOINED':
          upsertParticipant(event.d)
          break

        case 'VOICE_USER_LEFT':
          removeParticipant(event.d.channelId, event.d.userId)
          break
      }

      emitGatewayEvent(event)
    },
    [
      meId,
      setUser,
      setServers,
      appendMessage,
      updateMessage,
      deleteMessage,
      addReaction,
      removeReaction,
      setTyping,
      setPresence,
      upsertServer,
      removeServer,
      upsertChannel,
      removeChannel,
      upsertMember,
      removeMember,
      syncParticipants,
      upsertParticipant,
      removeParticipant,
      setConnectionState,
      setErrorMessage,
      send,
    ]
  )

  // Keep handleEvent ref current so onmessage always dispatches to the latest version
  const handleEventRef = useRef(handleEvent)
  handleEventRef.current = handleEvent

  const connect = useCallback(() => {
    if (readyState.current === 'connecting' || readyState.current === 'open') return
    const token = getAccessToken()
    if (!token) return

    shouldReconnectRef.current = true
    readyState.current = 'connecting'
    const ws = new WebSocket(`${WS_URL}/ws?token=${encodeURIComponent(token)}`)
    wsRef.current = ws
    setGatewaySender(send)

    ws.onopen = () => {
      readyState.current = 'open'
    }

    ws.onmessage = (e: MessageEvent<string>) => {
      try {
        const raw = JSON.parse(e.data)
        // Backend sends dispatch events as { op: 0, t: "EVENT_NAME", d: {...} }.
        // Normalize so that op === t (the event type name) for the switch in handleEvent.
        const event: GatewayEvent = raw.op === 0 ? { ...raw, op: raw.t } : raw
        seqRef.current++
        handleEventRef.current(event)
      } catch { /* ignore malformed frames */ }
    }

    ws.onclose = () => {
      readyState.current = 'closed'
      cleanup()
      wsRef.current = null
      setGatewaySender(null)
      if (shouldReconnectRef.current) {
        scheduleReconnect()
      }
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [cleanup, scheduleReconnect])

  // Keep connectRef current so scheduleReconnect always calls the latest connect
  connectRef.current = connect

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false
    reconnectAttempts.current = 0
    cleanup()
    wsRef.current?.close()
    wsRef.current = null
    readyState.current = 'closed'
    setGatewaySender(null)
  }, [cleanup])

  useEffect(() => {
    if (!enabled) {
      disconnect()
      return () => {
        cleanup()
      }
    }

    if (isMockSession()) {
      disconnect()
      return () => {
        cleanup()
      }
    }

    if (isLoading) {
      return () => {
        cleanup()
      }
    }

    if (isAuthenticated) {
      connect()
    } else {
      disconnect()
    }
    return () => {
      cleanup()
    }
  }, [enabled, isAuthenticated, isLoading, connect, disconnect, cleanup])

  return { send, disconnect }
}
