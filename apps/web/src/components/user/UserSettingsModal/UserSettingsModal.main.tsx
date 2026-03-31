'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ApiRequestError, usersApi } from '@/lib/api'
import { normalizeHexColor, type AppearanceDensity, type AppearanceTheme } from '@/lib/theme/appearance.shared'
import { clearMockSession, isMockSession } from '@/lib/mock-init'
import { useAuthStore } from '@/stores/authStore'
import { useAppearanceStore } from '@/stores/appearanceStore'
import { MediaSourcePickerModal } from '../MediaSourcePickerModal'
import { UserSettingsModalAccountSection } from './UserSettingsModalAccountSection.module'
import { UserSettingsModalAppearanceSection } from './UserSettingsModalAppearanceSection.module'
import { UserSettingsModalDevicesModule, type DeviceSession } from './UserSettingsModalDevices.module'
import {
  UserSettingsModalFooter,
  UserSettingsModalHeader,
  UserSettingsModalSidebar,
  UserSettingsModalTabs,
  type SettingsView,
} from './UserSettingsModalFrameParts.module'
import { userSettingsPlaceholderModules, type UserSettingsPlaceholderView } from './UserSettingsModalPlaceholderSections.module'
import { UserSettingsModalPrivacySection, type TwoFactorSetupState } from './UserSettingsModalPrivacySection.module'

interface Props {
  open: boolean
  onClose: () => void
  initialView?: SettingsView
  onOpenThemeWorkspace?: () => void
}

type MediaTarget = 'avatar' | 'banner'

interface AppearanceDraft {
  theme: AppearanceTheme
  customPrimary: string
  customSecondary: string
  customIntensity: number
  compactMode: boolean
  uiDensity: AppearanceDensity
}

