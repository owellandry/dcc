'use client'

import { useDMSidebarModel } from './DMSidebar.logic'
import { DMSidebarVisual } from './DMSidebar.visual'

export function DMSidebar() {
  const visualProps = useDMSidebarModel()

  return <DMSidebarVisual {...visualProps} />
}
