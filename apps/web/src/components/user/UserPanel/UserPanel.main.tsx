'use client'

import { useUserPanelModel } from './UserPanel.logic'
import { UserPanelVisual } from './UserPanel.visual'

export function UserPanel() {
  const visualProps = useUserPanelModel()

  return <UserPanelVisual {...visualProps} />
}
