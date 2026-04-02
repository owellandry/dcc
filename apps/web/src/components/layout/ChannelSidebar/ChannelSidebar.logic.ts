'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useShallow } from 'zustand/react/shallow'
import { channelsApi, resolveMediaUrl, serversApi } from '@/lib/api'
import { isMockSession } from '@/lib/mock-init'
import { hasPermission } from '@/lib/permissions'
import type { Channel, ServerMember, VoiceParticipant } from '@/lib/types'
import { useAuthStore } from '@/stores/authStore'
import { useServerCategories, useServerChannels, useServersStore } from '@/stores/serversStore'
import { useVoiceStore } from '@/stores/voiceStore'
import {
  type ChannelSidebarCategoryGroup,
  type ChannelSidebarItem,
  type ChannelSidebarProps,
  type ChannelSidebarVisualProps,
} from './ChannelSidebar.shared'

const EMPTY_MEMBERS: Record<string, ServerMember> = {}

function isServerRenderableChannel(
  channel: Channel
): channel is Channel & { type: 'text' | 'voice' | 'announcement' } {
  return channel.type === 'text' || channel.type === 'voice' || channel.type === 'announcement'
}

function toChannelSidebarItem(
  channel: Channel & { type: 'text' | 'voice' | 'announcement' },
  resolvedServerId: string,
  pathname: string,
  activeVoiceChannelId: string | null,
  membersById: Record<string, ServerMember>,
  participantsByChannel: Record<string, Record<string, VoiceParticipant>>
): ChannelSidebarItem {
  const voiceParticipants = channel.type === 'voice'
    ? Object.values(participantsByChannel[channel.id] ?? {})
      .sort((left, right) => new Date(left.joinedAt).getTime() - new Date(right.joinedAt).getTime())
      .map((participant) => ({
        userId: participant.userId,
        displayName: membersById[participant.userId]?.nickname ?? membersById[participant.userId]?.user.username ?? 'Usuario',
        avatarUrl: membersById[participant.userId]?.user.avatarUrl ?? null,
        joinedAt: participant.joinedAt,
      }))
    : undefined

  return {
    id: channel.id,
    name: channel.name ?? '',
    active: pathname.endsWith(channel.id),
    serverId: resolvedServerId,
    type: channel.type,
    iconKey: channel.iconKey ?? null,
    fontKey: channel.fontKey ?? null,
    fontWeight: channel.fontWeight ?? null,
    ...(voiceParticipants ? { voiceParticipants } : {}),
    isConnected: channel.type === 'voice' && activeVoiceChannelId === channel.id,
  }
}

