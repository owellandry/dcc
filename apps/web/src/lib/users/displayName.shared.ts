import type { ServerMember, User } from '@/lib/types'

type UserLike = Pick<User, 'username' | 'displayName'>

export function getUserDisplayName(user: UserLike, nickname?: string | null) {
  return nickname?.trim() || user.displayName?.trim() || user.username
}

export function getMemberDisplayName(member: Pick<ServerMember, 'nickname' | 'user'>) {
  return getUserDisplayName(member.user, member.nickname)
}

export function getUserHandle(user: Pick<User, 'username'>) {
  return `@${user.username}`
}

export function buildUserIdentityLabel(user: UserLike, nickname?: string | null) {
  const displayName = getUserDisplayName(user, nickname)
  return displayName === user.username
    ? `@${user.username}`
    : `${displayName} · @${user.username}`
}
