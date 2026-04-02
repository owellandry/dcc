'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { channelsApi, serversApi } from '@/lib/api'
import { hasPermission } from '@/lib/permissions'
import type { PermissionOverwrite } from '@/lib/types'
import { useAuthStore } from '@/stores/authStore'
import {
  useServerCategories,
  useServerChannels,
  useServerMembers,
  useServerRoles,
  useServersStore,
} from '@/stores/serversStore'
import { MediaSourcePickerModal } from '@/components/user/MediaSourcePickerModal'
import { ServerSettingsModalChannelsSection } from './ServerSettingsModalChannelsSection.module'
import {
  ServerSettingsModalFooter,
  ServerSettingsModalHeader,
  ServerSettingsModalSidebar,
} from './ServerSettingsModalFrameParts.module'
import { ServerSettingsModalMembersSection } from './ServerSettingsModalMembersSection.module'
import { ServerSettingsModalOverviewSection } from './ServerSettingsModalOverviewSection.module'
import { ServerSettingsModalRolesSection } from './ServerSettingsModalRolesSection.module'
import {
  bitsFromPermissions,
  colorToHex,
  enabledPermissions,
  getRequestMessage,
  hexToColor,
  type MediaTarget,
  type PermissionKey,
  type ServerSettingsSection,
  type StructureSelection,
} from './ServerSettingsModal.shared'

interface Props {
  open: boolean
  serverId: string
  initialSection?: ServerSettingsSection
  initialSelection?: StructureSelection
  onClose: () => void
}

