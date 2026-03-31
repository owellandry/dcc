'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ServerSidebar } from '@/components/layout/ServerSidebar'
import { DMSidebar } from '@/components/layout/DMSidebar'
import { ChannelSidebar } from '@/components/layout/ChannelSidebar'
import { MemberSidebar } from '@/components/layout/MemberSidebar'
import { UserPanel } from '@/components/user/UserPanel'
import { DMHomeView } from '@/components/dm/DMHomeView'
import { useServerChannels, useServersStore } from '@/stores/serversStore'
import { serversApi } from '@/lib/api'
import { isMockSession } from '@/lib/mock-init'

export default function ServerEntryPage() {
  const router = useRouter()
  const pathname = usePathname()
  const serverId = getServerIdFromPath(pathname)
  const isDMHome = serverId === '@me'
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
    if (isDMHome) return
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
  }, [channels.length, isDMHome, serverId, setChannels, setRoles, upsertServer])

  useEffect(() => {
    if (!serverId) return
    if (!isDMHome && firstChannelId) {
      router.replace(`/channels/${serverId}/${firstChannelId}`)
    }
  }, [firstChannelId, isDMHome, router, serverId])

  if (!serverId) {
    return (
      <div className="app-shell-bg flex h-screen w-screen items-center justify-center text-sm text-[var(--t4)]">
        Loading route...
      </div>
    )
  }

  if (isDMHome) {
    return (
      <div className="app-shell-bg flex h-screen w-screen overflow-hidden">
        <ServerSidebar />
        <DMSidebar />
        <UserPanel />
        <DMHomeView />
      </div>
    )
  }

  return (
    <div className="app-shell-bg flex h-screen w-screen overflow-hidden">
      <ServerSidebar />
      <ChannelSidebar serverId={serverId} />
      <UserPanel />
      <div className="flex flex-1 items-center justify-center bg-[var(--s3)]">
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
    </div>
  )
}

function getServerIdFromPath(pathname: string | null): string | null {
  if (!pathname) return null

  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] !== 'channels') return null

  return parts[1] ?? null
}
