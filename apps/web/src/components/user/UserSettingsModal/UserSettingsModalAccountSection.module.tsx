'use client'

import { type ChangeEvent, type RefObject } from 'react'
import { Camera, ImagePlus, LoaderCircle, Mail, Sparkles, UserRound } from 'lucide-react'
import { cn } from '@/lib/cn'
import { resolveMediaUrl } from '@/lib/api'
import type { User } from '@/lib/types'
import { getUserHandle } from '@/lib/users/displayName.shared'
import {
  getUserDecorationToneColors,
  UserDecorationBackdrop,
  useUserDecorationPresentation,
} from '../UserDecorationBackdrop.module'
import { UserAvatar } from '../UserAvatar'
import { Field, ProfileRow, SettingBlock } from '../UserSettingsParts'

interface UserSettingsModalAccountSectionProps {
  user: User
  displayName: string
  username: string
  email: string
  isUploadingAvatar: boolean
  isUploadingDecoration: boolean
  isUploadingBanner: boolean
  avatarInputRef: RefObject<HTMLInputElement | null>
  decorationInputRef: RefObject<HTMLInputElement | null>
  bannerInputRef: RefObject<HTMLInputElement | null>
  onOpenMediaPicker: (target: 'avatar' | 'avatarDecoration' | 'banner') => void
  onAvatarFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onDecorationFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onBannerFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onDisplayNameChange: (value: string) => void
  onUsernameChange: (value: string) => void
  onEmailChange: (value: string) => void
}

