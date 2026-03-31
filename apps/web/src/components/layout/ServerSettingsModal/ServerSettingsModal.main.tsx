'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  Ban,
  Camera,
  Folder,
  Hash,
  ImagePlus,
  LoaderCircle,
  Plus,
  Save,
  Search,
  Settings2,
  Shield,
  Trash2,
  Users,
  Volume2,
  X,
} from 'lucide-react'
import { ApiRequestError, channelsApi, resolveMediaUrl, serversApi } from '@/lib/api'
import { CHANNEL_ICON_OPTIONS } from '@/lib/channel-icons/channelIcons.shared'
import { Permissions, hasPermission, type Permission } from '@/lib/permissions'
import type { Category, Channel, PermissionOverwrite, Role, ServerMember } from '@/lib/types'
import { useAuthStore } from '@/stores/authStore'
import { useServerCategories, useServerChannels, useServerMembers, useServerRoles, useServersStore } from '@/stores/serversStore'
import { MediaSourcePickerModal } from '@/components/user/MediaSourcePickerModal'
import { Field, SettingBlock, SettingsNavItem } from '@/components/user/UserSettingsParts'

interface Props {
  open: boolean
  serverId: string
  onClose: () => void
}

type Section = 'overview' | 'channels' | 'roles' | 'members'
type MediaTarget = 'icon' | 'banner'
type StructureSelection = { kind: 'category' | 'channel'; id: string } | null
type PermissionKey = keyof typeof Permissions

const PERMISSION_OPTIONS: Array<{ key: PermissionKey; label: string }> = [
  { key: 'VIEW_CHANNEL', label: 'Ver canales' },
  { key: 'SEND_MESSAGES', label: 'Enviar mensajes' },
  { key: 'ADD_REACTIONS', label: 'Reacciones' },
  { key: 'ATTACH_FILES', label: 'Adjuntar archivos' },
  { key: 'READ_MESSAGE_HISTORY', label: 'Historial' },
  { key: 'MANAGE_MESSAGES', label: 'Gestionar mensajes' },
  { key: 'MANAGE_CHANNELS', label: 'Gestionar canales' },
  { key: 'MANAGE_ROLES', label: 'Gestionar roles' },
  { key: 'KICK_MEMBERS', label: 'Expulsar' },
  { key: 'BAN_MEMBERS', label: 'Banear' },
  { key: 'MANAGE_SERVER', label: 'Gestionar servidor' },
  { key: 'MENTION_EVERYONE', label: 'Mention everyone' },
  { key: 'ADMINISTRATOR', label: 'Administrador' },
]

function getRequestMessage(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) return error.message
  return fallback
}

function bitsFromPermissions(enabled: PermissionKey[]) {
  return enabled.reduce((bits, key) => bits | Permissions[key], 0)
}

function enabledPermissions(bits: number) {
  return PERMISSION_OPTIONS.filter((option) => (bits & Permissions[option.key]) !== 0).map((option) => option.key)
}

function colorToHex(color: number | null | undefined) {
  if (color === null || color === undefined) return '#5865f2'
  return `#${color.toString(16).padStart(6, '0')}`
}

