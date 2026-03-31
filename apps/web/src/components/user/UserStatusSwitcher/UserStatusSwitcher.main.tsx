'use client'

import { useUserStatusSwitcherModel } from './UserStatusSwitcher.logic'
import { type UserStatusSwitcherProps } from './UserStatusSwitcher.shared'
import { UserStatusSwitcherVisual } from './UserStatusSwitcher.visual'

export function UserStatusSwitcher(props: UserStatusSwitcherProps) {
  const visualProps = useUserStatusSwitcherModel(props)

  return <UserStatusSwitcherVisual {...visualProps} />
}
