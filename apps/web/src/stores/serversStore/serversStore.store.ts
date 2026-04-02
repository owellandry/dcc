'use client'

import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import type { Server, Channel, Category, Role, ServerMember } from '@/lib/types'

interface ServersState {
  // Data
  servers: Record<string, Server>
  channels: Record<string, Channel>
  categories: Record<string, Category>
  roles: Record<string, Role>
  members: Record<string, Record<string, ServerMember>> // serverId -> userId -> member

  // UI state
  activeServerId: string | null
  activeChannelId: string | null

  // Actions
  setServers: (servers: Server[]) => void
  upsertServer: (server: Server) => void
  removeServer: (serverId: string) => void
  setChannels: (serverId: string, channels: Channel[], categories: Category[]) => void
  upsertChannel: (channel: Channel) => void
  patchChannel: (channelId: string, patch: Partial<Channel>) => void
  removeChannel: (channelId: string) => void
  setRoles: (serverId: string, roles: Role[]) => void
  upsertRole: (role: Role) => void
  removeRole: (roleId: string) => void
  setMembers: (serverId: string, members: ServerMember[]) => void
  upsertMember: (member: ServerMember) => void
  syncUser: (userId: string, patch: Partial<ServerMember['user']>) => void
  removeMember: (serverId: string, userId: string) => void
  setActiveServer: (serverId: string | null) => void
  setActiveChannel: (channelId: string | null) => void
}

export const useServersStore = create<ServersState>((set) => ({
  servers: {},
  channels: {},
  categories: {},
  roles: {},
  members: {},
  activeServerId: null,
  activeChannelId: null,

  setServers: (servers) =>
    set({ servers: Object.fromEntries(servers.map((s) => [s.id, s])) }),

  upsertServer: (server) =>
    set((s) => ({ servers: { ...s.servers, [server.id]: server } })),

  removeServer: (serverId) =>
    set((s) => {
      const servers = { ...s.servers }
      delete servers[serverId]
      return { servers }
    }),

  setChannels: (serverId, channels, categories) =>
    set((s) => {
      const newChannels = { ...s.channels }
      const newCategories = { ...s.categories }
      // Remove old channels for this server
      for (const [id, ch] of Object.entries(newChannels)) {
        if (ch.serverId === serverId) delete newChannels[id]
      }
      for (const [id, cat] of Object.entries(newCategories)) {
        if (cat.serverId === serverId) delete newCategories[id]
      }
      channels.forEach((ch) => (newChannels[ch.id] = ch))
      categories.forEach((cat) => (newCategories[cat.id] = cat))
      return { channels: newChannels, categories: newCategories }
    }),

  upsertChannel: (channel) =>
    set((s) => ({ channels: { ...s.channels, [channel.id]: channel } })),

  patchChannel: (channelId, patch) =>
    set((s) => {
      const current = s.channels[channelId]
      if (!current) return {}
      return {
        channels: {
          ...s.channels,
          [channelId]: {
            ...current,
            ...patch,
          },
        },
      }
    }),

  removeChannel: (channelId) =>
    set((s) => {
      const channels = { ...s.channels }
      delete channels[channelId]
      return { channels }
    }),

  setRoles: (serverId, roles) =>
    set((s) => {
      const newRoles = { ...s.roles }
      for (const [id, r] of Object.entries(newRoles)) {
        if (r.serverId === serverId) delete newRoles[id]
      }
      roles.forEach((r) => (newRoles[r.id] = r))
      return { roles: newRoles }
    }),

  upsertRole: (role) =>
    set((s) => ({ roles: { ...s.roles, [role.id]: role } })),

  removeRole: (roleId) =>
    set((s) => {
      const roles = { ...s.roles }
      delete roles[roleId]
      return { roles }
    }),

  setMembers: (serverId, members) =>
    set((s) => ({
      members: {
        ...s.members,
        [serverId]: Object.fromEntries(members.map((m) => [m.userId, m])),
      },
    })),

  upsertMember: (member) =>
    set((s) => ({
      members: {
        ...s.members,
        [member.serverId]: {
          ...(s.members[member.serverId] ?? {}),
          [member.userId]: member,
        },
      },
    })),

  syncUser: (userId, patch) =>
    set((s) => {
      let channelsChanged = false
      let membersChanged = false

      const nextChannels = { ...s.channels }
      for (const [channelId, channel] of Object.entries(s.channels)) {
        if (!channel.participants?.some((participant) => participant.id === userId)) continue
        channelsChanged = true
        nextChannels[channelId] = {
          ...channel,
          participants: channel.participants.map((participant) =>
            participant.id === userId ? { ...participant, ...patch } : participant
          ),
        }
      }

      const nextMembers = { ...s.members }
      for (const [serverId, serverMembers] of Object.entries(s.members)) {
        if (!(userId in serverMembers)) continue
        membersChanged = true
        nextMembers[serverId] = {
          ...serverMembers,
          [userId]: {
            ...serverMembers[userId]!,
            user: { ...serverMembers[userId]!.user, ...patch },
          },
        }
      }

      if (!channelsChanged && !membersChanged) return {}

      return {
        ...(channelsChanged ? { channels: nextChannels } : {}),
        ...(membersChanged ? { members: nextMembers } : {}),
      }
    }),

  removeMember: (serverId, userId) =>
    set((s) => {
      const serverMembers = { ...(s.members[serverId] ?? {}) }
      delete serverMembers[userId]
      return { members: { ...s.members, [serverId]: serverMembers } }
    }),

  setActiveServer: (serverId) => set({ activeServerId: serverId }),
  setActiveChannel: (channelId) => set({ activeChannelId: channelId }),
}))

// ── Selectors ────────────────────────────────────────────────────────────────

export function useServerChannels(serverId: string | null) {
  return useServersStore(
    useShallow((s) =>
      serverId
        ? Object.values(s.channels).filter((ch) => ch.serverId === serverId)
        : []
    )
  )
}

export function useServerCategories(serverId: string | null) {
  return useServersStore(
    useShallow((s) =>
      serverId
        ? Object.values(s.categories).filter((cat) => cat.serverId === serverId)
        : []
    )
  )
}

export function useServerMembers(serverId: string | null) {
  return useServersStore(
    useShallow((s) =>
      serverId ? Object.values(s.members[serverId] ?? {}) : []
    )
  )
}

export function useServerRoles(serverId: string | null) {
  return useServersStore(
    useShallow((s) =>
      serverId
        ? Object.values(s.roles).filter((role) => role.serverId === serverId)
        : []
    )
  )
}
