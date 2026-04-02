'use client'

import { useState } from 'react'
import { MemberSidebar } from '@/components/layout/MemberSidebar'
import { ChatHeader } from '@/components/chat/ChatHeader'
import { ChatArea } from '@/components/chat/ChatArea'
import { VoiceChannelRoom } from '@/components/chat/VoiceChannelRoom'
import { useServersStore } from '@/stores/serversStore'

export default function ChannelPage({ params }: { params: { serverId: string; channelId: string } }) {
  const { serverId, channelId } = params
  const currentChannel = useServersStore((state) => (channelId ? state.channels[channelId] ?? null : null))
  const [isMemberListOpen, setIsMemberListOpen] = useState(() => {
    // En mobile, arrancamos cerrado para no “aplastar” el chat.
    if (typeof window === 'undefined') return true
    return window.innerWidth >= 1024
  })

  return (
    <>
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
        </div>
      </div>
      {isMemberListOpen && (
        <div className="fixed inset-0 z-[75] lg:static lg:inset-auto lg:z-auto lg:block lg:shrink-0">
          {/* Scrim solo mobile/tablet */}
          <button
            type="button"
            aria-label="Cerrar lista de miembros"
            className="absolute inset-0 bg-black/60 lg:hidden"
            onClick={() => setIsMemberListOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-[320px] max-w-[92vw] lg:static lg:w-auto">
            <MemberSidebar serverId={serverId} />
          </div>
        </div>
      )}
    </>
  )
}
