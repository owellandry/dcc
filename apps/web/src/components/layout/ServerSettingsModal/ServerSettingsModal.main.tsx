'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  Camera,
  Folder,
  Globe2,
  Hash,
  ImagePlus,
  Link2,
  LoaderCircle,
  Lock,
  Save,
  Search,
  Shield,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { ApiRequestError, resolveMediaUrl, serversApi } from '@/lib/api'
import type { Server } from '@/lib/types'
import { cn } from '@/lib/cn'
import { hasPermission } from '@/lib/permissions'
import { useAuthStore } from '@/stores/authStore'
import { useServerCategories, useServerChannels, useServerMembers, useServersStore } from '@/stores/serversStore'
import { MediaSourcePickerModal } from '@/components/user/MediaSourcePickerModal'
import { Field, ProfileRow, SettingBlock, SettingsNavItem } from '@/components/user/UserSettingsParts'

interface Props {
  open: boolean
  serverId: string
  onClose: () => void
}

type MediaTarget = 'icon' | 'banner'

function getRequestMessage(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) {
    if (error.status === 403) {
      return 'No tienes permisos para cambiar esta configuracion.'
    }
    return error.message
  }
  return fallback
}

export function ServerSettingsModal({ open, serverId, onClose }: Props) {
  const user = useAuthStore((s) => s.user)
  const server = useServersStore((s) => s.servers[serverId])
  const upsertServer = useServersStore((s) => s.upsertServer)
  const channels = useServerChannels(serverId)
  const categories = useServerCategories(serverId)
  const members = useServerMembers(serverId)

  const iconInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const [copied, setCopied] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [isPublicDraft, setIsPublicDraft] = useState(false)
  const [inviteCodeDraft, setInviteCodeDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingIcon, setIsUploadingIcon] = useState(false)
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)
  const [mediaPickerTarget, setMediaPickerTarget] = useState<MediaTarget | null>(null)

  const isOwner = Boolean(user && server && user.id === server.ownerId)
  const myMember = useMemo(
    () => members.find((member) => member.userId === user?.id),
    [members, user?.id]
  )
  const canManageServer =
    isOwner || (myMember?.roles.some((role) => hasPermission(role.permissions, 'MANAGE_SERVER')) ?? false)
  const textChannels = useMemo(
    () => channels.filter((channel) => channel.type === 'text').sort((a, b) => a.position - b.position),
    [channels]
  )
  const inviteBaseUrl = typeof window === 'undefined' ? 'http://localhost:3000' : window.location.origin
  const normalizedInviteCode = inviteCodeDraft.trim().toLowerCase()
  const inviteUrl = normalizedInviteCode
    ? `${inviteBaseUrl}/invite/${normalizedInviteCode}`
    : `${inviteBaseUrl}/invite/${server?.inviteCode ?? ''}`
  const iconUrl = server?.iconUrl ? resolveMediaUrl(server.iconUrl) : null
  const bannerUrl = server?.bannerUrl ? resolveMediaUrl(server.bannerUrl) : null
  const initials = (server?.name ?? 'SV')
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
  const ownerLabel = useMemo(() => {
    const ownerMember = members.find((member) => member.userId === server?.ownerId)
    return ownerMember?.user.username ?? server?.ownerId.slice(0, 8) ?? 'unknown'
  }, [members, server?.ownerId])

  useEffect(() => {
    if (!open || !server) return
    setNameDraft(server.name)
    setDescriptionDraft(server.description ?? '')
    setIsPublicDraft(server.isPublic)
    setInviteCodeDraft(server.inviteCode)
    setCopied(false)
    setError(null)
    setSuccess(null)
  }, [open, server])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open || canManageServer) return
    onClose()
  }, [canManageServer, onClose, open])

  const applyServerPatch = (patch: Partial<Pick<Server, 'iconUrl' | 'bannerUrl'>>) => {
    const latest = useServersStore.getState().servers[serverId]
    if (!latest) return
    upsertServer({ ...latest, ...patch })
  }

  const uploadIcon = async (formData: FormData) => {
    const response = await serversApi.uploadIcon(serverId, formData)
    applyServerPatch({ iconUrl: response.data.iconUrl })
    setSuccess('Icono del servidor actualizado.')
  }

  const uploadBanner = async (formData: FormData) => {
    const response = await serversApi.uploadBanner(serverId, formData)
    applyServerPatch({ bannerUrl: response.data.bannerUrl })
    setSuccess('Banner del servidor actualizado.')
  }

  const resolveGiphyUrl = (raw: string) => {
    const url = raw.trim()
    const embedMatch = url.match(/giphy\.com\/embed\/([a-zA-Z0-9]+)/)
    if (embedMatch?.[1]) return `https://media.giphy.com/media/${embedMatch[1]}/giphy.gif`

    const gifMatch = url.match(/giphy\.com\/gifs\/[^/]*-([a-zA-Z0-9]+)(?:$|[/?#])/)
    if (gifMatch?.[1]) return `https://media.giphy.com/media/${gifMatch[1]}/giphy.gif`

    return url
  }

  const uploadFromGiphy = async (target: MediaTarget, rawUrl: string) => {
    const finalUrl = resolveGiphyUrl(rawUrl)
    const isIcon = target === 'icon'
    const setLoading = isIcon ? setIsUploadingIcon : setIsUploadingBanner
    const fieldName = isIcon ? 'icon' : 'banner'

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(finalUrl)
      if (!response.ok) {
        throw new Error('REMOTE_FETCH_FAILED')
      }

      const blob = await response.blob()
      if (!blob.type.startsWith('image/')) {
        throw new Error('INVALID_IMAGE')
      }

      const extension = blob.type.split('/')[1] ?? 'gif'
      const fileName = `${fieldName}-giphy.${extension}`
      const formData = new FormData()
      formData.append(fieldName, new File([blob], fileName, { type: blob.type }))

      if (isIcon) {
        await uploadIcon(formData)
      } else {
        await uploadBanner(formData)
      }

      setMediaPickerTarget(null)
    } catch (uploadError) {
      setError(getRequestMessage(uploadError, 'No se pudo descargar la imagen desde Giphy.'))
      throw uploadError
    } finally {
      setLoading(false)
    }
  }

  const handleIconFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingIcon(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      formData.append('icon', file)
      await uploadIcon(formData)
    } catch (uploadError) {
      setError(getRequestMessage(uploadError, 'No se pudo subir el icono del servidor.'))
    } finally {
      setIsUploadingIcon(false)
      event.target.value = ''
    }
  }

  const handleBannerFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingBanner(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      formData.append('banner', file)
      await uploadBanner(formData)
    } catch (uploadError) {
      setError(getRequestMessage(uploadError, 'No se pudo subir el banner del servidor.'))
    } finally {
      setIsUploadingBanner(false)
      event.target.value = ''
    }
  }

  const handleSave = async () => {
    if (!server) return
    if (!canManageServer) {
      setError('No tienes permisos para guardar cambios en este servidor.')
      setSuccess(null)
      return
    }

    const nextName = nameDraft.trim()
    if (!nextName) {
      setError('El nombre del servidor no puede estar vacio.')
      setSuccess(null)
      return
    }

    const nextInviteCode = inviteCodeDraft.trim().toLowerCase()
    if (!nextInviteCode) {
      setError('La URL de invitacion no puede estar vacia.')
      setSuccess(null)
      return
    }
    if (nextInviteCode.length < 3 || nextInviteCode.length > 32) {
      setError('La URL de invitacion debe tener entre 3 y 32 caracteres.')
      setSuccess(null)
      return
    }
    if (!/^[a-z0-9_-]+$/.test(nextInviteCode)) {
      setError('La URL de invitacion solo permite letras, numeros, guion y guion bajo.')
      setSuccess(null)
      return
    }

    setError(null)
    setSuccess(null)
    setIsSaving(true)

    try {
      const response = await serversApi.update(serverId, {
        name: nextName,
        description: descriptionDraft.trim() ? descriptionDraft.trim() : null,
        isPublic: isPublicDraft,
        inviteCode: nextInviteCode,
      })
      upsertServer(response.data)
      setSuccess('Ajustes del servidor guardados.')
    } catch (saveError) {
      setError(getRequestMessage(saveError, 'No se pudo guardar la configuracion del servidor.'))
    } finally {
      setIsSaving(false)
    }
  }

  if (!open || !server || !canManageServer) return null

  const isMediaPickerBusy = isUploadingIcon || isUploadingBanner

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-[var(--modal-scrim)] p-4" onClick={onClose}>
      <div
        className="flex h-[min(92vh,790px)] w-full max-w-6xl overflow-hidden rounded-3xl border border-[var(--b1)] bg-[var(--s3)] shadow-[var(--panel-shadow)]"
        onClick={(event) => event.stopPropagation()}
      >
        <aside className="hidden w-[260px] shrink-0 border-r border-[var(--b1)] bg-[var(--s1)] p-4 lg:block">
          <div className="flex items-center gap-3 rounded-xl bg-[var(--s1)] px-3 py-2.5">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--s3)]">
              {iconUrl ? (
                <img src={iconUrl} alt={server.name} className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-sm font-800 text-[var(--t0)]">{initials}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-700 text-[var(--t0)]">{server.name}</p>
              <p className="text-xs text-[var(--t3)]">Editar servidor</p>
            </div>
          </div>

          <div className="relative mt-3">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t4)]" />
            <input
              className="h-9 w-full rounded-lg border border-[var(--b1)] bg-[var(--s2)] pl-9 pr-3 text-[13px] text-[var(--t2)] outline-none transition-colors focus:border-[var(--b2)]"
              placeholder="Buscar"
              disabled
            />
          </div>

          <p className="mt-4 px-2 text-[11px] font-700 uppercase tracking-[0.16em] text-[var(--t4)]">Ajustes del servidor</p>
          <div className="mt-2 space-y-1">
            <SettingsNavItem icon={<Shield size={15} />} label="Vision general" active />
            <SettingsNavItem icon={<ImagePlus size={15} />} label="Marca y apariencia" />
            <SettingsNavItem icon={<Hash size={15} />} label="Canales" />
            <SettingsNavItem icon={<Users size={15} />} label="Miembros" />
          </div>

          <p className="mt-5 px-2 text-[11px] font-700 uppercase tracking-[0.16em] text-[var(--t4)]">Acceso</p>
          <div className="mt-2 space-y-1">
            <SettingsNavItem icon={<Link2 size={15} />} label="Invitaciones" />
            <SettingsNavItem icon={isPublicDraft ? <Globe2 size={15} /> : <Lock size={15} />} label={isPublicDraft ? 'Servidor publico' : 'Servidor privado'} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-[var(--b1)] px-5 py-4 sm:px-6">
            <h2 className="font-display text-[19px] font-700 text-[var(--t0)]">Ajustes del servidor</h2>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-[var(--t3)] transition-colors hover:bg-[var(--surface-soft-hover)] hover:text-[var(--t0)]"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex items-center gap-6 border-b border-[var(--b1)] px-6 pt-4">
            <button className="border-b-2 border-[#6f8bff] pb-3 text-sm font-700 text-[#b8c5ff]">Identidad</button>
            <button className="pb-3 text-sm font-700 text-[var(--t4)] transition-colors hover:text-[var(--t2)]">Control</button>
          </div>

          <div className="scrollable flex-1 p-4 sm:p-6">
            <div className="mx-auto max-w-4xl space-y-6">
              <div className="overflow-hidden rounded-2xl border border-[var(--b1)] bg-[var(--s3)]">
                <div className="relative h-44 border-b border-[var(--b1)] bg-[var(--s2)]">
                  {bannerUrl ? (
                    <img src={bannerUrl} alt={`${server.name} banner`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-[linear-gradient(135deg,rgba(122,149,255,0.5),rgba(129,83,255,0.35),rgba(23,25,31,0.95))]" />
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(12,14,18,0.82))]" />
                  <div className="absolute bottom-4 left-4 flex items-end gap-3">
                    <div className="relative h-[82px] w-[82px]">
                      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-4 border-[var(--s3)] bg-[var(--s3)]">
                        {iconUrl ? (
                          <img src={iconUrl} alt={server.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="font-display text-2xl font-800 text-[var(--t0)]">{initials}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setMediaPickerTarget('icon')}
                        className="absolute -bottom-1 -right-1 z-[60] inline-flex h-9 w-9 items-center justify-center rounded-lg bg-ember text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isUploadingIcon || !isOwner}
                        title={isOwner ? 'Cambiar icono' : 'Solo el propietario puede cambiar el icono'}
                      >
                        {isUploadingIcon ? <LoaderCircle size={15} className="animate-spin" /> : <Camera size={15} />}
                      </button>
                    </div>
                    <div className="pb-1">
                      <p className="font-display text-xl font-800 text-white">{server.name}</p>
                      <p className="text-sm text-white/75">
                        {isPublicDraft ? 'Servidor publico' : 'Servidor privado'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMediaPickerTarget('banner')}
                    className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-lg bg-[var(--surface-overlay)] px-3 py-1.5 text-xs font-700 text-white transition-colors hover:bg-[var(--surface-overlay-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isUploadingBanner || !isOwner}
                    title={isOwner ? 'Cambiar banner' : 'Solo el propietario puede cambiar el banner'}
                  >
                    {isUploadingBanner ? <LoaderCircle size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                    Cambiar banner
                  </button>
                  <input
                    ref={iconInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className="hidden"
                    onChange={handleIconFile}
                  />
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className="hidden"
                    onChange={handleBannerFile}
                  />
                </div>

                <div className="space-y-3 p-4">
                  <ProfileRow label="Propietario" value={ownerLabel}>
                    <span className="rounded-lg bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-700 text-[var(--t1)]">
                      {isOwner ? 'Tu servidor' : 'Gestion por rol'}
                    </span>
                  </ProfileRow>
                  <ProfileRow label="Tipo" value={isPublicDraft ? 'Publico' : 'Privado'}>
                    <span className="rounded-lg bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-700 text-[var(--t1)]">
                      {isPublicDraft ? 'Visible' : 'Restringido'}
                    </span>
                  </ProfileRow>
                  <ProfileRow label="Invitacion" value={inviteUrl || server.inviteCode}>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(inviteUrl)
                          setCopied(true)
                          window.setTimeout(() => setCopied(false), 1200)
                        } catch {
                          setCopied(false)
                        }
                      }}
                      className="rounded-lg bg-white/8 px-3 py-1.5 text-xs font-700 text-[var(--t1)] transition-colors hover:bg-white/15"
                    >
                      {copied ? 'Copiado' : 'Copiar'}
                    </button>
                  </ProfileRow>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <section className="space-y-5">
                  <SettingBlock
                    icon={<Shield size={16} />}
                    title="Perfil del servidor"
                    description="Ajusta el nombre, la descripcion y la visibilidad general."
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Nombre del servidor">
                        <input
                          value={nameDraft}
                          onChange={(event) => setNameDraft(event.target.value)}
                          maxLength={100}
                          className="h-11 w-full rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none transition-colors focus:border-[var(--b2)] disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={!canManageServer || isSaving}
                        />
                      </Field>

                      <Field label="Visibilidad">
                        <button
                          type="button"
                          onClick={() => setIsPublicDraft((prev) => !prev)}
                          className={cn(
                            'flex h-11 w-full items-center justify-between rounded-xl border px-3 text-sm font-700 outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                            isPublicDraft
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                              : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                          )}
                          disabled={!canManageServer || isSaving}
                        >
                          <span>{isPublicDraft ? 'Publico' : 'Privado'}</span>
                          {isPublicDraft ? <Globe2 size={15} /> : <Lock size={15} />}
                        </button>
                      </Field>
                    </div>

                    <Field label="Descripcion">
                      <textarea
                        value={descriptionDraft}
                        onChange={(event) => setDescriptionDraft(event.target.value)}
                        rows={4}
                        maxLength={400}
                        className="w-full resize-none rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 py-2.5 text-sm text-[var(--t1)] outline-none transition-colors focus:border-[var(--b2)] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={!canManageServer || isSaving}
                      />
                    </Field>
                  </SettingBlock>

                  <SettingBlock
                    icon={<Upload size={16} />}
                    title="Medios"
                    description="Usa los mismos flujos del perfil para cambiar icono y banner."
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-[var(--b1)] bg-[var(--s0)] p-4">
                        <p className="text-sm font-700 text-[var(--t0)]">Icono del servidor</p>
                        <p className="mt-1 text-sm text-[var(--t3)]">
                          JPG, PNG, GIF o WEBP. Tambien puedes pegar un enlace de Giphy.
                        </p>
                        <button
                          type="button"
                          onClick={() => setMediaPickerTarget('icon')}
                          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/8 px-4 py-2 text-sm font-700 text-[var(--t1)] transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={!isOwner || isUploadingIcon}
                        >
                          {isUploadingIcon ? <LoaderCircle size={14} className="animate-spin" /> : <Camera size={14} />}
                          Cambiar icono
                        </button>
                      </div>

                      <div className="rounded-xl border border-[var(--b1)] bg-[var(--s0)] p-4">
                        <p className="text-sm font-700 text-[var(--t0)]">Banner del servidor</p>
                        <p className="mt-1 text-sm text-[var(--t3)]">
                          Ideal para la cabecera del servidor. Solo el owner puede modificarlo.
                        </p>
                        <button
                          type="button"
                          onClick={() => setMediaPickerTarget('banner')}
                          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/8 px-4 py-2 text-sm font-700 text-[var(--t1)] transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={!isOwner || isUploadingBanner}
                        >
                          {isUploadingBanner ? <LoaderCircle size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                          Cambiar banner
                        </button>
                      </div>
                    </div>

                    <Field label="URL unica de invitacion">
                      <div className="flex items-center rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3">
                        <span className="shrink-0 text-xs text-[var(--t4)]">{inviteBaseUrl}/invite/</span>
                        <input
                          value={inviteCodeDraft}
                          onChange={(event) => setInviteCodeDraft(event.target.value.toLowerCase())}
                          maxLength={32}
                          className="h-11 w-full bg-transparent px-2 text-sm text-[var(--t1)] outline-none disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={!canManageServer || isSaving}
                        />
                      </div>
                    </Field>
                  </SettingBlock>
                </section>

                <aside className="space-y-5">
                  <div className="rounded-2xl border border-[var(--b1)] bg-[var(--s2)] p-4">
                    <p className="text-xs font-700 uppercase tracking-[0.16em] text-[var(--t4)]">Vista previa</p>
                    <div className="mt-4 rounded-2xl border border-[var(--b1)] bg-[var(--s0)] p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--s2)]">
                          {iconUrl ? (
                            <img src={iconUrl} alt={server.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="font-display text-lg font-800 text-[var(--t0)]">{initials}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-display text-lg font-700 text-[var(--t0)]">{nameDraft || server.name}</p>
                          <p className="truncate text-sm text-[var(--t3)]">
                            {descriptionDraft.trim() || 'Sin descripcion todavia'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[var(--b1)] bg-[var(--s2)] p-4">
                    <p className="text-xs font-700 uppercase tracking-[0.16em] text-[var(--t4)]">Resumen</p>
                    <div className="mt-3 grid gap-2">
                      <SummaryRow label="Miembros" value={String(Math.max(members.length, server.memberCount))} icon={<Users size={14} />} />
                      <SummaryRow label="Canales" value={String(textChannels.length)} icon={<Hash size={14} />} />
                      <SummaryRow label="Categorias" value={String(categories.length)} icon={<Folder size={14} />} />
                      <SummaryRow label="Acceso" value={canManageServer ? 'Edicion habilitada' : 'Solo lectura'} icon={<Shield size={14} />} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[var(--b1)] bg-[var(--s2)] p-4">
                    <p className="text-xs font-700 uppercase tracking-[0.16em] text-[var(--t4)]">Canales visibles</p>
                    <div className="mt-3 space-y-2">
                      {textChannels.slice(0, 6).map((channel) => (
                        <div
                          key={channel.id}
                          className="flex items-center justify-between rounded-xl border border-[var(--b1)] bg-[var(--s0)] px-3 py-2"
                        >
                          <p className="truncate text-sm text-[var(--t1)]">#{channel.name ?? 'canal'}</p>
                          <span className="text-xs text-[var(--t4)]">{channel.canSendMessages === false ? 'Solo lectura' : 'Activo'}</span>
                        </div>
                      ))}
                      {textChannels.length === 0 ? (
                        <div className="rounded-xl border border-[var(--b1)] bg-[var(--s0)] px-3 py-3 text-sm text-[var(--t3)]">
                          No hay canales de texto todavia.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[var(--b1)] px-6 py-4">
            <div className="min-h-[20px] text-sm">
              {error ? <p className="text-[var(--dnd)]">{error}</p> : null}
              {!error && success ? <p className="text-[var(--online)]">{success}</p> : null}
              {!error && !success && !isOwner ? (
                <p className="text-[var(--t4)]">Con este rol puedes editar ajustes generales e invitacion. Icono y banner siguen reservados al propietario.</p>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-4 py-2 text-sm font-600 text-[var(--t2)] transition-colors hover:text-[var(--t0)]"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-xl bg-ember px-4 py-2 text-sm font-700 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving || !canManageServer}
              >
                {isSaving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      </div>

      <MediaSourcePickerModal
        open={mediaPickerTarget !== null}
        title={mediaPickerTarget === 'icon' ? 'Cambiar icono del servidor' : 'Cambiar banner del servidor'}
        isBusy={isMediaPickerBusy}
        onClose={() => setMediaPickerTarget(null)}
        onPickLocal={() => {
          const ref = mediaPickerTarget === 'icon' ? iconInputRef.current : bannerInputRef.current
          ref?.click()
          setMediaPickerTarget(null)
        }}
        onPickGiphy={async (url) => {
          if (!mediaPickerTarget) return
          await uploadFromGiphy(mediaPickerTarget, url)
        }}
      />
    </div>
  )
}

function SummaryRow({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--b1)] bg-[var(--s1)] px-3 py-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-700 uppercase tracking-[0.14em] text-[var(--t4)]">{label}</p>
        <span className="text-[var(--t4)]">{icon}</span>
      </div>
      <p className="mt-1 text-sm font-700 text-[var(--t0)]">{value}</p>
    </div>
  )
}
