'use client'

import { usePathname } from 'next/navigation'
import { useVoiceChannel } from '@/hooks/useVoiceChannel'
import { useVoiceStore } from '@/stores/voiceStore'

export function VoiceChannelRuntime() {
  const pathname = usePathname()
  const activeServerId = useVoiceStore((state) => state.activeServerId)
  const activeChannelId = useVoiceStore((state) => state.activeChannelId)

  if (!activeServerId || !activeChannelId) return null

  const activeChannelPath = `/channels/${activeServerId}/${activeChannelId}`
  if (pathname === activeChannelPath) return null

  return <VoiceChannelRuntimeSession serverId={activeServerId} channelId={activeChannelId} />
}

function VoiceChannelRuntimeSession({
  serverId,
  channelId,
}: {
  serverId: string
  channelId: string
}) {
  useVoiceChannel({ serverId, channelId })
  return null
}
