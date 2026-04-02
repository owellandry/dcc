import type { User, UserStatus } from '@/lib/types'
import type { UserDecorationTone } from '../UserDecorationBackdrop.module'

export interface UserStatusSwitcherProps {
  user: User
  decorationTone?: UserDecorationTone | null
}

export interface UserStatusOption {
  value: UserStatus
  label: string
}

export interface UserStatusSwitcherVisualProps {
  user: User
  decorationTone: UserDecorationTone | null
  status: UserStatus
  customStatus: string | null | undefined
  statusOptions: UserStatusOption[]
  selectedStatusLabel: string
  isStatusMenuOpen: boolean
  isSavingStatus: boolean
  statusError: string | null
  statusMenuRef: React.RefObject<HTMLDivElement | null>
  onToggleMenu: () => void
  onUpdateStatus: (status: UserStatus) => void
}

export const STATUS_OPTIONS: UserStatusOption[] = [
  { value: 'online', label: 'En linea' },
  { value: 'idle', label: 'Ausente' },
  { value: 'dnd', label: 'No molestar' },
  { value: 'offline', label: 'Invisible' },
]
