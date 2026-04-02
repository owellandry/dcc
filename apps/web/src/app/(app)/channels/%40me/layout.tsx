'use client'

import { DMSidebar } from '@/components/layout/DMSidebar'
import { MobileSidebarShell } from '@/components/layout/MobileSidebarShell'

export default function DMSectionLayout({ children }: { children: React.ReactNode }) {
  return <MobileSidebarShell sidebar={<DMSidebar />}>{children}</MobileSidebarShell>
}
