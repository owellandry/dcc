import type { GatewayEvent } from '@/lib/types'

type GatewaySender = (payload: object) => boolean
type GatewayListener = (event: GatewayEvent) => void

let sender: GatewaySender | null = null
const listeners = new Set<GatewayListener>()

export function setGatewaySender(nextSender: GatewaySender | null) {
  sender = nextSender
}

export function sendGatewayMessage(payload: object) {
  if (!sender) return false
  return sender(payload)
}

export function emitGatewayEvent(event: GatewayEvent) {
  listeners.forEach((listener) => listener(event))
}

export function subscribeGatewayEvents(listener: GatewayListener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