function hexToColor(value: string) {
  const normalized = value.trim().replace(/^#/, '')
  return /^[0-9a-fA-F]{6}$/.test(normalized) ? Number.parseInt(normalized, 16) : null
}

function labelForOverwrite(overwrite: PermissionOverwrite, roles: Role[], members: ServerMember[]) {
  if (overwrite.targetType === 'role') return roles.find((role) => role.id === overwrite.targetId)?.name ?? 'Rol'
  const member = members.find((entry) => entry.userId === overwrite.targetId)
  return member?.nickname ?? member?.user.username ?? 'Miembro'
}

export function ServerSettingsModal({ open, serverId, onClose }: Props) {
  const user = useAuthStore((s) => s.user)
  const server = useServersStore((s) => s.servers[serverId])
  const upsertServer = useServersStore((s) => s.upsertServer)
  const setChannels = useServersStore((s) => s.setChannels)
  const upsertChannel = useServersStore((s) => s.upsertChannel)
  const removeChannel = useServersStore((s) => s.removeChannel)
  const setRoles = useServersStore((s) => s.setRoles)
  const upsertRole = useServersStore((s) => s.upsertRole)
  const removeRole = useServersStore((s) => s.removeRole)
  const setMembers = useServersStore((s) => s.setMembers)
  const upsertMember = useServersStore((s) => s.upsertMember)
  const removeMember = useServersStore((s) => s.removeMember)
  const categories = useServerCategories(serverId)
  const channels = useServerChannels(serverId)
  const roles = useServerRoles(serverId)
  const members = useServerMembers(serverId)

  const iconInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const [section, setSection] = useState<Section>('overview')
  const [selection, setSelection] = useState<StructureSelection>(null)
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [inviteCodeDraft, setInviteCodeDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [sectionBusy, setSectionBusy] = useState(false)
  const [mediaPickerTarget, setMediaPickerTarget] = useState<MediaTarget | null>(null)
  const [createCategoryName, setCreateCategoryName] = useState('')
  const [createChannelName, setCreateChannelName] = useState('')
  const [createChannelType, setCreateChannelType] = useState<'text' | 'voice' | 'announcement'>('text')
  const [createChannelCategoryId, setCreateChannelCategoryId] = useState<string | null>(null)
  const [channelNameDraft, setChannelNameDraft] = useState('')
  const [channelTopicDraft, setChannelTopicDraft] = useState('')
  const [channelCategoryDraft, setChannelCategoryDraft] = useState<string | null>(null)
  const [channelIconDraft, setChannelIconDraft] = useState('hash')
  const [categoryNameDraft, setCategoryNameDraft] = useState('')
  const [roleNameDraft, setRoleNameDraft] = useState('')
  const [roleColorDraft, setRoleColorDraft] = useState('#5865f2')
  const [rolePermissionsDraft, setRolePermissionsDraft] = useState<PermissionKey[]>([])
  const [creatingRole, setCreatingRole] = useState(false)
  const [memberRoleIdsDraft, setMemberRoleIdsDraft] = useState<string[]>([])
  const [banReasonDraft, setBanReasonDraft] = useState('')
  const [overwriteDrafts, setOverwriteDrafts] = useState<PermissionOverwrite[]>([])

  const sortedCategories = useMemo(() => [...categories].sort((a, b) => a.position - b.position), [categories])
  const sortedChannels = useMemo(() => [...channels].sort((a, b) => a.position - b.position), [channels])
  const sortedRoles = useMemo(() => [...roles].sort((a, b) => (a.isDefault === b.isDefault ? b.position - a.position : a.isDefault ? 1 : -1)), [roles])
  const sortedMembers = useMemo(() => [...members].sort((a, b) => (a.nickname ?? a.user.username).localeCompare(b.nickname ?? b.user.username)), [members])

  const myMember = useMemo(() => members.find((member) => member.userId === user?.id), [members, user?.id])
  const myRoles = myMember?.roles ?? []
  const isOwner = Boolean(user && server && user.id === server.ownerId)
  const canManageServer = isOwner || myRoles.some((role) => hasPermission(role.permissions, 'MANAGE_SERVER'))
  const canManageChannels = isOwner || myRoles.some((role) => hasPermission(role.permissions, 'MANAGE_CHANNELS'))
  const canManageRoles = isOwner || myRoles.some((role) => hasPermission(role.permissions, 'MANAGE_ROLES'))
  const canKickMembers = isOwner || myRoles.some((role) => hasPermission(role.permissions, 'KICK_MEMBERS'))
  const canBanMembers = isOwner || myRoles.some((role) => hasPermission(role.permissions, 'BAN_MEMBERS'))
  const canOpen = canManageServer || canManageChannels || canManageRoles || canKickMembers || canBanMembers
  const selectedChannel = selection?.kind === 'channel' ? channels.find((channel) => channel.id === selection.id) ?? null : null
  const selectedCategory = selection?.kind === 'category' ? categories.find((category) => category.id === selection.id) ?? null : null
  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? null
  const selectedMember = members.find((member) => member.userId === selectedMemberId) ?? null

  useEffect(() => {
    if (!open || !serverId) return
    serversApi.getDetails(serverId).then((response) => {
      upsertServer(response.data.server)
      setChannels(serverId, response.data.channels, response.data.categories)
      setRoles(serverId, response.data.roles)
    }).catch(() => undefined)
    serversApi.getMembers(serverId, { limit: 200 }).then((response) => setMembers(serverId, response.data)).catch(() => undefined)
  }, [open, serverId, setChannels, setMembers, setRoles, upsertServer])

  useEffect(() => {
    if (!open || !server) return
    setNameDraft(server.name)
    setDescriptionDraft(server.description ?? '')
    setInviteCodeDraft(server.inviteCode)
    setError(null)
    setSuccess(null)
  }, [open, server])

  useEffect(() => {
    if (selectedChannel) {
      setChannelNameDraft(selectedChannel.name ?? '')
      setChannelTopicDraft(selectedChannel.topic ?? '')
      setChannelCategoryDraft(selectedChannel.categoryId)
      setChannelIconDraft(selectedChannel.iconKey ?? 'hash')
      setOverwriteDrafts(selectedChannel.overwrites ?? [])
    } else if (selectedCategory) {
      setCategoryNameDraft(selectedCategory.name)
      setOverwriteDrafts(selectedCategory.overwrites ?? [])
    }
  }, [selectedCategory, selectedChannel])

  useEffect(() => {
    if (!selectedRole) return
    setRoleNameDraft(selectedRole.name)
    setRoleColorDraft(colorToHex(selectedRole.color))
    setRolePermissionsDraft(enabledPermissions(selectedRole.permissions))
    setCreatingRole(false)
  }, [selectedRole])

  useEffect(() => {
    if (!selectedMember) return
    setMemberRoleIdsDraft(selectedMember.roles.filter((role) => !role.isDefault).map((role) => role.id))
    setBanReasonDraft('')
  }, [selectedMember])

  const refreshAll = async () => {
    const [details, memberList] = await Promise.all([
      serversApi.getDetails(serverId),
      serversApi.getMembers(serverId, { limit: 200 }),
    ])
    upsertServer(details.data.server)
    setChannels(serverId, details.data.channels, details.data.categories)
    setRoles(serverId, details.data.roles)
    setMembers(serverId, memberList.data)
  }

  const updateSection = async (work: () => Promise<void>, fallback: string) => {
    setSectionBusy(true)
    setError(null)
    setSuccess(null)
    try {
      await work()
    } catch (workError) {
      setError(getRequestMessage(workError, fallback))
    } finally {
      setSectionBusy(false)
    }
  }

  async function handleUploadMedia(event: ChangeEvent<HTMLInputElement>, target: MediaTarget) {
    const file = event.target.files?.[0]
    if (!file) return
    await updateSection(async () => {
      const formData = new FormData()
      formData.append(target, file)
      if (target === 'icon') {
        const response = await serversApi.uploadIcon(serverId, formData)
        upsertServer({ ...server!, iconUrl: response.data.iconUrl })
      } else {
        const response = await serversApi.uploadBanner(serverId, formData)
        upsertServer({ ...server!, bannerUrl: response.data.bannerUrl })
      }
      setSuccess('Medio actualizado.')
    }, 'No se pudo subir el archivo.')
    event.target.value = ''
  }

  if (!open || !server || !canOpen) return null

  const overview = (
    <div className="mx-auto max-w-3xl space-y-6">
      <SettingBlock icon={<Shield size={16} />} title="General" description="Nombre, descripcion e invitacion.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre">
            <input value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} className="h-11 w-full rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none" />
          </Field>
          <Field label="Codigo de invitacion">
            <input value={inviteCodeDraft} onChange={(event) => setInviteCodeDraft(event.target.value.toLowerCase())} className="h-11 w-full rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none" />
          </Field>
        </div>
        <Field label="Descripcion">
          <textarea value={descriptionDraft} onChange={(event) => setDescriptionDraft(event.target.value)} rows={4} className="w-full rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 py-2.5 text-sm text-[var(--t1)] outline-none" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <button type="button" onClick={() => setMediaPickerTarget('icon')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--surface-soft)] px-4 py-3 text-sm font-700 text-[var(--t1)]" disabled={!isOwner}>
            <Camera size={14} />
            Cambiar icono
          </button>
          <button type="button" onClick={() => setMediaPickerTarget('banner')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--surface-soft)] px-4 py-3 text-sm font-700 text-[var(--t1)]" disabled={!isOwner}>
            <ImagePlus size={14} />
            Cambiar banner
          </button>
        </div>
        <button type="button" onClick={() => void updateSection(async () => {
          const response = await serversApi.update(serverId, {
            name: nameDraft.trim(),
            description: descriptionDraft.trim() ? descriptionDraft.trim() : null,
            inviteCode: inviteCodeDraft.trim().toLowerCase(),
          })
          upsertServer(response.data)
          setSuccess('Configuracion general guardada.')
        }, 'No se pudo guardar la configuracion general.')} className="inline-flex items-center gap-2 rounded-xl bg-ember px-4 py-2 text-sm font-700 text-[var(--ember-contrast)]" disabled={!canManageServer || sectionBusy}>
          {sectionBusy ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
          Guardar
        </button>
      </SettingBlock>
    </div>
  )

  const channelsSection = (
    <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <SettingBlock icon={<Folder size={16} />} title="Estructura" description="Categorias y canales del servidor.">
        <div className="space-y-3">
          <div className="flex gap-2">
            <input value={createCategoryName} onChange={(event) => setCreateCategoryName(event.target.value)} className="h-10 flex-1 rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none" placeholder="Nueva categoria" />
            <button type="button" onClick={() => void updateSection(async () => {
              await serversApi.createCategory(serverId, { name: createCategoryName.trim() })
              setCreateCategoryName('')
              await refreshAll()
              setSuccess('Categoria creada.')
            }, 'No se pudo crear la categoria.')} className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-[var(--t1)]" disabled={!canManageChannels || sectionBusy}>
              <Plus size={15} />
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <input value={createChannelName} onChange={(event) => setCreateChannelName(event.target.value)} className="h-10 rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none" placeholder="nuevo-canal" />
            <select value={createChannelType} onChange={(event) => setCreateChannelType(event.target.value as 'text' | 'voice' | 'announcement')} className="h-10 rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none">
              <option value="text">Texto</option>
              <option value="voice">Voz</option>
              <option value="announcement">Anuncio</option>
            </select>
            <select value={createChannelCategoryId ?? ''} onChange={(event) => setCreateChannelCategoryId(event.target.value || null)} className="h-10 rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none">
              <option value="">Sin categoria</option>
              {sortedCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>
          <button type="button" onClick={() => void updateSection(async () => {
            await channelsApi.create(serverId, { name: createChannelName.trim(), type: createChannelType, categoryId: createChannelCategoryId })
            setCreateChannelName('')
            await refreshAll()
            setSuccess('Canal creado.')
          }, 'No se pudo crear el canal.')} className="inline-flex items-center gap-2 rounded-xl bg-ember px-4 py-2 text-sm font-700 text-[var(--ember-contrast)]" disabled={!canManageChannels || sectionBusy}>
            <Plus size={14} />
            Crear canal
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {sortedCategories.map((category) => (
            <div key={category.id} className="rounded-xl border border-[var(--b1)] bg-[var(--s1)] p-3">
              <button type="button" onClick={() => setSelection({ kind: 'category', id: category.id })} className="w-full text-left text-sm font-700 text-[var(--t0)]">{category.name}</button>
              <div className="mt-2 space-y-1">
                {sortedChannels.filter((channel) => channel.categoryId === category.id).map((channel) => (
                  <button key={channel.id} type="button" onClick={() => setSelection({ kind: 'channel', id: channel.id })} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-[var(--t2)] hover:bg-[var(--surface-soft)]">
                    {channel.type === 'voice' ? <Volume2 size={14} /> : <Hash size={14} />}
                    <span className="truncate">{channel.name ?? 'canal'}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SettingBlock>

      {selectedCategory ? (
        <SettingBlock icon={<Folder size={16} />} title="Editar categoria" description="Nombre y overwrites de la categoria.">
          <Field label="Nombre">
            <input value={categoryNameDraft} onChange={(event) => setCategoryNameDraft(event.target.value)} className="h-11 w-full rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none" />
          </Field>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => void updateSection(async () => {
              await serversApi.updateCategory(selectedCategory.id, { name: categoryNameDraft.trim() })
              await refreshAll()
              setSuccess('Categoria actualizada.')
            }, 'No se pudo actualizar la categoria.')} className="inline-flex items-center gap-2 rounded-xl bg-ember px-4 py-2 text-sm font-700 text-[var(--ember-contrast)]" disabled={sectionBusy}>
              <Save size={14} />
              Guardar categoria
            </button>
            <button type="button" onClick={() => void updateSection(async () => {
              await serversApi.deleteCategory(selectedCategory.id)
              setSelection(null)
              await refreshAll()
              setSuccess('Categoria eliminada.')
            }, 'No se pudo eliminar la categoria.')} className="inline-flex items-center gap-2 rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-4 py-2 text-sm font-700 text-[var(--dnd)]">
              <Trash2 size={14} />
              Eliminar
            </button>
          </div>
        </SettingBlock>
      ) : null}

      {selectedChannel ? (
        <SettingBlock icon={<Hash size={16} />} title="Editar canal" description="Nombre, descripcion, categoria e icono.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre">
              <input value={channelNameDraft} onChange={(event) => setChannelNameDraft(event.target.value)} className="h-11 w-full rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none" />
            </Field>
            <Field label="Categoria">
              <select value={channelCategoryDraft ?? ''} onChange={(event) => setChannelCategoryDraft(event.target.value || null)} className="h-11 w-full rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none">
                <option value="">Sin categoria</option>
                {sortedCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Descripcion">
            <textarea value={channelTopicDraft} onChange={(event) => setChannelTopicDraft(event.target.value)} rows={4} className="w-full rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 py-2.5 text-sm text-[var(--t1)] outline-none" />
          </Field>
          <Field label="Icono">
            <select value={channelIconDraft} onChange={(event) => setChannelIconDraft(event.target.value)} className="h-11 w-full rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none">
              {CHANNEL_ICON_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
            </select>
          </Field>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => void updateSection(async () => {
              const response = await channelsApi.update(selectedChannel.id, { name: channelNameDraft.trim(), topic: channelTopicDraft.trim() || null, categoryId: channelCategoryDraft, iconKey: channelIconDraft })
              upsertChannel(response.data)
              await refreshAll()
              setSuccess('Canal actualizado.')
            }, 'No se pudo actualizar el canal.')} className="inline-flex items-center gap-2 rounded-xl bg-ember px-4 py-2 text-sm font-700 text-[var(--ember-contrast)]" disabled={sectionBusy}>
              <Save size={14} />
              Guardar canal
            </button>
            <button type="button" onClick={() => void updateSection(async () => {
              await channelsApi.delete(selectedChannel.id)
              removeChannel(selectedChannel.id)
              setSelection(null)
              await refreshAll()
              setSuccess('Canal eliminado.')
            }, 'No se pudo eliminar el canal.')} className="inline-flex items-center gap-2 rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-4 py-2 text-sm font-700 text-[var(--dnd)]">
              <Trash2 size={14} />
              Eliminar
            </button>
          </div>
        </SettingBlock>
      ) : null}

      {(selectedCategory || selectedChannel) ? (
        <SettingBlock icon={<Shield size={16} />} title="Overwrites" description="Permisos por rol o miembro para este elemento.">
          <OverwriteEditor overwrites={overwriteDrafts} roles={sortedRoles} members={sortedMembers} onChange={setOverwriteDrafts} />
          <button type="button" onClick={() => void updateSection(async () => {
            const payload = overwriteDrafts.map((overwrite) => ({
              targetType: overwrite.targetType,
              targetId: overwrite.targetId,
              allowBits: overwrite.allowBits,
              denyBits: overwrite.denyBits,
            }))
            if (selectedChannel) {
              await serversApi.replaceChannelOverwrites(selectedChannel.id, payload)
            } else if (selectedCategory) {
              await serversApi.replaceCategoryOverwrites(selectedCategory.id, payload)
            }
            await refreshAll()
            setSuccess('Overwrites actualizados.')
          }, 'No se pudieron guardar los overwrites.')} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-ember px-4 py-2 text-sm font-700 text-[var(--ember-contrast)]" disabled={!canManageRoles || sectionBusy}>
            <Save size={14} />
            Guardar overwrites
          </button>
        </SettingBlock>
      ) : null}
    </div>
  )

  const rolesSection = (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <SettingBlock icon={<Shield size={16} />} title="Roles" description="Jerarquia y permisos globales.">
        <button type="button" onClick={() => {
          setCreatingRole(true)
          setSelectedRoleId(null)
          setRoleNameDraft('')
          setRoleColorDraft('#5865f2')
          setRolePermissionsDraft(['VIEW_CHANNEL', 'SEND_MESSAGES', 'ADD_REACTIONS', 'ATTACH_FILES', 'READ_MESSAGE_HISTORY'])
        }} className="mb-3 inline-flex items-center gap-2 rounded-xl bg-[var(--surface-soft)] px-4 py-2 text-sm font-700 text-[var(--t1)]" disabled={!canManageRoles}>
          <Plus size={14} />
          Nuevo rol
        </button>
        <div className="space-y-2">
          {sortedRoles.map((role) => (
            <button key={role.id} type="button" onClick={() => setSelectedRoleId(role.id)} className="flex w-full items-center justify-between rounded-xl border border-[var(--b1)] bg-[var(--s1)] px-3 py-3 text-left">
              <span className="text-sm font-700 text-[var(--t0)]">{role.name}</span>
              <span className="h-4 w-4 rounded-full" style={{ backgroundColor: colorToHex(role.color) }} />
            </button>
          ))}
        </div>
      </SettingBlock>

      {selectedRole || creatingRole ? (
        <SettingBlock icon={<Settings2 size={16} />} title={creatingRole ? 'Crear rol' : 'Editar rol'} description="Color y permisos del rol.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre">
              <input value={roleNameDraft} onChange={(event) => setRoleNameDraft(event.target.value)} className="h-11 w-full rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none" />
            </Field>
            <Field label="Color">
              <input type="color" value={roleColorDraft} onChange={(event) => setRoleColorDraft(event.target.value)} className="h-11 w-full rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-2" />
            </Field>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {PERMISSION_OPTIONS.map((option) => (
              <label key={option.key} className="flex items-center gap-2 rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 py-2.5 text-sm text-[var(--t1)]">
                <input type="checkbox" checked={rolePermissionsDraft.includes(option.key)} onChange={(event) => setRolePermissionsDraft((current) => event.target.checked ? [...current, option.key] : current.filter((entry) => entry !== option.key))} />
                {option.label}
              </label>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button type="button" onClick={() => void updateSection(async () => {
              if (creatingRole) {
                const response = await serversApi.createRole(serverId, { name: roleNameDraft.trim(), color: hexToColor(roleColorDraft), permissions: bitsFromPermissions(rolePermissionsDraft) })
                upsertRole(response.data)
                setSelectedRoleId(response.data.id)
                setCreatingRole(false)
                setSuccess('Rol creado.')
              } else if (selectedRole) {
                const response = await serversApi.updateRole(selectedRole.id, { name: roleNameDraft.trim(), color: hexToColor(roleColorDraft), permissions: bitsFromPermissions(rolePermissionsDraft) })
                upsertRole(response.data)
                setSuccess('Rol actualizado.')
              }
              await refreshAll()
            }, creatingRole ? 'No se pudo crear el rol.' : 'No se pudo actualizar el rol.')} className="inline-flex items-center gap-2 rounded-xl bg-ember px-4 py-2 text-sm font-700 text-[var(--ember-contrast)]" disabled={!canManageRoles || sectionBusy || (!creatingRole && !!selectedRole?.isDefault)}>
              <Save size={14} />
              {creatingRole ? 'Crear rol' : 'Guardar rol'}
            </button>
            {!creatingRole && selectedRole && !selectedRole.isDefault ? (
              <button type="button" onClick={() => void updateSection(async () => {
                await serversApi.deleteRole(selectedRole.id)
                removeRole(selectedRole.id)
                setSelectedRoleId(null)
                await refreshAll()
                setSuccess('Rol eliminado.')
              }, 'No se pudo eliminar el rol.')} className="inline-flex items-center gap-2 rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-4 py-2 text-sm font-700 text-[var(--dnd)]">
                <Trash2 size={14} />
                Eliminar
              </button>
            ) : null}
          </div>
        </SettingBlock>
      ) : <EmptyState title="Selecciona un rol" description="Desde aqui puedes editar permisos del rol elegido." />}
    </div>
  )

  const membersSection = (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <SettingBlock icon={<Users size={16} />} title="Miembros" description="Roles y moderacion.">
        <div className="space-y-2">
          {sortedMembers.map((member) => (
            <button key={member.userId} type="button" onClick={() => setSelectedMemberId(member.userId)} className="w-full rounded-xl border border-[var(--b1)] bg-[var(--s1)] px-3 py-3 text-left">
              <p className="text-sm font-700 text-[var(--t0)]">{member.nickname ?? member.user.username}</p>
              <p className="text-xs text-[var(--t4)]">@{member.user.username}</p>
            </button>
          ))}
        </div>
      </SettingBlock>

      {selectedMember ? (
        <SettingBlock icon={<Users size={16} />} title="Gestionar miembro" description="Asignacion de roles y moderacion.">
          <div className="space-y-2">
            {sortedRoles.filter((role) => !role.isDefault).map((role) => (
              <label key={role.id} className="flex items-center gap-2 rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 py-2.5 text-sm text-[var(--t1)]">
                <input type="checkbox" checked={memberRoleIdsDraft.includes(role.id)} onChange={(event) => setMemberRoleIdsDraft((current) => event.target.checked ? [...current, role.id] : current.filter((entry) => entry !== role.id))} disabled={!canManageRoles} />
                {role.name}
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => void updateSection(async () => {
              const response = await serversApi.replaceMemberRoles(serverId, selectedMember.userId, memberRoleIdsDraft)
              upsertMember(response.data)
              await refreshAll()
              setSuccess('Roles del miembro actualizados.')
            }, 'No se pudieron actualizar los roles del miembro.')} className="inline-flex items-center gap-2 rounded-xl bg-ember px-4 py-2 text-sm font-700 text-[var(--ember-contrast)]" disabled={!canManageRoles || sectionBusy}>
              <Save size={14} />
              Guardar roles
            </button>
            <button type="button" onClick={() => void updateSection(async () => {
              await serversApi.kickMember(serverId, selectedMember.userId)
              removeMember(serverId, selectedMember.userId)
              setSelectedMemberId(null)
              await refreshAll()
              setSuccess('Miembro expulsado.')
            }, 'No se pudo expulsar al miembro.')} className="rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-4 py-2 text-sm font-700 text-[var(--t1)]" disabled={!canKickMembers || sectionBusy || selectedMember.userId === server.ownerId}>
              Expulsar
            </button>
          </div>
          <Field label="Motivo del ban">
            <textarea value={banReasonDraft} onChange={(event) => setBanReasonDraft(event.target.value)} rows={3} className="w-full rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 py-2.5 text-sm text-[var(--t1)] outline-none" />
          </Field>
          <button type="button" onClick={() => void updateSection(async () => {
            await serversApi.banMember(serverId, { userId: selectedMember.userId, reason: banReasonDraft.trim() || null })
            removeMember(serverId, selectedMember.userId)
            setSelectedMemberId(null)
            await refreshAll()
            setSuccess('Miembro baneado.')
          }, 'No se pudo banear al miembro.')} className="inline-flex items-center gap-2 rounded-xl border border-[var(--b1)] bg-[var(--dnd)]/10 px-4 py-2 text-sm font-700 text-[var(--dnd)]" disabled={!canBanMembers || sectionBusy || selectedMember.userId === server.ownerId}>
            <Ban size={14} />
            Banear
          </button>
        </SettingBlock>
      ) : <EmptyState title="Selecciona un miembro" description="Desde aqui puedes reasignar roles o aplicar moderacion." />}
    </div>
  )

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-[var(--modal-scrim)] p-4" onClick={onClose}>
      <div className="flex h-[92vh] w-full max-w-[1200px] overflow-hidden rounded-3xl border border-[var(--b1)] bg-[var(--s3)] shadow-[var(--panel-shadow)]" onClick={(event) => event.stopPropagation()}>
        <aside className="hidden w-[260px] shrink-0 border-r border-[var(--b1)] bg-[var(--s1)] p-4 lg:block">
          <div className="relative mt-1"><Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t4)]" /><input className="h-9 w-full rounded-lg border border-[var(--b1)] bg-[var(--s2)] pl-9 pr-3 text-[13px] text-[var(--t2)] outline-none" placeholder="Buscar" disabled /></div>
          <p className="mt-4 px-2 text-[11px] font-700 uppercase tracking-[0.16em] text-[var(--t4)]">Secciones</p>
          <div className="mt-2 space-y-1">
            <SettingsNavItem icon={<Shield size={15} />} label="Vision general" active={section === 'overview'} onClick={() => setSection('overview')} />
            {canManageChannels ? <SettingsNavItem icon={<Hash size={15} />} label="Canales" active={section === 'channels'} onClick={() => setSection('channels')} /> : null}
            {canManageRoles ? <SettingsNavItem icon={<Settings2 size={15} />} label="Roles" active={section === 'roles'} onClick={() => setSection('roles')} /> : null}
            {(canManageRoles || canKickMembers || canBanMembers) ? <SettingsNavItem icon={<Users size={15} />} label="Miembros" active={section === 'members'} onClick={() => setSection('members')} /> : null}
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-[var(--b1)] px-6 py-4"><div><h2 className="font-display text-[19px] font-700 text-[var(--t0)]">Ajustes del servidor</h2><p className="text-sm text-[var(--t3)]">{server.name}</p></div><button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-[var(--t3)]"><X size={18} /></button></div>
          <div className="scrollable flex-1 p-6">{section === 'overview' ? overview : null}{section === 'channels' ? channelsSection : null}{section === 'roles' ? rolesSection : null}{section === 'members' ? membersSection : null}</div>
          <div className="flex items-center justify-between border-t border-[var(--b1)] px-6 py-4 text-sm"><div>{error ? <p className="text-[var(--dnd)]">{error}</p> : null}{!error && success ? <p className="text-[var(--online)]">{success}</p> : null}</div></div>
        </div>
      </div>
      <input ref={iconInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={(event) => void handleUploadMedia(event, 'icon')} />
      <input ref={bannerInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={(event) => void handleUploadMedia(event, 'banner')} />
      <MediaSourcePickerModal open={mediaPickerTarget !== null} title={mediaPickerTarget === 'icon' ? 'Cambiar icono del servidor' : 'Cambiar banner del servidor'} isBusy={sectionBusy} onClose={() => setMediaPickerTarget(null)} onPickLocal={() => { if (mediaPickerTarget === 'icon') iconInputRef.current?.click(); if (mediaPickerTarget === 'banner') bannerInputRef.current?.click(); setMediaPickerTarget(null) }} onPickGiphy={async (url) => { const response = await fetch(url.trim()); const blob = await response.blob(); const formData = new FormData(); const field = mediaPickerTarget === 'icon' ? 'icon' : 'banner'; formData.append(field, new File([blob], `${field}.gif`, { type: blob.type })); await updateSection(async () => { if (mediaPickerTarget === 'icon') { const result = await serversApi.uploadIcon(serverId, formData); upsertServer({ ...server, iconUrl: result.data.iconUrl }) } else if (mediaPickerTarget === 'banner') { const result = await serversApi.uploadBanner(serverId, formData); upsertServer({ ...server, bannerUrl: result.data.bannerUrl }) } setSuccess('Medio actualizado.'); setMediaPickerTarget(null) }, 'No se pudo importar la imagen.') }} />
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-2xl border border-dashed border-[var(--b1)] bg-[var(--s2)] px-6 py-10 text-center"><p className="font-display text-lg font-700 text-[var(--t0)]">{title}</p><p className="mt-2 text-sm text-[var(--t3)]">{description}</p></div>
}

function OverwriteEditor({
  overwrites,
  roles,
  members,
  onChange,
}: {
  overwrites: PermissionOverwrite[]
  roles: Role[]
  members: ServerMember[]
  onChange: (value: PermissionOverwrite[]) => void
}) {
  const [targetType, setTargetType] = useState<'role' | 'member'>('role')
  const [targetId, setTargetId] = useState('')
  const candidates = targetType === 'role' ? roles : members

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)_auto]">
        <select value={targetType} onChange={(event) => setTargetType(event.target.value as 'role' | 'member')} className="h-10 rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none">
          <option value="role">Rol</option>
          <option value="member">Miembro</option>
        </select>
        <select value={targetId} onChange={(event) => setTargetId(event.target.value)} className="h-10 rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none">
          <option value="">Selecciona un objetivo</option>
          {candidates.map((candidate) => (
            <option key={targetType === 'role' ? (candidate as Role).id : (candidate as ServerMember).userId} value={targetType === 'role' ? (candidate as Role).id : (candidate as ServerMember).userId}>
              {targetType === 'role' ? (candidate as Role).name : ((candidate as ServerMember).nickname ?? (candidate as ServerMember).user.username)}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => {
          if (!targetId) return
          if (overwrites.some((overwrite) => overwrite.targetId === targetId && overwrite.targetType === targetType)) return
          onChange([...overwrites, { id: `draft-${targetType}-${targetId}`, serverId: '', categoryId: null, channelId: null, targetType, targetId, allowBits: 0, denyBits: 0 }])
          setTargetId('')
        }} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--surface-soft)] px-4 text-sm font-700 text-[var(--t1)]">
          <Plus size={14} />
          Agregar
        </button>
      </div>

      {overwrites.map((overwrite) => (
        <div key={`${overwrite.targetType}-${overwrite.targetId}`} className="rounded-xl border border-[var(--b1)] bg-[var(--s1)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-700 text-[var(--t0)]">{labelForOverwrite(overwrite, roles, members)}</p>
              <p className="text-xs text-[var(--t4)]">{overwrite.targetType}</p>
            </div>
            <button type="button" onClick={() => onChange(overwrites.filter((entry) => !(entry.targetId === overwrite.targetId && entry.targetType === overwrite.targetType)))} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-soft)] text-[var(--t3)]">
              <Trash2 size={14} />
            </button>
          </div>
          <div className="space-y-2">
            {PERMISSION_OPTIONS.filter((option) => option.key !== 'ADMINISTRATOR').map((option) => {
              const bit = Permissions[option.key]
              const allow = (overwrite.allowBits & bit) !== 0
              const deny = (overwrite.denyBits & bit) !== 0
              return (
                <div key={option.key} className="flex items-center justify-between rounded-lg border border-[var(--b1)] bg-[var(--s2)] px-3 py-2">
                  <span className="text-sm text-[var(--t1)]">{option.label}</span>
                  <div className="flex gap-1">
                    <TriButton active={allow} label="Allow" tone="allow" onClick={() => onChange(overwrites.map((entry) => entry === overwrite ? { ...entry, allowBits: entry.allowBits ^ bit, denyBits: entry.denyBits & ~bit } : entry))} />
                    <TriButton active={!allow && !deny} label="Neutral" tone="neutral" onClick={() => onChange(overwrites.map((entry) => entry === overwrite ? { ...entry, allowBits: entry.allowBits & ~bit, denyBits: entry.denyBits & ~bit } : entry))} />
                    <TriButton active={deny} label="Deny" tone="deny" onClick={() => onChange(overwrites.map((entry) => entry === overwrite ? { ...entry, allowBits: entry.allowBits & ~bit, denyBits: entry.denyBits ^ bit } : entry))} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function TriButton({ active, label, tone, onClick }: { active: boolean; label: string; tone: 'allow' | 'neutral' | 'deny'; onClick: () => void }) {
  const toneClassName =
    tone === 'allow' ? (active ? 'bg-[var(--online)] text-white' : 'text-[var(--online)]') :
    tone === 'deny' ? (active ? 'bg-[var(--dnd)] text-white' : 'text-[var(--dnd)]') :
    active ? 'bg-[var(--surface-soft-hover)] text-[var(--t0)]' : 'text-[var(--t2)]'
  return <button type="button" onClick={onClick} className={`rounded-lg px-3 py-1 text-xs font-700 ${toneClassName}`}>{label}</button>
}
