'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MemberSidebar } from '@/components/layout/MemberSidebar'
import { useServerChannels, useServersStore } from '@/stores/serversStore'
import { serversApi } from '@/lib/api'
import { isMockSession } from '@/lib/mock-init'

export default function ServerEntryPage({ params }: { params: { serverId: string } }) {
  const router = useRouter()
  const serverId = params.serverId
  const channels = useServerChannels(serverId)
  const setChannels = useServersStore((s) => s.setChannels)
  const setRoles = useServersStore((s) => s.setRoles)
  const upsertServer = useServersStore((s) => s.upsertServer)
  const [isHydratingServer, setIsHydratingServer] = useState(false)
  const firstChannelId = [...channels]
    .filter((channel) => channel.type === 'text')
    .sort((a, b) => a.position - b.position)[0]?.id

  useEffect(() => {
    if (!serverId) return
    if (channels.length > 0) return
    if (isMockSession()) return

    let cancelled = false
    setIsHydratingServer(true)

    serversApi
      .getDetails(serverId)
      .then((res) => {
        if (cancelled) return
        upsertServer(res.data.server)
        setChannels(serverId, res.data.channels, res.data.categories)
        setRoles(serverId, res.data.roles)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setIsHydratingServer(false)
      })

    return () => {
      cancelled = true
    }
  }, [channels.length, serverId, setChannels, setRoles, upsertServer])

  useEffect(() => {
    if (!serverId) return
    if (firstChannelId) {
      router.replace(`/channels/${serverId}/${firstChannelId}`)
    }
  }, [firstChannelId, router, serverId])

  if (!serverId) {
    return (
      <div className="flex h-full min-w-0 flex-1 items-center justify-center text-sm text-[var(--t4)]">
        Loading route...
      </div>
    )
  }

  return (
    <>
      <div className="flex min-w-0 flex-1 items-center justify-center bg-[var(--s3)]">
        <div className="text-center">
          <p className="font-display text-lg font-600 text-[var(--t1)]">
            {firstChannelId ? 'Opening your first channel...' : isHydratingServer ? 'Loading server...' : 'No channels available'}
          </p>
          <p className="mt-1 text-sm text-[var(--t3)]">
            {firstChannelId
              ? 'Redirecting you to the first text channel in this server.'
              : isHydratingServer
                ? 'Syncing channels for this server.'
                : 'This server does not have any text channels yet.'}
          </p>
        </div>
      </div>
      <MemberSidebar serverId={serverId} />
    </>
  )
}