export function useChannelSidebarModel({
  serverId,
}: ChannelSidebarProps): ChannelSidebarVisualProps {
  const router = useRouter()
  const pathname = usePathname()
  const myUserId = useAuthStore((state) => state.user?.id ?? null)
  const resolvedServerId = serverId ?? null
  const { activeVoiceChannelId, participantsByChannel } = useVoiceStore(
    useShallow((state) => ({
      activeVoiceChannelId: state.activeChannelId,
      participantsByChannel: state.participantsByChannel,
    }))
  )
  const upsertChannel = useServersStore((state) => state.upsertChannel)
  const membersById = useServersStore((state) =>
    resolvedServerId ? state.members[resolvedServerId] ?? EMPTY_MEMBERS : EMPTY_MEMBERS
  )
  const { server, canOpenServerSettings, canCreateChannels, canManageChannels } = useServersStore(
    useShallow((state) => {
      const currentServer = resolvedServerId ? state.servers[resolvedServerId] : undefined
      const membership = resolvedServerId && myUserId ? state.members[resolvedServerId]?.[myUserId] : null
      const hasManageServerRole =
        membership?.roles.some((role) => hasPermission(role.permissions, 'MANAGE_SERVER')) ?? false
      const hasManageChannelsRole =
        membership?.roles.some((role) => hasPermission(role.permissions, 'MANAGE_CHANNELS')) ?? false
      const hasManageRolesRole =
        membership?.roles.some((role) => hasPermission(role.permissions, 'MANAGE_ROLES')) ?? false
      const hasKickMembersRole =
        membership?.roles.some((role) => hasPermission(role.permissions, 'KICK_MEMBERS')) ?? false
      const hasBanMembersRole =
        membership?.roles.some((role) => hasPermission(role.permissions, 'BAN_MEMBERS')) ?? false
      const isOwner = Boolean(myUserId && currentServer && currentServer.ownerId === myUserId)

      return {
        server: currentServer,
        canOpenServerSettings:
          isOwner || hasManageServerRole || hasManageChannelsRole || hasManageRolesRole || hasKickMembersRole || hasBanMembersRole,
        canCreateChannels: isOwner || hasManageServerRole || hasManageChannelsRole,
        canManageChannels: isOwner || hasManageServerRole || hasManageChannelsRole,
      }
    })
  )
  const channels = useServerChannels(resolvedServerId)
  const categories = useServerCategories(resolvedServerId)
  const upsertServer = useServersStore((state) => state.upsertServer)
  const setChannels = useServersStore((state) => state.setChannels)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false)
  const [serverSettingsInitialSection, setServerSettingsInitialSection] = useState<'overview' | 'channels' | 'roles' | 'members'>('overview')
  const [serverSettingsInitialSelection, setServerSettingsInitialSelection] = useState<{ kind: 'category' | 'channel'; id: string } | null>(null)
  const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] = useState(false)
  const [createChannelName, setCreateChannelName] = useState('')
  const [createChannelType, setCreateChannelType] = useState<'text' | 'voice'>('text')
  const [createChannelCategoryId, setCreateChannelCategoryId] = useState<string | null>(null)
  const [isCreatingChannel, setIsCreatingChannel] = useState(false)
  const [createChannelError, setCreateChannelError] = useState<string | null>(null)

  useEffect(() => {
    if (!resolvedServerId) return
    if (isMockSession()) return
    if (server && channels.length > 0) return

    serversApi
      .getDetails(resolvedServerId)
      .then((response) => {
        upsertServer(response.data.server)
        setChannels(resolvedServerId, response.data.channels, response.data.categories)
        useServersStore.getState().setRoles(resolvedServerId, response.data.roles)
      })
      .catch(() => undefined)
  }, [channels.length, resolvedServerId, server, setChannels, upsertServer])

  const uncategorizedChannels = useMemo<ChannelSidebarItem[]>(() => {
    if (!resolvedServerId) return []

    const renderableChannels = channels.filter(isServerRenderableChannel)

    return renderableChannels
      .filter((channel) => !channel.categoryId)
      .sort((left, right) => left.position - right.position)
      .map((channel) =>
        toChannelSidebarItem(
          channel,
          resolvedServerId,
          pathname,
          activeVoiceChannelId,
          membersById,
          participantsByChannel
        )
      )
  }, [activeVoiceChannelId, channels, membersById, participantsByChannel, pathname, resolvedServerId])

  const categorizedChannels = useMemo<ChannelSidebarCategoryGroup[]>(() => {
    if (!resolvedServerId) return []

    const renderableChannels = channels.filter(isServerRenderableChannel)

    return categories
      .sort((left, right) => left.position - right.position)
      .map((category) => ({
        id: category.id,
        name: category.name,
        collapsed: collapsedCategories.has(category.id),
        channels: renderableChannels
          .filter((channel) => channel.categoryId === category.id)
          .sort((left, right) => left.position - right.position)
          .map((channel) =>
            toChannelSidebarItem(
              channel,
              resolvedServerId,
              pathname,
              activeVoiceChannelId,
              membersById,
              participantsByChannel
            )
          ),
      }))
  }, [activeVoiceChannelId, categories, channels, collapsedCategories, membersById, participantsByChannel, pathname, resolvedServerId])

  const bannerBackground = server?.bannerUrl
    ? `url(${resolveMediaUrl(server.bannerUrl)})`
    : 'linear-gradient(135deg,rgba(122,149,255,0.5),rgba(129,83,255,0.35),rgba(23,25,31,0.95))'

  const closeCreateChannelModal = () => {
    setIsCreateChannelModalOpen(false)
    setCreateChannelName('')
    setCreateChannelType('text')
    setCreateChannelCategoryId(null)
    setIsCreatingChannel(false)
    setCreateChannelError(null)
  }

  const handleSubmitCreateChannel = async () => {
    if (!resolvedServerId || !canCreateChannels) return

    const normalizedName = createChannelName.trim()
    if (!normalizedName) {
      setCreateChannelError('Escribe un nombre para el canal.')
      return
    }

    setCreateChannelError(null)
    setIsCreatingChannel(true)

    const siblingChannels = channels
      .filter((channel) => channel.categoryId === createChannelCategoryId && channel.type !== 'dm' && channel.type !== 'group_dm')
      .sort((left, right) => left.position - right.position)
    const nextPosition = siblingChannels.length

    if (isMockSession()) {
      const channelId = `channel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      upsertChannel({
        id: channelId,
        serverId: resolvedServerId,
        categoryId: createChannelCategoryId,
        name: normalizedName,
        topic: createChannelType === 'voice' ? 'Voice room' : null,
        type: createChannelType,
        position: nextPosition,
        isNsfw: false,
        slowmodeSeconds: 0,
        lastMessageId: null,
        createdAt: new Date().toISOString(),
      })
      closeCreateChannelModal()
      router.push(`/channels/${resolvedServerId}/${channelId}`)
      return
    }

    try {
      const response = await channelsApi.create(resolvedServerId, {
        name: normalizedName,
        type: createChannelType,
        ...(createChannelCategoryId ? { categoryId: createChannelCategoryId } : {}),
      })
      upsertChannel(response.data)
      closeCreateChannelModal()
      router.push(`/channels/${resolvedServerId}/${response.data.id}`)
    } catch (error) {
      setCreateChannelError(error instanceof Error ? error.message : 'No se pudo crear el canal.')
      setIsCreatingChannel(false)
    }
  }

  return {
    resolvedServerId,
    serverName: server?.name ?? '...',
    bannerBackground,
    canOpenServerSettings,
    canCreateChannels,
    canManageChannels,
    uncategorizedChannels,
    categorizedChannels,
    isInviteModalOpen,
    isServerSettingsOpen,
    serverSettingsInitialSection,
    serverSettingsInitialSelection,
    isCreateChannelModalOpen,
    createChannelName,
    createChannelType,
    isCreatingChannel,
    createChannelError,
    onToggleCategory: (id: string) => {
      setCollapsedCategories((previous) => {
        const next = new Set(previous)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })
    },
    onOpenInviteModal: () => setIsInviteModalOpen(true),
    onCloseInviteModal: () => setIsInviteModalOpen(false),
    onOpenServerSettings: () => {
      if (!canOpenServerSettings) return
      setServerSettingsInitialSection('overview')
      setServerSettingsInitialSelection(null)
      setIsServerSettingsOpen(true)
    },
    onOpenChannelSettings: (channelId) => {
      if (!canManageChannels) return
      setServerSettingsInitialSection('channels')
      setServerSettingsInitialSelection({ kind: 'channel', id: channelId })
      setIsServerSettingsOpen(true)
    },
    onCloseServerSettings: () => setIsServerSettingsOpen(false),
    onOpenCreateChannelModal: (categoryId) => {
      if (!canCreateChannels) return
      setCreateChannelCategoryId(categoryId ?? null)
      setIsCreateChannelModalOpen(true)
    },
    onCloseCreateChannelModal: closeCreateChannelModal,
    onCreateChannelNameChange: (value) => {
      setCreateChannelName(value)
      if (createChannelError) setCreateChannelError(null)
    },
    onCreateChannelTypeChange: (value) => setCreateChannelType(value),
    onSubmitCreateChannel: () => {
      void handleSubmitCreateChannel()
    },
  }
}
