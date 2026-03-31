// Permission bitfield constants (platform-compatible)
export const Permissions = {
  VIEW_CHANNEL:        1 << 0,
  SEND_MESSAGES:       1 << 1,
  MANAGE_MESSAGES:     1 << 2,
  MANAGE_CHANNELS:     1 << 3,
  MANAGE_ROLES:        1 << 4,
  KICK_MEMBERS:        1 << 5,
  BAN_MEMBERS:         1 << 6,
  MANAGE_SERVER:       1 << 7,
  MENTION_EVERYONE:    1 << 8,
  ADD_REACTIONS:       1 << 9,
  ATTACH_FILES:        1 << 10,
  READ_MESSAGE_HISTORY:1 << 11,
  ADMINISTRATOR:       1 << 12,
} as const

export type Permission = keyof typeof Permissions

/** Checks if a permission bitfield has a specific permission */
export function hasPermission(bits: number, permission: Permission): boolean {
  if (bits & Permissions.ADMINISTRATOR) return true
  return !!(bits & Permissions[permission])
}

/** Computes the effective permission bitfield for a member in a channel */
export function resolvePermissions(
  rolePermissions: number[],
  channelAllowBits: number,
  channelDenyBits: number,
  isOwner: boolean
): number {
  if (isOwner) return Permissions.ADMINISTRATOR

  // Base: union of all role permissions
  let bits = rolePermissions.reduce((acc, p) => acc | p, 0)

  // If ADMINISTRATOR, grant everything
  if (bits & Permissions.ADMINISTRATOR) return ~0 >>> 0

  // Channel overrides: deny first, then allow
  bits &= ~channelDenyBits
  bits |= channelAllowBits

  return bits
}

export function hasDefaultCategoryAccess(
  rolePermissions: number[],
  rolePositions: number[],
  adminRoleLevel: number | null,
  isOwner: boolean
): boolean {
  if (isOwner) return true
  if (rolePermissions.some((bits) => hasPermission(bits, 'ADMINISTRATOR'))) return true
  if (adminRoleLevel === null) return false
  return rolePositions.some((position) => position >= adminRoleLevel)
}
