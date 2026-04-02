'use client'

import { useState } from 'react'
import { MemberSidebar } from '@/components/layout/MemberSidebar'
import { ChatHeader } from '@/components/chat/ChatHeader'
import { ChatArea } from '@/components/chat/ChatArea'
import { VoiceChannelRoom } from '@/components/chat/VoiceChannelRoom'
import { useServersStore } from '@/stores/serversStore'

interface Props {
  serverId: string
  channelId: string
}

export function ChannelPageClient({ serverId, channelId }: Props) {
  const currentChannel = useServersStore((state) =>
    channelId ? state.channels[channelId] ?? null : null
  )
  const [isMemberListOpen, setIsMemberListOpen] = useState(() => {
    // Start with the member list open on desktop, but keep it closed on small screens.
    if (typeof window === 'undefined') return true
    return window.innerWidth >= 1024
  })

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <ChatHeader
        channelId={channelId}
        serverId={serverId}
        isMemberListOpen={isMemberListOpen}
        onToggleMemberList={() => setIsMemberListOpen((prev) => !prev)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {currentChannel?.type === 'voice' ? (
            <VoiceChannelRoom serverId={serverId} channelId={channelId} />
          ) : (
            <ChatArea channelId={channelId} />
          )}
        </div>

        {isMemberListOpen ? (
          <div className="hidden h-full shrink-0 lg:block">
            <MemberSidebar serverId={serverId} />
          </div>
        ) : null}
      </div>

      {isMemberListOpen ? (
        <div className="fixed inset-0 z-[75] lg:hidden">
          <button
            type="button"
            aria-label="Cerrar lista de miembros"
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsMemberListOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-[320px] max-w-[92vw] pt-14">
            <div className="h-full overflow-hidden">
              <MemberSidebar serverId={serverId} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