export function UserSettingsModalAccountSection({
  user,
  displayName,
  username,
  email,
  isUploadingAvatar,
  isUploadingDecoration,
  isUploadingBanner,
  avatarInputRef,
  decorationInputRef,
  bannerInputRef,
  onOpenMediaPicker,
  onAvatarFileChange,
  onDecorationFileChange,
  onBannerFileChange,
  onDisplayNameChange,
  onUsernameChange,
  onEmailChange,
}: UserSettingsModalAccountSectionProps) {
  const effectiveDisplayName = displayName.trim() || user.displayName || user.username
  const effectiveUsername = username.trim() || user.username
  const decorationPresentation = useUserDecorationPresentation(user.avatarDecorationUrl)
  const decorationColors = decorationPresentation
    ? getUserDecorationToneColors(decorationPresentation.tone)
    : null

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="overflow-hidden rounded-2xl border border-[var(--b1)] bg-[var(--s3)]">
        <div className="relative h-44 border-b border-[var(--b1)] bg-[var(--s2)]">
          {user.bannerUrl ? (
            <img
              src={resolveMediaUrl(user.bannerUrl)}
              alt="Banner"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(135deg,rgba(122,149,255,0.5),rgba(129,83,255,0.35),rgba(23,25,31,0.95))]" />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(12,14,18,0.82))]" />
          <div className="absolute bottom-4 left-4 flex items-end gap-3">
            <div className="relative">
              <UserAvatar
                user={{ ...user, displayName: effectiveDisplayName }}
                size={82}
                showStatus
                className="border-4 border-[var(--s3)]"
              />
              <button
                type="button"
                onClick={() => onOpenMediaPicker('avatar')}
                className="bg-ember absolute -bottom-1 -right-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ember-contrast)] transition-opacity hover:opacity-90"
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <Camera size={15} />
                )}
              </button>
            </div>
            <div className="pb-1">
              <p className="font-display font-800 text-xl text-white">{effectiveDisplayName}</p>
              <p className="text-sm text-white/75">
                {getUserHandle({ username: effectiveUsername })}
              </p>
            </div>
          </div>
          <div className="absolute right-4 top-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenMediaPicker('avatarDecoration')}
              className="font-700 inline-flex items-center gap-2 rounded-lg border border-[var(--b2)] bg-[var(--surface-overlay)] px-3 py-1.5 text-xs text-[var(--t0)] transition-colors hover:bg-[var(--surface-overlay-hover)]"
              disabled={isUploadingDecoration}
            >
              {isUploadingDecoration ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              Decoracion
            </button>
            <button
              type="button"
              onClick={() => onOpenMediaPicker('banner')}
              className="font-700 inline-flex items-center gap-2 rounded-lg border border-[var(--b2)] bg-[var(--surface-overlay)] px-3 py-1.5 text-xs text-[var(--t0)] transition-colors hover:bg-[var(--surface-overlay-hover)]"
              disabled={isUploadingBanner}
            >
              {isUploadingBanner ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <ImagePlus size={14} />
              )}
              Banner
            </button>
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="hidden"
            onChange={onAvatarFileChange}
          />
          <input
            ref={decorationInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="hidden"
            onChange={onDecorationFileChange}
          />
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="hidden"
            onChange={onBannerFileChange}
          />
        </div>

        <div className="space-y-3 p-4">
          <ProfileRow label="Nombre para mostrar" value={effectiveDisplayName}>
            <button
              type="button"
              className="font-700 rounded-lg bg-[var(--surface-soft)] px-3 py-1.5 text-xs text-[var(--t1)] transition-colors hover:bg-[var(--surface-soft-hover)]"
            >
              Editar
            </button>
          </ProfileRow>
          <ProfileRow label="Nombre de usuario" value={effectiveUsername}>
            <button
              type="button"
              className="font-700 rounded-lg bg-[var(--surface-soft)] px-3 py-1.5 text-xs text-[var(--t1)] transition-colors hover:bg-[var(--surface-soft-hover)]"
            >
              Editar
            </button>
          </ProfileRow>
          <ProfileRow label="Correo electrónico" value={email || user.email}>
            <button
              type="button"
              className="font-700 rounded-lg bg-[var(--surface-soft)] px-3 py-1.5 text-xs text-[var(--t1)] transition-colors hover:bg-[var(--surface-soft-hover)]"
            >
              Editar
            </button>
          </ProfileRow>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-5">
          <SettingBlock
            icon={<UserRound size={16} />}
            title="Perfil"
            description="Actualiza los datos principales de tu cuenta."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre visible">
                <input
                  value={displayName}
                  onChange={(event) => onDisplayNameChange(event.target.value)}
                  className="input-base h-11 rounded-xl bg-[var(--s2)] text-sm"
                  maxLength={48}
                />
                <p className="mt-1 text-[11px] text-[var(--t4)]">
                  Este es el nombre que se muestra en perfiles, mensajes y vistas generales.
                </p>
              </Field>

              <Field label="Username">
                <input
                  value={username}
                  onChange={(event) => onUsernameChange(event.target.value)}
                  className="input-base h-11 rounded-xl bg-[var(--s2)] text-sm"
                  maxLength={32}
                />
                <p className="mt-1 text-[11px] text-[var(--t4)]">
                  Se usa para menciones, handle y busqueda interna.
                </p>
              </Field>
            </div>

            <Field label="Correo">
              <div className="relative">
                <Mail
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--t4)]"
                />
                <input
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  className="input-base h-11 rounded-xl bg-[var(--s2)] pl-12 pr-3 text-sm"
                  type="email"
                />
              </div>
            </Field>
          </SettingBlock>
        </section>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-[var(--b1)] bg-[var(--s2)] p-4">
            <p className="font-700 text-xs uppercase tracking-[0.16em] text-[var(--t4)]">
              Vista previa
            </p>
            <div
              className={cn(
                'relative mt-4 overflow-hidden rounded-2xl border border-[var(--b1)] bg-[var(--s0)] p-4',
                decorationPresentation?.tone === 'dark' &&
                  'border-white/20 bg-[rgba(214,226,255,0.16)] shadow-[0_12px_28px_rgba(46,66,112,0.14)]',
                decorationPresentation?.tone === 'light' &&
                  'border-white/10 bg-[rgba(17,24,40,0.84)] shadow-[0_12px_28px_rgba(3,8,16,0.32)]'
              )}
            >
              <UserDecorationBackdrop
                src={user.avatarDecorationUrl}
                className="rounded-2xl"
                {...(decorationPresentation ? { presentation: decorationPresentation } : {})}
              />
              <div className="relative z-10 flex items-center gap-3">
                <UserAvatar
                  user={{ ...user, username: effectiveUsername, displayName: effectiveDisplayName }}
                  size={56}
                  showStatus
                />
                <div className="min-w-0">
                  <p
                    className="font-display font-700 truncate text-lg text-[var(--t0)]"
                    style={decorationColors ? { color: decorationColors.title } : undefined}
                  >
                    {effectiveDisplayName}
                  </p>
                  <p
                    className="truncate text-sm text-[var(--t3)]"
                    style={
                      decorationColors ? { color: decorationColors.subtitleStrong } : undefined
                    }
                  >
                    {getUserHandle({ username: effectiveUsername })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--b1)] bg-[var(--s2)] p-4">
            <p className="font-700 text-xs uppercase tracking-[0.16em] text-[var(--t4)]">
              Archivos
            </p>
            <div className="mt-3 space-y-3 text-sm text-[var(--t2)]">
              <div className="rounded-xl border border-[var(--b1)] bg-[var(--s0)] px-3 py-3">
                Foto de perfil, decoracion y banner se suben al servidor y se aplican de inmediato.
              </div>
              <div className="rounded-xl border border-[var(--b1)] bg-[var(--s0)] px-3 py-3">
                Las decoraciones aceptan JPG, PNG, WEBP o GIF para crear una franja animada como la
                de tu ejemplo.
              </div>
              <div className="rounded-xl border border-[var(--b1)] bg-[var(--s0)] px-3 py-3">
                Los cambios de username, correo y contrasena se guardan al presionar{' '}
                <span className="font-700 text-[var(--t0)]">Guardar cambios</span>.
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
