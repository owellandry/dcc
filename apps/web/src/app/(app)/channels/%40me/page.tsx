import { ServerSidebar } from '@/components/layout/ServerSidebar'
import { DMSidebar } from '@/components/layout/DMSidebar'
import { UserPanel } from '@/components/user/UserPanel'
import { DMHomeView } from '@/components/dm/DMHomeView'

export default function DMHomePage() {
  return (
    <div className="app-shell-bg flex h-screen w-screen overflow-hidden">
      <ServerSidebar />
      <DMSidebar />
      <UserPanel />
      <DMHomeView />
    </div>
  )
}
