'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { ServerSidebar } from '@/components/layout/ServerSidebar'
import { DMSidebar } from '@/components/layout/DMSidebar'
import { ChannelSidebar } from '@/components/layout/ChannelSidebar'
import { MemberSidebar } from '@/components/layout/MemberSidebar'
import { ChatHeader } from '@/components/chat/ChatHeader'
import { ChatArea } from '@/components/chat/ChatArea'
import { VoiceChannelRoom } from '@/components/chat/VoiceChannelRoom'
import { UserPanel } from '@/components/user/UserPanel'
import { useServersStore } from '@/stores/serversStore'

export default function ChannelPage() {
  const pathname = usePathname()
  const { serverId, channelId } = getRouteIdsFromPath(pathname)
  const currentChannel = useServersStore((state) => (channelId ? state.channels[channelId] ?? null : null))
  const [isMemberListOpen, setIsMemberListOpen] = useState(true)

  if (!channelId) {
    return (
      <div className="app-shell-bg flex h-screen w-screen items-center justify-center text-sm text-[var(--t4)]">
        Loading channel...
      </div>
    )
  }

  if (serverId === '@me') {
    return (
      <div className="app-shell-bg flex h-screen w-screen overflow-hidden">
        <ServerSidebar />
        <DMSidebar />
        <UserPanel />
        <div className="flex min-w-0 flex-1 flex-col">
          <ChatHeader channelId={channelId} />
          <ChatArea channelId={channelId} />
        </div>
      </div>
    )
  }

  if (!serverId) {
    return (
      <div className="app-shell-bg flex h-screen w-screen items-center justify-center text-sm text-[var(--t4)]">
        Loading server...
      </div>
    )
  }

  return (
    <div className="app-shell-bg flex h-screen w-screen overflow-hidden">
      <ServerSidebar />
      <ChannelSidebar serverId={serverId} />
      <UserPanel />
      <div className="flex min-w-0 flex-1 flex-col">
        <ChatHeader
          channelId={channelId}
          serverId={serverId}
          isMemberListOpen={isMemberListOpen}
          onToggleMemberList={() => setIsMemberListOpen((prev) => !prev)}
        />
        <div className="flex min-h-0 flex-1">
          {currentChannel?.type === 'voice' ? (
            <VoiceChannelRoom serverId={serverId} channelId={channelId} />
          ) : (
            <ChatArea channelId={channelId} />
          )}
          {isMemberListOpen && <MemberSidebar serverId={serverId} />}
        </div>
      </div>
    </div>
  )
}

function getRouteIdsFromPath(pathname: string | null): { serverId: string | null; channelId: string | null } {
  if (!pathname) {
    return { serverId: null, channelId: null }
  }

  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] !== 'channels') {
    return { serverId: null, channelId: null }
  }

  const decodePart = (rawValue: string | undefined): string | null => {
    if (!rawValue) return null
    try {
      return decodeURIComponent(rawValue)
    } catch {
      return rawValue
    }
  }

  try {
    return {
      serverId: decodePart(parts[1]),
      channelId: decodePart(parts[2]),
    }
  } catch {
    return { serverId: parts[1] ?? null, channelId: parts[2] ?? null }
  }
}