export function UserSettingsModal({ open, onClose, initialView = 'account', onOpenThemeWorkspace }: Props) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const logout = useAuthStore((s) => s.logout)
  const storedTheme = useAppearanceStore((s) => s.theme)
  const storedCustomPrimary = useAppearanceStore((s) => s.customPrimary)
  const storedCustomSecondary = useAppearanceStore((s) => s.customSecondary)
  const storedCustomIntensity = useAppearanceStore((s) => s.customIntensity)
  const storedCompactMode = useAppearanceStore((s) => s.compactMode)
  const storedUiDensity = useAppearanceStore((s) => s.uiDensity)
  const setStoredTheme = useAppearanceStore((s) => s.setTheme)
  const setStoredCustomPrimary = useAppearanceStore((s) => s.setCustomPrimary)
  const setStoredCustomSecondary = useAppearanceStore((s) => s.setCustomSecondary)
  const setStoredCustomIntensity = useAppearanceStore((s) => s.setCustomIntensity)
  const setStoredCompactMode = useAppearanceStore((s) => s.setCompactMode)
  const setStoredUiDensity = useAppearanceStore((s) => s.setUiDensity)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [twoFactorPassword, setTwoFactorPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [disableTwoFactorCode, setDisableTwoFactorCode] = useState('')
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetupState>(null)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [didCopyBackupCodes, setDidCopyBackupCodes] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)
  const [isPreparingTwoFactor, setIsPreparingTwoFactor] = useState(false)
  const [isEnablingTwoFactor, setIsEnablingTwoFactor] = useState(false)
  const [isDisablingTwoFactor, setIsDisablingTwoFactor] = useState(false)
  const [mediaPickerTarget, setMediaPickerTarget] = useState<MediaTarget | null>(null)
  const [activeView, setActiveView] = useState<SettingsView>('account')
  const [deviceSessions, setDeviceSessions] = useState<DeviceSession[]>([])
  const [closingSessionId, setClosingSessionId] = useState<string | null>(null)
  const [isClosingAllOtherSessions, setIsClosingAllOtherSessions] = useState(false)
  const [appearanceDraft, setAppearanceDraft] = useState<AppearanceDraft>({
    theme: 'oscuro',
    customPrimary: '#5865f2',
    customSecondary: '#ff6835',
    customIntensity: 74,
    compactMode: false,
    uiDensity: 'comoda',
  })

  const buildDeviceSessions = (): DeviceSession[] => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : ''
    const timezone = typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ')
      : 'Ubicacion no disponible'

    const isMobile = /(android|iphone|ipad|ipod)/.test(ua)
    const currentDevice = ua.includes('android')
      ? 'Android'
      : ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')
        ? 'iOS'
        : ua.includes('win')
          ? 'Windows'
          : ua.includes('mac')
            ? 'macOS'
            : ua.includes('linux')
              ? 'Linux'
              : 'Desktop'

    const currentClient = ua.includes('edg/')
      ? 'Microsoft Edge'
      : ua.includes('chrome/')
        ? 'Chrome'
        : ua.includes('firefox/')
          ? 'Firefox'
          : ua.includes('safari/')
            ? 'Safari'
            : 'Navegador web'

    return [
      {
        id: 'current',
        device: currentDevice,
        client: currentClient,
        location: timezone,
        lastSeen: 'Ahora mismo',
        isCurrent: true,
        kind: isMobile ? 'mobile' : 'desktop',
      },
      {
        id: 'desktop-1',
        device: 'Windows',
        client: 'Cliente de escritorio',
        location: 'Bucaramanga, Colombia',
        lastSeen: 'hace menos de una hora',
        isCurrent: false,
        kind: 'desktop',
      },
      {
        id: 'mobile-1',
        device: 'Android',
        client: 'App Android',
        location: 'Bucaramanga, Colombia',
        lastSeen: 'hace una hora',
        isCurrent: false,
        kind: 'mobile',
      },
    ]
  }

  useEffect(() => {
    if (!open || !user) return
    setDisplayName(user.username)
    setUsername(user.username)
    setEmail(user.email)
    setCurrentPassword('')
    setNewPassword('')
    setTwoFactorPassword('')
    setTwoFactorCode('')
    setDisableTwoFactorCode('')
    setTwoFactorSetup(null)
    setBackupCodes([])
    setDidCopyBackupCodes(false)
    setError(null)
    setSuccess(null)
    setActiveView(initialView)
    setDeviceSessions(buildDeviceSessions())
    setClosingSessionId(null)
    setIsClosingAllOtherSessions(false)
    setAppearanceDraft({
      theme: storedTheme,
      customPrimary: storedCustomPrimary,
      customSecondary: storedCustomSecondary,
      customIntensity: storedCustomIntensity,
      compactMode: storedCompactMode,
      uiDensity: storedUiDensity,
    })
  }, [initialView, open, storedCompactMode, storedCustomIntensity, storedCustomPrimary, storedCustomSecondary, storedTheme, storedUiDensity, user])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open || !user) return null

  const mergeUser = (patch: Partial<typeof user>) => {
    setUser({ ...user, ...patch })
  }

  const isMediaPickerBusy = isUploadingAvatar || isUploadingBanner

  const uploadAvatar = async (formData: FormData) => {
    const res = await usersApi.uploadAvatar(formData)
    mergeUser({ avatarUrl: res.data.avatarUrl })
    setSuccess('Foto de perfil actualizada.')
  }

  const uploadBanner = async (formData: FormData) => {
    const res = await usersApi.uploadBanner(formData)
    mergeUser({ bannerUrl: res.data.bannerUrl })
    setSuccess('Banner actualizado.')
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
    const isAvatar = target === 'avatar'
    const setLoading = isAvatar ? setIsUploadingAvatar : setIsUploadingBanner
    const fieldName = isAvatar ? 'avatar' : 'banner'

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

      if (isAvatar) {
        await uploadAvatar(formData)
      } else {
        await uploadBanner(formData)
      }
      setMediaPickerTarget(null)
    } catch (err) {
      const message = err instanceof ApiRequestError
        ? err.message
        : 'No se pudo descargar la imagen desde Giphy.'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingAvatar(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      formData.append('avatar', file)
      await uploadAvatar(formData)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo subir la foto de perfil.')
    } finally {
      event.target.value = ''
      setIsUploadingAvatar(false)
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
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo subir el banner.')
    } finally {
      event.target.value = ''
      setIsUploadingBanner(false)
    }
  }

  const handleSave = async () => {
    if (activeView === 'appearance') {
      const normalizedPrimary = normalizeHexColor(appearanceDraft.customPrimary)
      const normalizedSecondary = normalizeHexColor(appearanceDraft.customSecondary)
      const hasAppearanceChanges =
        appearanceDraft.theme !== storedTheme
        || normalizedPrimary !== normalizeHexColor(storedCustomPrimary)
        || normalizedSecondary !== normalizeHexColor(storedCustomSecondary)
        || appearanceDraft.customIntensity !== storedCustomIntensity
        || appearanceDraft.compactMode !== storedCompactMode
        || appearanceDraft.uiDensity !== storedUiDensity

      if (!hasAppearanceChanges) {
        setSuccess('No hay cambios pendientes.')
        setError(null)
        return
      }

      setIsSaving(true)
      setError(null)
      setSuccess(null)

      try {
        setStoredTheme(appearanceDraft.theme)
        setStoredCustomPrimary(normalizedPrimary)
        setStoredCustomSecondary(normalizedSecondary)
        setStoredCustomIntensity(appearanceDraft.customIntensity)
        setStoredCompactMode(appearanceDraft.compactMode)
        setStoredUiDensity(appearanceDraft.uiDensity)
        setAppearanceDraft((current) => ({
          ...current,
          customPrimary: normalizedPrimary,
          customSecondary: normalizedSecondary,
        }))
        setSuccess('Apariencia actualizada correctamente.')
      } finally {
        setIsSaving(false)
      }

      return
    }

    const trimmedUsername = username.trim()
    const trimmedEmail = email.trim()
    const payload: {
      username?: string
      email?: string
      currentPassword?: string
      newPassword?: string
    } = {}

    if (trimmedUsername && trimmedUsername !== user.username) {
      payload.username = trimmedUsername
    }
    if (trimmedEmail && trimmedEmail !== user.email) {
      payload.email = trimmedEmail
    }
    if (newPassword) {
      payload.currentPassword = currentPassword
      payload.newPassword = newPassword
    }

    if (Object.keys(payload).length === 0) {
      setSuccess('No hay cambios pendientes.')
      setError(null)
      return
    }

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await usersApi.update(payload)
      setUser(res.data)
      setCurrentPassword('')
      setNewPassword('')
      setSuccess('Ajustes guardados correctamente.')
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudieron guardar los ajustes.')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePrepareTwoFactor = async () => {
    setIsPreparingTwoFactor(true)
    setError(null)
    setSuccess(null)
    setBackupCodes([])
    setDidCopyBackupCodes(false)

    try {
      const res = await usersApi.prepareTwoFactor({
        ...(twoFactorPassword.trim() ? { currentPassword: twoFactorPassword.trim() } : {}),
      })
      setTwoFactorSetup(res.data)
      setSuccess('Escanea el QR y confirma con el codigo de tu app autenticadora.')
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo preparar la autenticacion de dos factores.')
    } finally {
      setIsPreparingTwoFactor(false)
    }
  }

  const handleEnableTwoFactor = async () => {
    if (!twoFactorSetup) return

    setIsEnablingTwoFactor(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await usersApi.enableTwoFactor({
        secret: twoFactorSetup.secret,
        code: twoFactorCode.trim(),
        ...(twoFactorPassword.trim() ? { currentPassword: twoFactorPassword.trim() } : {}),
      })
      mergeUser({ twoFactorEnabled: true })
      setBackupCodes(res.data.backupCodes)
      setDidCopyBackupCodes(false)
      setTwoFactorSetup(null)
      setTwoFactorCode('')
      setDisableTwoFactorCode('')
      setSuccess('La autenticacion en dos pasos ya esta activa.')
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo activar la autenticacion en dos factores.')
    } finally {
      setIsEnablingTwoFactor(false)
    }
  }

  const handleDisableTwoFactor = async () => {
    setIsDisablingTwoFactor(true)
    setError(null)
    setSuccess(null)

    try {
      await usersApi.disableTwoFactor({
        code: disableTwoFactorCode.trim(),
        ...(twoFactorPassword.trim() ? { currentPassword: twoFactorPassword.trim() } : {}),
      })
      mergeUser({ twoFactorEnabled: false })
      setDisableTwoFactorCode('')
      setTwoFactorSetup(null)
      setBackupCodes([])
      setDidCopyBackupCodes(false)
      setSuccess('La autenticacion en dos pasos fue desactivada.')
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo desactivar la autenticacion en dos factores.')
    } finally {
      setIsDisablingTwoFactor(false)
    }
  }

  const handleCopyBackupCodes = async () => {
    if (backupCodes.length === 0) return

    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'))
      setDidCopyBackupCodes(true)
      setSuccess('Backup codes copiados al portapapeles.')
    } catch {
      setError('No se pudieron copiar los backup codes.')
    }
  }

  const handleLogout = () => {
    if (isMockSession()) {
      clearMockSession()
    } else {
      logout()
    }
    onClose()
    router.replace('/login')
  }

  const handleCloseOtherSession = (sessionId: string) => {
    setClosingSessionId(sessionId)
    setError(null)
    setSuccess(null)
    setDeviceSessions((previous) => previous.filter((session) => session.id !== sessionId))
    setSuccess('La sesion del dispositivo seleccionado fue cerrada.')
    setClosingSessionId(null)
  }

  const handleCloseAllOtherSessions = () => {
    const hasOtherSessions = deviceSessions.some((session) => !session.isCurrent)
    if (!hasOtherSessions) return

    setIsClosingAllOtherSessions(true)
    setError(null)
    setSuccess(null)
    setDeviceSessions((previous) => previous.filter((session) => session.isCurrent))
    setSuccess('Se cerraron todas las sesiones de otros dispositivos.')
    setIsClosingAllOtherSessions(false)
  }

  const securityBlock = (
    <UserSettingsModalPrivacySection
      user={user}
      currentPassword={currentPassword}
      newPassword={newPassword}
      twoFactorPassword={twoFactorPassword}
      twoFactorCode={twoFactorCode}
      disableTwoFactorCode={disableTwoFactorCode}
      twoFactorSetup={twoFactorSetup}
      backupCodes={backupCodes}
      didCopyBackupCodes={didCopyBackupCodes}
      isPreparingTwoFactor={isPreparingTwoFactor}
      isEnablingTwoFactor={isEnablingTwoFactor}
      isDisablingTwoFactor={isDisablingTwoFactor}
      onCurrentPasswordChange={setCurrentPassword}
      onNewPasswordChange={setNewPassword}
      onTwoFactorPasswordChange={setTwoFactorPassword}
      onTwoFactorCodeChange={setTwoFactorCode}
      onDisableTwoFactorCodeChange={setDisableTwoFactorCode}
      onPrepareTwoFactor={() => void handlePrepareTwoFactor()}
      onEnableTwoFactor={() => void handleEnableTwoFactor()}
      onDisableTwoFactor={() => void handleDisableTwoFactor()}
      onCopyBackupCodes={handleCopyBackupCodes}
    />
  )

  const accountModule = (
    <UserSettingsModalAccountSection
      user={user}
      displayName={displayName}
      username={username}
      email={email}
      isUploadingAvatar={isUploadingAvatar}
      isUploadingBanner={isUploadingBanner}
      avatarInputRef={avatarInputRef}
      bannerInputRef={bannerInputRef}
      onOpenMediaPicker={setMediaPickerTarget}
      onAvatarFileChange={(event) => void handleAvatarFile(event)}
      onBannerFileChange={(event) => void handleBannerFile(event)}
      onDisplayNameChange={setDisplayName}
      onUsernameChange={setUsername}
      onEmailChange={setEmail}
    />
  )

  const devicesModule = (
    <div className="mx-auto max-w-4xl">
      <UserSettingsModalDevicesModule
        sessions={deviceSessions}
        closingSessionId={closingSessionId}
        isClosingAllOtherSessions={isClosingAllOtherSessions}
        onCloseCurrentSession={handleLogout}
        onCloseOtherSession={handleCloseOtherSession}
        onCloseAllOtherSessions={handleCloseAllOtherSessions}
      />
    </div>
  )

  const appearanceModule = (
    <UserSettingsModalAppearanceSection
      theme={appearanceDraft.theme}
      customPrimary={appearanceDraft.customPrimary}
      customSecondary={appearanceDraft.customSecondary}
      customIntensity={appearanceDraft.customIntensity}
      compactMode={appearanceDraft.compactMode}
      uiDensity={appearanceDraft.uiDensity}
      onThemeChange={(value) => setAppearanceDraft((current) => ({ ...current, theme: value }))}
      onCompactModeChange={(value) => setAppearanceDraft((current) => ({ ...current, compactMode: value }))}
      onUiDensityChange={(value) => setAppearanceDraft((current) => ({ ...current, uiDensity: value }))}
      onOpenThemeWorkspace={() => {
        onClose()
        onOpenThemeWorkspace?.()
      }}
    />
  )

  const placeholderModules = userSettingsPlaceholderModules

  const currentModule = activeView === 'account'
    ? accountModule
    : activeView === 'appearance'
      ? appearanceModule
    : activeView === 'privacy'
      ? <div className="mx-auto max-w-4xl">{securityBlock}</div>
      : activeView === 'devices'
        ? devicesModule
        : placeholderModules[activeView as UserSettingsPlaceholderView]

  const contentModule = <div className="scrollable flex-1 p-4 sm:p-6">{currentModule}</div>

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-[var(--modal-scrim)] p-4" onClick={onClose}>
      <div
        className="flex h-[min(92vh,790px)] w-full max-w-6xl overflow-hidden rounded-3xl border border-[var(--b1)] bg-[var(--s3)] shadow-[var(--panel-shadow)]"
        onClick={(event) => event.stopPropagation()}
      >
        <UserSettingsModalSidebar
          user={user}
          activeView={activeView}
          onViewChange={setActiveView}
          onLogout={handleLogout}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <UserSettingsModalHeader activeView={activeView} onClose={onClose} />
          <UserSettingsModalTabs activeView={activeView} />
          {contentModule}
          <UserSettingsModalFooter
            error={error}
            success={success}
            isSaving={isSaving}
            canSave={activeView === 'account' || activeView === 'appearance'}
            onClose={onClose}
            onSave={handleSave}
          />
        </div>
      </div>
      <MediaSourcePickerModal
        open={mediaPickerTarget !== null}
        title={mediaPickerTarget === 'avatar' ? 'Cambiar foto de perfil' : 'Cambiar banner'}
        isBusy={isMediaPickerBusy}
        onClose={() => setMediaPickerTarget(null)}
        onPickLocal={() => {
          const ref = mediaPickerTarget === 'avatar' ? avatarInputRef.current : bannerInputRef.current
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
