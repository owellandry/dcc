'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiRequestError, usersApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { usePresenceStore } from '@/stores/presenceStore'
import {
  STATUS_OPTIONS,
  type UserStatusSwitcherProps,
  type UserStatusSwitcherVisualProps,
} from './UserStatusSwitcher.shared'

export function useUserStatusSwitcherModel({
  user,
  decorationTone = null,
}: UserStatusSwitcherProps): UserStatusSwitcherVisualProps {
  const setUser = useAuthStore((state) => state.setUser)
  const presence = usePresenceStore((state) => state.presence[user.id])
  const setPresence = usePresenceStore((state) => state.setPresence)
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false)
  const [isSavingStatus, setIsSavingStatus] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const statusMenuRef = useRef<HTMLDivElement>(null)
  const status = presence?.status ?? user.status ?? 'offline'
  const customStatus = presence?.customStatus ?? user.customStatus

  useEffect(() => {
    if (!isStatusMenuOpen) return

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (statusMenuRef.current && !statusMenuRef.current.contains(target)) {
        setIsStatusMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', onMouseDown)
    return () => {
      window.removeEventListener('mousedown', onMouseDown)
    }
  }, [isStatusMenuOpen])

  const selectedStatusLabel = useMemo(() => {
    return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status
  }, [status])

  const updateStatus = async (nextStatus: typeof status) => {
    if (nextStatus === status || isSavingStatus) {
      setIsStatusMenuOpen(false)
      return
    }

    setIsSavingStatus(true)
    setStatusError(null)

    try {
      const response = await usersApi.update({ status: nextStatus })
      setUser(response.data)
      setPresence(response.data.id, response.data.status, response.data.customStatus)
      setIsStatusMenuOpen(false)
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setStatusError(error.message)
      } else {
        setStatusError('No se pudo actualizar el estado.')
      }
    } finally {
      setIsSavingStatus(false)
    }
  }

  return {
    user,
    decorationTone,
    status,
    customStatus,
    statusOptions: STATUS_OPTIONS,
    selectedStatusLabel,
    isStatusMenuOpen,
    isSavingStatus,
    statusError,
    statusMenuRef,
    onToggleMenu: () => setIsStatusMenuOpen((previous) => !previous),
    onUpdateStatus: (nextStatus) => {
      void updateStatus(nextStatus)
    },
  }
}
