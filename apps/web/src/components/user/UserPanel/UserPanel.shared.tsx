import type { SettingsView } from '@/components/user/UserSettingsModal/UserSettingsModalFrameParts.module'
import type { ReactNode } from 'react'
import type { User } from '@/lib/types'

export interface UserPanelVisualProps {
  user: User | null
  isSettingsOpen: boolean
  settingsInitialView: SettingsView
  isThemeWorkspaceOpen: boolean
  isMicMuted: boolean
  isHeadphonesMuted: boolean
  onToggleMic: () => void
  onToggleHeadphones: () => void
  onOpenSettings: (view?: SettingsView) => void
  onCloseSettings: () => void
  onOpenThemeWorkspace: () => void
  onCloseThemeWorkspace: () => void
  onBackToAppearanceSettings: () => void
}

export interface PanelButtonProps {
  icon: ReactNode
  title: string
  active?: boolean
  onClick?: () => void
}
