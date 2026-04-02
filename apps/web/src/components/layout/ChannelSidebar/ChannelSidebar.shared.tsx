export interface ChannelSidebarProps {
  serverId?: string
}

export interface ChannelSidebarItem {
  id: string
  name: string
  active: boolean
  serverId: string
  type: 'text' | 'voice' | 'announcement'
  iconKey?: string | null
  fontKey?: string | null
  fontWeight?: number | null
  voiceParticipants?: Array<{
    userId: string
    displayName: string
    avatarUrl: string | null
    joinedAt: string
  }>
  isConnected?: boolean
  hasUnread?: boolean
  mentionCount?: number
}

export interface ChannelSidebarCategoryGroup {
  id: string
  name: string
  collapsed: boolean
  channels: ChannelSidebarItem[]
}

export interface ChannelSidebarVisualProps {
  resolvedServerId: string | null
  serverName: string
  bannerBackground: string
  canOpenServerSettings: boolean
  canCreateChannels: boolean
  canManageChannels: boolean
  uncategorizedChannels: ChannelSidebarItem[]
  categorizedChannels: ChannelSidebarCategoryGroup[]
  isInviteModalOpen: boolean
  isServerSettingsOpen: boolean
  serverSettingsInitialSection?: 'overview' | 'channels' | 'roles' | 'members'
  serverSettingsInitialSelection?: { kind: 'category' | 'channel'; id: string } | null
  isCreateChannelModalOpen: boolean
  createChannelName: string
  createChannelType: 'text' | 'voice'
  isCreatingChannel: boolean
  createChannelError: string | null
  onToggleCategory: (id: string) => void
  onOpenInviteModal: () => void
  onCloseInviteModal: () => void
  onOpenServerSettings: () => void
  onOpenChannelSettings: (channelId: string) => void
  onCloseServerSettings: () => void
  onOpenCreateChannelModal: (categoryId?: string | null) => void
  onCloseCreateChannelModal: () => void
  onCreateChannelNameChange: (value: string) => void
  onCreateChannelTypeChange: (value: 'text' | 'voice') => void
  onSubmitCreateChannel: () => void
}