export function ServerSettingsModal({
  open,
  serverId,
  initialSection,
  initialSelection,
  onClose,
}: Props) {
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

  const [section, setSection] = useState<ServerSettingsSection>('overview')
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
  const [channelFontKeyDraft, setChannelFontKeyDraft] = useState('k2d')
  const [channelFontWeightDraft, setChannelFontWeightDraft] = useState(700)
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
  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => (a.isDefault === b.isDefault ? b.position - a.position : a.isDefault ? 1 : -1)),
    [roles],
  )
  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => (a.nickname ?? a.user.username).localeCompare(b.nickname ?? b.user.username)),
    [members],
  )

  const myMember = useMemo(() => members.find((member) => member.userId === user?.id), [members, user?.id])
  const myRoles = myMember?.roles ?? []
  const isOwner = Boolean(user && server && user.id === server.ownerId)
  const canManageServer = isOwner || myRoles.some((role) => hasPermission(role.permissions, 'MANAGE_SERVER'))
  const canManageChannels = isOwner || myRoles.some((role) => hasPermission(role.permissions, 'MANAGE_CHANNELS'))
  const canManageRoles = isOwner || myRoles.some((role) => hasPermission(role.permissions, 'MANAGE_ROLES'))
  const canKickMembers = isOwner || myRoles.some((role) => hasPermission(role.permissions, 'KICK_MEMBERS'))
  const canBanMembers = isOwner || myRoles.some((role) => hasPermission(role.permissions, 'BAN_MEMBERS'))
  const canManageMembers = canManageRoles || canKickMembers || canBanMembers
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
    if (!open) return
    setSection(initialSection ?? 'overview')
    setSelection(initialSelection ?? null)
  }, [initialSection, initialSelection, open])

  useEffect(() => {
    if (selectedChannel) {
      setChannelNameDraft(selectedChannel.name ?? '')
      setChannelTopicDraft(selectedChannel.topic ?? '')
      setChannelCategoryDraft(selectedChannel.categoryId)
      setChannelIconDraft(selectedChannel.iconKey ?? 'hash')
      setChannelFontKeyDraft(selectedChannel.fontKey ?? 'k2d')
      setChannelFontWeightDraft(selectedChannel.fontWeight ?? 700)
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

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

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

  const handleImportFromGiphy = async (url: string) => {
    const response = await fetch(url.trim())
    const blob = await response.blob()
    const formData = new FormData()
    const field = mediaPickerTarget === 'icon' ? 'icon' : 'banner'
    formData.append(field, new File([blob], `${field}.gif`, { type: blob.type }))

    await updateSection(async () => {
      if (mediaPickerTarget === 'icon') {
        const result = await serversApi.uploadIcon(serverId, formData)
        upsertServer({ ...server!, iconUrl: result.data.iconUrl })
      } else if (mediaPickerTarget === 'banner') {
        const result = await serversApi.uploadBanner(serverId, formData)
        upsertServer({ ...server!, bannerUrl: result.data.bannerUrl })
      }
      setSuccess('Medio actualizado.')
      setMediaPickerTarget(null)
    }, 'No se pudo importar la imagen.')
  }

  if (!open || !server || !canOpen) return null

  let content = null
  const canSaveOverview = canManageServer && (
    nameDraft.trim() !== server.name
    || (descriptionDraft.trim() || '') !== (server.description ?? '')
    || inviteCodeDraft.trim() !== server.inviteCode
  )
  const handleSave = section === 'overview'
    ? () => void updateSection(async () => {
      const nextName = nameDraft.trim()
      const nextDescription = descriptionDraft.trim() || null
      const nextInviteCode = inviteCodeDraft.trim()
      const response = await serversApi.update(serverId, {
        name: nextName,
        description: nextDescription,
        inviteCode: nextInviteCode,
      })
      upsertServer(response.data)
      setNameDraft(response.data.name)
      setDescriptionDraft(response.data.description ?? '')
      setInviteCodeDraft(response.data.inviteCode)
      setSuccess('Servidor actualizado.')
      await refreshAll()
    }, 'No se pudo actualizar el servidor.')
    : () => {}

  if (section === 'overview') {
    content = (
      <ServerSettingsModalOverviewSection
        server={server}
        nameDraft={nameDraft}
        descriptionDraft={descriptionDraft}
        inviteCodeDraft={inviteCodeDraft}
        isOwner={isOwner}
        canManageServer={canManageServer}
        sectionBusy={sectionBusy}
        onNameChange={setNameDraft}
        onDescriptionChange={setDescriptionDraft}
        onInviteCodeChange={setInviteCodeDraft}
        onOpenMediaPicker={setMediaPickerTarget}
      />
    )
  } else if (section === 'channels') {
    content = (
      <ServerSettingsModalChannelsSection
        sortedCategories={sortedCategories}
        sortedChannels={sortedChannels}
        sortedRoles={sortedRoles}
        sortedMembers={sortedMembers}
        selectedCategory={selectedCategory}
        selectedChannel={selectedChannel}
        canManageChannels={canManageChannels}
        canManageRoles={canManageRoles}
        sectionBusy={sectionBusy}
        createCategoryName={createCategoryName}
        createChannelName={createChannelName}
        createChannelType={createChannelType}
        createChannelCategoryId={createChannelCategoryId}
        categoryNameDraft={categoryNameDraft}
        channelNameDraft={channelNameDraft}
        channelTopicDraft={channelTopicDraft}
        channelCategoryDraft={channelCategoryDraft}
        channelIconDraft={channelIconDraft}
        channelFontKeyDraft={channelFontKeyDraft}
        channelFontWeightDraft={channelFontWeightDraft}
        overwriteDrafts={overwriteDrafts}
        onSelectionChange={setSelection}
        onCreateCategoryNameChange={setCreateCategoryName}
        onCreateChannelNameChange={setCreateChannelName}
        onCreateChannelTypeChange={setCreateChannelType}
        onCreateChannelCategoryIdChange={setCreateChannelCategoryId}
        onCategoryNameDraftChange={setCategoryNameDraft}
        onChannelNameDraftChange={setChannelNameDraft}
        onChannelTopicDraftChange={setChannelTopicDraft}
        onChannelCategoryDraftChange={setChannelCategoryDraft}
        onChannelIconDraftChange={setChannelIconDraft}
        onChannelFontKeyDraftChange={setChannelFontKeyDraft}
        onChannelFontWeightDraftChange={setChannelFontWeightDraft}
        onOverwriteDraftsChange={setOverwriteDrafts}
        onCreateCategory={() => void updateSection(async () => {
          await serversApi.createCategory(serverId, { name: createCategoryName.trim() })
          setCreateCategoryName('')
          await refreshAll()
          setSuccess('Categoria creada.')
        }, 'No se pudo crear la categoria.')}
        onCreateChannel={() => void updateSection(async () => {
          await channelsApi.create(serverId, {
            name: createChannelName.trim(),
            type: createChannelType,
            categoryId: createChannelCategoryId,
          })
          setCreateChannelName('')
          await refreshAll()
          setSuccess('Canal creado.')
        }, 'No se pudo crear el canal.')}
        onSaveCategory={() => void updateSection(async () => {
          if (!selectedCategory) return
          await serversApi.updateCategory(selectedCategory.id, { name: categoryNameDraft.trim() })
          await refreshAll()
          setSuccess('Categoria actualizada.')
        }, 'No se pudo actualizar la categoria.')}
        onDeleteCategory={() => void updateSection(async () => {
          if (!selectedCategory) return
          await serversApi.deleteCategory(selectedCategory.id)
          setSelection(null)
          await refreshAll()
          setSuccess('Categoria eliminada.')
        }, 'No se pudo eliminar la categoria.')}
        onSaveChannel={() => void updateSection(async () => {
          if (!selectedChannel) return
          const response = await channelsApi.update(selectedChannel.id, {
            name: channelNameDraft.trim(),
            topic: channelTopicDraft.trim() || null,
            categoryId: channelCategoryDraft,
            iconKey: channelIconDraft,
            fontKey: channelFontKeyDraft,
            fontWeight: channelFontWeightDraft,
          })
          upsertChannel(response.data)
          await refreshAll()
          setSuccess('Canal actualizado.')
        }, 'No se pudo actualizar el canal.')}
        onDeleteChannel={() => void updateSection(async () => {
          if (!selectedChannel) return
          await channelsApi.delete(selectedChannel.id)
          removeChannel(selectedChannel.id)
          setSelection(null)
          await refreshAll()
          setSuccess('Canal eliminado.')
        }, 'No se pudo eliminar el canal.')}
        onSaveOverwrites={() => void updateSection(async () => {
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
        }, 'No se pudieron guardar los overwrites.')}
      />
    )
  } else if (section === 'roles') {
    content = (
      <ServerSettingsModalRolesSection
        sortedRoles={sortedRoles}
        selectedRole={selectedRole}
        creatingRole={creatingRole}
        roleNameDraft={roleNameDraft}
        roleColorDraft={roleColorDraft}
        rolePermissionsDraft={rolePermissionsDraft}
        canManageRoles={canManageRoles}
        sectionBusy={sectionBusy}
        onStartCreateRole={() => {
          setCreatingRole(true)
          setSelectedRoleId(null)
          setRoleNameDraft('')
          setRoleColorDraft('#5865f2')
          setRolePermissionsDraft(['VIEW_CHANNEL', 'SEND_MESSAGES', 'ADD_REACTIONS', 'ATTACH_FILES', 'READ_MESSAGE_HISTORY'])
        }}
        onSelectedRoleChange={setSelectedRoleId}
        onRoleNameDraftChange={setRoleNameDraft}
        onRoleColorDraftChange={setRoleColorDraft}
        onRolePermissionsDraftChange={setRolePermissionsDraft}
        onSaveRole={() => void updateSection(async () => {
          if (creatingRole) {
            const response = await serversApi.createRole(serverId, {
              name: roleNameDraft.trim(),
              color: hexToColor(roleColorDraft),
              permissions: bitsFromPermissions(rolePermissionsDraft),
            })
            upsertRole(response.data)
            setSelectedRoleId(response.data.id)
            setCreatingRole(false)
            setSuccess('Rol creado.')
          } else if (selectedRole) {
            const response = await serversApi.updateRole(selectedRole.id, {
              name: roleNameDraft.trim(),
              color: hexToColor(roleColorDraft),
              permissions: bitsFromPermissions(rolePermissionsDraft),
            })
            upsertRole(response.data)
            setSuccess('Rol actualizado.')
          }
          await refreshAll()
        }, creatingRole ? 'No se pudo crear el rol.' : 'No se pudo actualizar el rol.')}
        onDeleteRole={() => void updateSection(async () => {
          if (!selectedRole) return
          await serversApi.deleteRole(selectedRole.id)
          removeRole(selectedRole.id)
          setSelectedRoleId(null)
          await refreshAll()
          setSuccess('Rol eliminado.')
        }, 'No se pudo eliminar el rol.')}
      />
    )
  } else if (section === 'members') {
    content = (
      <ServerSettingsModalMembersSection
        server={server}
        sortedMembers={sortedMembers}
        sortedRoles={sortedRoles}
        selectedMember={selectedMember}
        memberRoleIdsDraft={memberRoleIdsDraft}
        banReasonDraft={banReasonDraft}
        canManageRoles={canManageRoles}
        canKickMembers={canKickMembers}
        canBanMembers={canBanMembers}
        sectionBusy={sectionBusy}
        onSelectedMemberChange={setSelectedMemberId}
        onMemberRoleIdsDraftChange={setMemberRoleIdsDraft}
        onBanReasonDraftChange={setBanReasonDraft}
        onSaveMemberRoles={() => void updateSection(async () => {
          if (!selectedMember) return
          const response = await serversApi.replaceMemberRoles(serverId, selectedMember.userId, memberRoleIdsDraft)
          upsertMember(response.data)
          await refreshAll()
          setSuccess('Roles del miembro actualizados.')
        }, 'No se pudieron actualizar los roles del miembro.')}
        onKickMember={() => void updateSection(async () => {
          if (!selectedMember) return
          await serversApi.kickMember(serverId, selectedMember.userId)
          removeMember(serverId, selectedMember.userId)
          setSelectedMemberId(null)
          await refreshAll()
          setSuccess('Miembro expulsado.')
        }, 'No se pudo expulsar al miembro.')}
        onBanMember={() => void updateSection(async () => {
          if (!selectedMember) return
          await serversApi.banMember(serverId, {
            userId: selectedMember.userId,
            reason: banReasonDraft.trim() || null,
          })
          removeMember(serverId, selectedMember.userId)
          setSelectedMemberId(null)
          await refreshAll()
          setSuccess('Miembro baneado.')
        }, 'No se pudo banear al miembro.')}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-[var(--modal-scrim)] p-4" onClick={onClose}>
      <div
        className="flex h-[min(92vh,790px)] w-full max-w-6xl overflow-hidden rounded-3xl border border-[var(--b1)] bg-[var(--s3)] shadow-[var(--panel-shadow)]"
        onClick={(event) => event.stopPropagation()}
      >
        <ServerSettingsModalSidebar
          server={server}
          activeView={section}
          canManageChannels={canManageChannels}
          canManageRoles={canManageRoles}
          canManageMembers={canManageMembers}
          onViewChange={setSection}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <ServerSettingsModalHeader activeView={section} serverName={server.name} onClose={onClose} />
          <div className="scrollable flex-1 p-4 sm:p-6">{content}</div>
          <ServerSettingsModalFooter
            error={error}
            success={success}
            isSaving={sectionBusy}
            canSave={section === 'overview' ? canSaveOverview : false}
            onClose={onClose}
            onSave={handleSave}
          />
        </div>
      </div>

      <input
        ref={iconInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={(event) => void handleUploadMedia(event, 'icon')}
      />
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={(event) => void handleUploadMedia(event, 'banner')}
      />
      <MediaSourcePickerModal
        open={mediaPickerTarget !== null}
        title={mediaPickerTarget === 'icon' ? 'Cambiar icono del servidor' : 'Cambiar banner del servidor'}
        isBusy={sectionBusy}
        onClose={() => setMediaPickerTarget(null)}
        onPickLocal={() => {
          if (mediaPickerTarget === 'icon') iconInputRef.current?.click()
          if (mediaPickerTarget === 'banner') bannerInputRef.current?.click()
          setMediaPickerTarget(null)
        }}
        onPickGiphy={handleImportFromGiphy}
      />
    </div>
  )
}
