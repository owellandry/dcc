'use client'

import { ChannelSidebar } from '@/components/layout/ChannelSidebar'
import { MobileSidebarShell } from '@/components/layout/MobileSidebarShell'

export default function ServerSectionLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { serverId: string }
}) {
  return (
    <MobileSidebarShell sidebar={<ChannelSidebar serverId={params.serverId} />}>
      {children}
    </MobileSidebarShell>
  )
}
