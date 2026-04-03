'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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

const SCREEN_SHARE_CONSTRAINTS: DisplayMediaStreamOptions = {
  video: {
    width: { ideal: 3840, max: 3840 },
    height: { ideal: 2160, max: 2160 },
    frameRate: { ideal: 30, max: 60 },
  },
  audio: false,
}

type ScreenShareState = 'idle' | 'requesting-media' | 'sharing' | 'error'

interface UseVoiceChannelOptions {
  serverId: string
  channelId: string
}

interface VoiceScreenStream {
  userId: string
  stream: MediaStream
}

interface StopScreenShareOptions {
  notifyServer?: boolean
  renegotiate?: boolean
}

interface UseVoiceChannelResult {
  isConnected: boolean
  connectionState: 'idle' | 'requesting-media' | 'joining' | 'connected' | 'error'
  errorMessage: string | null
  isScreenSharing: boolean
  screenShareState: ScreenShareState
  screenShareError: string | null
  screenStreams: VoiceScreenStream[]
  join: () => Promise<void>
  leave: () => void
  startScreenShare: () => Promise<void>
  stopScreenShare: (options?: StopScreenShareOptions) => Promise<void>
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
    clearScreenShares,
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
      clearScreenShares: state.clearScreenShares,
    }))
  )

  const [screenShareState, setScreenShareState] = useState<ScreenShareState>('idle')
  const [screenShareError, setScreenShareError] = useState<string | null>(null)
  const [screenStreams, setScreenStreams] = useState<VoiceScreenStream[]>([])

  const localStreamRef = useRef<MediaStream | null>(null)
  const localScreenStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef(new Map<string, RTCPeerConnection>())
  const remoteAudioRef = useRef(new Map<string, HTMLAudioElement>())
  const remoteScreenStreamsRef = useRef(new Map<string, MediaStream>())
  const screenTrackSendersRef = useRef(new Map<string, RTCRtpSender>())
  const pendingCandidatesRef = useRef(new Map<string, RTCIceCandidateInit[]>())
  const pendingOffersRef = useRef(new Set<string>())
  const requestOfferRef = useRef<(userId: string) => void>(() => undefined)
  const isConnectedRef = useRef(false)
  const isHeadphonesMutedRef = useRef(isHeadphonesMuted)

  const isConnected = activeServerId === serverId && activeChannelId === channelId
  isConnectedRef.current = isConnected
  isHeadphonesMutedRef.current = isHeadphonesMuted

  const syncScreenStreams = useCallback(() => {
    const nextStreams: VoiceScreenStream[] = []

    if (meId && localScreenStreamRef.current) {
      nextStreams.push({ userId: meId, stream: localScreenStreamRef.current })
    }

    remoteScreenStreamsRef.current.forEach((stream, userId) => {
      nextStreams.push({ userId, stream })
    })

    setScreenStreams(nextStreams)
  }, [meId])

  const stopLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
  }, [])

  const stopLocalScreenCapture = useCallback(() => {
    localScreenStreamRef.current?.getTracks().forEach((track) => {
      track.onended = null
      track.stop()
    })
    localScreenStreamRef.current = null
    syncScreenStreams()
  }, [syncScreenStreams])

  const detachRemoteScreen = useCallback(
    (userId: string) => {
      const stream = remoteScreenStreamsRef.current.get(userId)
      if (!stream) return

      stream.getTracks().forEach((track) => {
        track.onended = null
      })
      remoteScreenStreamsRef.current.delete(userId)
      syncScreenStreams()
    },
    [syncScreenStreams]
  )

  const cleanupRemoteUser = useCallback(
    (userId: string) => {
      const peerConnection = peerConnectionsRef.current.get(userId)
      if (peerConnection) {
        peerConnection.onicecandidate = null
        peerConnection.ontrack = null
        peerConnection.onsignalingstatechange = null
        peerConnection.close()
        peerConnectionsRef.current.delete(userId)
      }

      const audio = remoteAudioRef.current.get(userId)
      if (audio) {
        audio.pause()
        audio.srcObject = null
        remoteAudioRef.current.delete(userId)
      }

      screenTrackSendersRef.current.delete(userId)
      pendingCandidatesRef.current.delete(userId)
      pendingOffersRef.current.delete(userId)
      detachRemoteScreen(userId)
    },
    [detachRemoteScreen]
  )

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

  const attachRemoteScreen = useCallback(
    (userId: string, stream: MediaStream) => {
      remoteScreenStreamsRef.current.set(userId, stream)
      syncScreenStreams()
    },
    [syncScreenStreams]
  )

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

      const screenStream = localScreenStreamRef.current
      if (screenStream) {
        screenStream.getVideoTracks().forEach((track) => {
          const sender = peerConnection.addTrack(track, screenStream)
          screenTrackSendersRef.current.set(userId, sender)
        })
      }

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
        if (event.track.kind === 'audio') {
          const streamFromEvent = event.streams[0]
          if (streamFromEvent) {
            attachRemoteAudio(userId, streamFromEvent)
            return
          }

          const fallbackStream = new MediaStream([event.track])
          attachRemoteAudio(userId, fallbackStream)
          return
        }

        const streamFromEvent = event.streams[0] ?? new MediaStream([event.track])
        event.track.onended = () => {
          detachRemoteScreen(userId)
        }
        attachRemoteScreen(userId, streamFromEvent)
      }

      peerConnection.onsignalingstatechange = () => {
        if (peerConnection.signalingState !== 'stable' || !pendingOffersRef.current.has(userId)) return
        pendingOffersRef.current.delete(userId)
        requestOfferRef.current(userId)
      }

      peerConnectionsRef.current.set(userId, peerConnection)
      await flushPendingCandidates(userId, peerConnection)
      return peerConnection
    },
    [attachRemoteAudio, attachRemoteScreen, channelId, detachRemoteScreen, ensureLocalStream, flushPendingCandidates, serverId]
  )

  const requestOffer = useCallback(
    async (targetUserId: string) => {
      const peerConnection = await createPeerConnection(targetUserId)
      if (peerConnection.signalingState !== 'stable') {
        pendingOffersRef.current.add(targetUserId)
        return
      }

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

  requestOfferRef.current = (userId) => {
    void requestOffer(userId)
  }

  const removeLocalScreenTracksFromPeers = useCallback(() => {
    screenTrackSendersRef.current.forEach((sender, userId) => {
      const peerConnection = peerConnectionsRef.current.get(userId)
      if (!peerConnection) return

      try {
        peerConnection.removeTrack(sender)
      } catch {
        // Some browsers may already have detached the sender. We can ignore it.
      }
    })
    screenTrackSendersRef.current.clear()
  }, [])

  const stopScreenShare = useCallback(
    async (options?: StopScreenShareOptions) => {
      const notifyServer = options?.notifyServer ?? true
      const renegotiate = options?.renegotiate ?? true

      if (notifyServer && isConnectedRef.current) {
        sendGatewayMessage({
          op: VOICE_STATE_OP,
          d: {
            action: 'stop-screen-share',
            serverId,
            channelId,
          },
        })
      }

      removeLocalScreenTracksFromPeers()
      stopLocalScreenCapture()
      setScreenShareError(null)
      setScreenShareState('idle')

      if (!renegotiate) return

      await Promise.allSettled(
        Array.from(peerConnectionsRef.current.keys()).map(async (userId) => {
          await requestOffer(userId)
        })
      )
    },
    [channelId, removeLocalScreenTracksFromPeers, requestOffer, serverId, stopLocalScreenCapture]
  )

  const startScreenShare = useCallback(async () => {
    if (!isConnectedRef.current) {
      setScreenShareState('error')
      setScreenShareError('Primero debes unirte al canal de voz para compartir pantalla.')
      return
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      setScreenShareState('error')
      setScreenShareError('Este navegador no permite compartir pantalla en el contexto actual.')
      return
    }

    if (localScreenStreamRef.current) return

    setScreenShareError(null)
    setScreenShareState('requesting-media')

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia(SCREEN_SHARE_CONSTRAINTS)
      const track = stream.getVideoTracks()[0]

      if (!track) {
        throw new Error('No se pudo capturar una pista de video para compartir pantalla.')
      }

      if ('contentHint' in track) {
        track.contentHint = 'detail'
      }

      track.onended = () => {
        if (!localScreenStreamRef.current) return
        void stopScreenShare()
      }

      localScreenStreamRef.current = stream
      syncScreenStreams()

      const sent = sendGatewayMessage({
        op: VOICE_STATE_OP,
        d: {
          action: 'start-screen-share',
          serverId,
          channelId,
          screenShare: getScreenShareMetadata(track),
        },
      })

      if (!sent) {
        throw new Error('La conexion en tiempo real todavia no esta lista para anunciar la pantalla.')
      }

      Array.from(peerConnectionsRef.current.entries()).forEach(([userId, peerConnection]) => {
        const sender = peerConnection.addTrack(track, stream)
        screenTrackSendersRef.current.set(userId, sender)
      })

      setScreenShareState('sharing')

      await Promise.allSettled(
        Array.from(peerConnectionsRef.current.keys()).map(async (userId) => {
          await requestOffer(userId)
        })
      )
    } catch (error) {
      stopLocalScreenCapture()
      removeLocalScreenTracksFromPeers()
      setScreenShareState('error')
      setScreenShareError(toScreenShareErrorMessage(error))
    }
  }, [channelId, removeLocalScreenTracksFromPeers, requestOffer, serverId, stopLocalScreenCapture, stopScreenShare, syncScreenStreams])

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

    void stopScreenShare({ notifyServer: false, renegotiate: false })

    sendGatewayMessage({
      op: VOICE_STATE_OP,
      d: {
        action: 'leave',
        serverId,
        channelId,
      },
    })

    cleanupAllPeers()
    stopLocalScreenCapture()
    stopLocalStream()
    clearParticipants(channelId)
    clearScreenShares(channelId)
    leaveVoiceChannel()
    setConnectionState('idle')
    setErrorMessage(null)
    setScreenShareError(null)
    setScreenShareState('idle')
  }, [
    channelId,
    cleanupAllPeers,
    clearParticipants,
    clearScreenShares,
    leaveVoiceChannel,
    serverId,
    setConnectionState,
    setErrorMessage,
    stopLocalScreenCapture,
    stopLocalStream,
    stopScreenShare,
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
          requestOfferRef.current(event.d.userId)
        }
        return
      }

      if (event.op === 'VOICE_USER_LEFT' && event.d.channelId === channelId && event.d.serverId === serverId) {
        cleanupRemoteUser(event.d.userId)
        if (event.d.userId === meId) {
          stopLocalScreenCapture()
          stopLocalStream()
          leaveVoiceChannel()
          setConnectionState('idle')
          setScreenShareState('idle')
        }
        return
      }

      if (event.op === 'VOICE_SCREEN_SHARE_UPDATED' && event.d.channelId === channelId && event.d.serverId === serverId) {
        if (event.d.userId !== meId && !event.d.share) {
          detachRemoteScreen(event.d.userId)
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
    detachRemoteScreen,
    handleVoiceSignal,
    leaveVoiceChannel,
    meId,
    serverId,
    setConnectionState,
    stopLocalScreenCapture,
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
      stopLocalScreenCapture()
      stopLocalStream()
    }
  }, [channelId, cleanupAllPeers, leave, serverId, stopLocalScreenCapture, stopLocalStream])

  return {
    isConnected,
    connectionState,
    errorMessage,
    isScreenSharing: Boolean(localScreenStreamRef.current),
    screenShareState,
    screenShareError,
    screenStreams,
    join,
    leave,
    startScreenShare,
    stopScreenShare,
  }
}

function getScreenShareMetadata(track: MediaStreamTrack) {
  const settings = track.getSettings()

  return {
    surface: normalizeScreenSurface(settings.displaySurface),
    width: typeof settings.width === 'number' ? settings.width : null,
    height: typeof settings.height === 'number' ? settings.height : null,
    frameRate: typeof settings.frameRate === 'number' ? settings.frameRate : null,
  }
}

function normalizeScreenSurface(value: string | undefined) {
  if (value === 'monitor' || value === 'window' || value === 'browser' || value === 'application') {
    return value
  }

  return 'unknown'
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

function toScreenShareErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return 'Cancelaste o bloqueaste el permiso para compartir pantalla.'
    }

    if (error.name === 'NotReadableError') {
      return 'No pudimos leer la pantalla seleccionada. Intenta con otra ventana o pestaña.'
    }
  }

  if (error instanceof Error) return error.message
  return 'No se pudo iniciar la comparticion de pantalla.'
}
