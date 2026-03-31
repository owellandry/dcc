'use client'

import { memo } from 'react'
import { useUserAvatarModel } from './UserAvatar.logic'
import { type UserAvatarProps } from './UserAvatar.shared'
import { UserAvatarVisual } from './UserAvatar.visual'

export const UserAvatar = memo(function UserAvatar(props: UserAvatarProps) {
  const visualProps = useUserAvatarModel(props)

  return <UserAvatarVisual {...visualProps} />
}, areEqualAvatarProps)

function areEqualAvatarProps(previousProps: UserAvatarProps, nextProps: UserAvatarProps) {
  return (
    previousProps.size === nextProps.size &&
    previousProps.showStatus === nextProps.showStatus &&
    previousProps.className === nextProps.className &&
    previousProps.user.id === nextProps.user.id &&
    previousProps.user.username === nextProps.user.username &&
    previousProps.user.avatarUrl === nextProps.user.avatarUrl &&
    previousProps.user.status === nextProps.user.status
  )
}
