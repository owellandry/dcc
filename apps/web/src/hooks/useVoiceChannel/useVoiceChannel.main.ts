'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { subscribeGatewayEvents, sendGatewayMessage } from '@/lib/realtime/gatewayBus'
import { useAuthStore } from '@/stores/authStore'
import { useVoiceStore } from '@/stores/voiceStore'
import type { GatewayEvent } from '@/lib/types'

const VOICE_STATE_OP = 13
const VOICE_SIGNAL_OP = 14
const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

const AUDIO_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: false,
}

interface UseVoiceChannelOptions {
  serverId: string
  channelId: string
}

interface UseVoiceChannelResult {
  isConnected: boolean
  connectionState: 'idle' | 'requesting-media' | 'joining' | 'connected' | 'error'
  errorMessage: string | null
  join: () => Promise<void>
  leave: () => void
}

export function useVoiceChannel({
  serverId,
  channelId,
}: UseVoiceChannelOptions): UseVoiceChannelResult {
  const meId = useAuthStore((state) => state.user?.id ?? null)
  const {
    activeServerId,
    activeChannelId,
    connectionState,
    errorMessage,
    isMicMuted,
    isHeadphonesMuted,
    joinVoiceChannel,
    leaveVoiceChannel,
    setConnectionState,
    setErrorMessage,
    clearParticipants,
  } = useVoiceStore(
    useShallow((state) => ({
      activeServerId: state.activeServerId,
      activeChannelId: state.activeChannelId,
      connectionState: state.connectionState,
      errorMessage: state.errorMessage,
      isMicMuted: state.isMicMuted,
      isHeadphonesMuted: state.isHeadphonesMuted,
      joinVoiceChannel: state.joinVoiceChannel,
      leaveVoiceChannel: state.leaveVoiceChannel,
      setConnectionState: state.setConnectionState,
      setErrorMessage: state.setErrorMessage,
      clearParticipants: state.clearParticipants,
    }))
  )

  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef(new Map<string, RTCPeerConnection>())
  const remoteAudioRef = useRef(new Map<string, HTMLAudioElement>())
  const pendingCandidatesRef = useRef(new Map<string, RTCIceCandidateInit[]>())
  const isConnectedRef = useRef(false)
  const isHeadphonesMutedRef = useRef(isHeadphonesMuted)

  const isConnected = activeServerId === serverId && activeChannelId === channelId
  isConnectedRef.current = isConnected
  isHeadphonesMutedRef.current = isHeadphonesMuted

  const stopLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
  }, [])

  const cleanupRemoteUser = useCallback((userId: string) => {
    const peerConnection = peerConnectionsRef.current.get(userId)
    if (peerConnection) {
      peerConnection.onicecandidate = null
      peerConnection.ontrack = null
      peerConnection.close()
      peerConnectionsRef.current.delete(userId)
    }

    const audio = remoteAudioRef.current.get(userId)
    if (audio) {
      audio.pause()
      audio.srcObject = null
      remoteAudioRef.current.delete(userId)
    }

    pendingCandidatesRef.current.delete(userId)
  }, [])

  const cleanupAllPeers = useCallback(() => {
    Array.from(peerConnectionsRef.current.keys()).forEach((userId) => {
      cleanupRemoteUser(userId)
    })
  }, [cleanupRemoteUser])

  const attachRemoteAudio = useCallback((userId: string, stream: MediaStream) => {
    let audio = remoteAudioRef.current.get(userId)

    if (!audio) {
      audio = document.createElement('audio')
      audio.autoplay = true
      audio.setAttribute('playsinline', 'true')
      audio.muted = isHeadphonesMutedRef.current
      remoteAudioRef.current.set(userId, audio)
    }

    if (audio.srcObject !== stream) {
      audio.srcObject = stream
    }

    void audio.play().catch(() => undefined)
  }, [])

  const ensureLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        throw new Error('El microfono solo funciona en HTTPS o en localhost. Desde otro PC por HTTP el navegador bloquea getUserMedia.')
      }

      throw new Error('Este navegador no expone acceso al microfono en el contexto actual.')
    }

    const stream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS)
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !useVoiceStore.getState().isMicMuted
    })
    localStreamRef.current = stream
    return stream
  }, [])

  const flushPendingCandidates = useCallback(async (userId: string, peerConnection: RTCPeerConnection) => {
    const queuedCandidates = pendingCandidatesRef.current.get(userId)
    if (!queuedCandidates?.length) return

    pendingCandidatesRef.current.delete(userId)
    for (const candidate of queuedCandidates) {
      await peerConnection.addIceCandidate(candidate)
    }
  }, [])

  const createPeerConnection = useCallback(
    async (userId: string) => {
      const existing = peerConnectionsRef.current.get(userId)
      if (existing) return existing

      const stream = await ensureLocalStream()
      const peerConnection = new RTCPeerConnection(RTC_CONFIGURATION)

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream)
      })

      peerConnection.onicecandidate = (event) => {
        if (!event.candidate || !isConnectedRef.current) return

        sendGatewayMessage({
          op: VOICE_SIGNAL_OP,
          d: {
            targetUserId: userId,
            serverId,
            channelId,
            signalType: 'ice-candidate',
            payload: event.candidate.toJSON(),
          },
        })
      }

      peerConnection.ontrack = (event) => {
        const streamFromEvent = event.streams[0]
        if (streamFromEvent) {
          attachRemoteAudio(userId, streamFromEvent)
          return
        }

        const fallbackStream = new MediaStream([event.track])
        attachRemoteAudio(userId, fallbackStream)
      }

      peerConnectionsRef.current.set(userId, peerConnection)
      await flushPendingCandidates(userId, peerConnection)
      return peerConnection
    },
    [attachRemoteAudio, channelId, ensureLocalStream, flushPendingCandidates, serverId]
  )

  const sendOffer = useCallback(
    async (targetUserId: string) => {
      const peerConnection = await createPeerConnection(targetUserId)
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)

      sendGatewayMessage({
        op: VOICE_SIGNAL_OP,
        d: {
          targetUserId,
          serverId,
          channelId,
          signalType: 'offer',
          payload: offer,
        },
      })
    },
    [channelId, createPeerConnection, serverId]
  )

  const handleVoiceSignal = useCallback(
    async (event: Extract<GatewayEvent, { op: 'VOICE_SIGNAL' }>) => {
      if (!meId || event.d.channelId !== channelId || event.d.serverId !== serverId) return

      const { fromUserId, signalType, payload } = event.d
      if (fromUserId === meId) return

      if (signalType === 'offer') {
        const peerConnection = await createPeerConnection(fromUserId)
        await peerConnection.setRemoteDescription(new RTCSessionDescription(payload as RTCSessionDescriptionInit))
        await flushPendingCandidates(fromUserId, peerConnection)

        const answer = await peerConnection.createAnswer()
        await peerConnection.setLocalDescription(answer)

        sendGatewayMessage({
          op: VOICE_SIGNAL_OP,
          d: {
            targetUserId: fromUserId,
            serverId,
            channelId,
            signalType: 'answer',
            payload: answer,
          },
        })
        return
      }

      const peerConnection = peerConnectionsRef.current.get(fromUserId)
      if (!peerConnection) {
        if (signalType === 'ice-candidate') {
          const queued = pendingCandidatesRef.current.get(fromUserId) ?? []
          queued.push(payload as RTCIceCandidateInit)
          pendingCandidatesRef.current.set(fromUserId, queued)
        }
        return
      }

      if (signalType === 'answer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(payload as RTCSessionDescriptionInit))
        await flushPendingCandidates(fromUserId, peerConnection)
        return
      }

      if (signalType === 'ice-candidate') {
        if (!peerConnection.remoteDescription) {
          const queued = pendingCandidatesRef.current.get(fromUserId) ?? []
          queued.push(payload as RTCIceCandidateInit)
          pendingCandidatesRef.current.set(fromUserId, queued)
          return
        }

        await peerConnection.addIceCandidate(payload as RTCIceCandidateInit)
      }
    },
    [channelId, createPeerConnection, flushPendingCandidates, meId, serverId]
  )

  const leave = useCallback(() => {
    if (!isConnectedRef.current) return

    sendGatewayMessage({
      op: VOICE_STATE_OP,
      d: {
        action: 'leave',
        serverId,
        channelId,
      },
    })

    cleanupAllPeers()
    stopLocalStream()
    clearParticipants(channelId)
    leaveVoiceChannel()
    setConnectionState('idle')
    setErrorMessage(null)
  }, [
    channelId,
    cleanupAllPeers,
    clearParticipants,
    leaveVoiceChannel,
    serverId,
    setConnectionState,
    setErrorMessage,
    stopLocalStream,
  ])

  const join = useCallback(async () => {
    if (isConnectedRef.current) return

    setErrorMessage(null)
    setConnectionState('requesting-media')

    try {
      await ensureLocalStream()
      const sent = sendGatewayMessage({
        op: VOICE_STATE_OP,
        d: {
          action: 'join',
          serverId,
          channelId,
        },
      })

      if (!sent) {
        throw new Error('La conexion en tiempo real todavia no esta lista.')
      }

      joinVoiceChannel(serverId, channelId)
      setConnectionState('joining')
    } catch (error) {
      cleanupAllPeers()
      stopLocalStream()
      leaveVoiceChannel()
      setConnectionState('error')
      setErrorMessage(toVoiceErrorMessage(error))
    }
  }, [
    channelId,
    cleanupAllPeers,
    ensureLocalStream,
    joinVoiceChannel,
    leaveVoiceChannel,
    serverId,
    setConnectionState,
    setErrorMessage,
    stopLocalStream,
  ])

  useEffect(() => {
    const unsubscribe = subscribeGatewayEvents((event) => {
      if (!isConnectedRef.current) return

      if (event.op === 'VOICE_USER_JOINED' && event.d.channelId === channelId && event.d.serverId === serverId) {
        if (event.d.userId !== meId) {
          void sendOffer(event.d.userId)
        }
        return
      }

      if (event.op === 'VOICE_USER_LEFT' && event.d.channelId === channelId && event.d.serverId === serverId) {
        cleanupRemoteUser(event.d.userId)
        if (event.d.userId === meId) {
          stopLocalStream()
          leaveVoiceChannel()
          setConnectionState('idle')
        }
        return
      }

      if (event.op === 'VOICE_SIGNAL') {
        void handleVoiceSignal(event)
      }
    })

    return unsubscribe
  }, [
    channelId,
    cleanupRemoteUser,
    handleVoiceSignal,
    leaveVoiceChannel,
    meId,
    sendOffer,
    serverId,
    setConnectionState,
    stopLocalStream,
  ])

  useEffect(() => {
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !isMicMuted
    })
  }, [isMicMuted])

  useEffect(() => {
    remoteAudioRef.current.forEach((audio) => {
      audio.muted = isHeadphonesMuted
      if (!isHeadphonesMuted) {
        void audio.play().catch(() => undefined)
      }
    })
  }, [isHeadphonesMuted])

  useEffect(() => {
    return () => {
      if (useVoiceStore.getState().activeServerId === serverId && useVoiceStore.getState().activeChannelId === channelId) {
        leave()
        return
      }

      cleanupAllPeers()
      stopLocalStream()
    }
  }, [channelId, cleanupAllPeers, leave, serverId, stopLocalStream])

  return {
    isConnected,
    connectionState,
    errorMessage,
    join,
    leave,
  }
}

function toVoiceErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return 'El navegador bloqueo el microfono. Permite acceso al microfono e intenta de nuevo.'
    }

    if (error.name === 'NotFoundError') {
      return 'No se encontro ningun microfono disponible en este dispositivo.'
    }
  }

  if (error instanceof Error) return error.message
  return 'No se pudo iniciar la conexion de voz.'
}
