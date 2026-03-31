'use client'

import { useEffect, useState } from 'react'
import { ApiRequestError, serversApi } from '@/lib/api'
import { isMockSession } from '@/lib/mock-init'
import { type InviteLinkModalProps, type InviteLinkModalVisualProps } from './InviteLinkModal.shared'

export function useInviteLinkModalModel({
  isOpen,
  serverId,
  onClose,
}: InviteLinkModalProps): InviteLinkModalVisualProps {
  const [inviteExpiresInSeconds, setInviteExpiresInSeconds] = useState<number | null>(24 * 60 * 60)
  const [inviteMaxUses, setInviteMaxUses] = useState<number | null>(10)
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false)
  const [isCopyingInvite, setIsCopyingInvite] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setInviteExpiresInSeconds(24 * 60 * 60)
    setInviteMaxUses(10)
    setInviteUrl('')
    setInviteError(null)
    setIsGeneratingInvite(false)
    setIsCopyingInvite(false)
  }, [isOpen])

  const closeModal = () => {
    if (isGeneratingInvite || isCopyingInvite) return
    onClose()
  }

  const buildInviteUrl = (code: string) => {
    if (typeof window === 'undefined') return code
    return `${window.location.origin}/invite/${code}`
  }

  const generateInvite = async () => {
    setInviteError(null)
    setInviteUrl('')
    setIsGeneratingInvite(true)

    try {
      if (isMockSession()) {
        const mockCode = `mock-${Math.random().toString(36).slice(2, 10)}`
        setInviteUrl(buildInviteUrl(mockCode))
        return
      }

      const response = await serversApi.createInvite(serverId, {
        expiresInSeconds: inviteExpiresInSeconds,
        maxUses: inviteMaxUses,
      })
      setInviteUrl(buildInviteUrl(response.data.code))
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setInviteError(error.message)
      } else {
        setInviteError('No se pudo generar la invitacion.')
      }
    } finally {
      setIsGeneratingInvite(false)
    }
  }

  const copyInvite = async () => {
    if (!inviteUrl) return
    setIsCopyingInvite(true)
    setInviteError(null)
    try {
      await navigator.clipboard.writeText(inviteUrl)
    } catch {
      setInviteError('No se pudo copiar el enlace.')
    } finally {
      setIsCopyingInvite(false)
    }
  }

  return {
    isOpen,
    inviteExpiresInSeconds,
    inviteMaxUses,
    inviteUrl,
    inviteError,
    isGeneratingInvite,
    isCopyingInvite,
    onClose: closeModal,
    onChangeExpiresInSeconds: (value: string) => {
      setInviteExpiresInSeconds(value === 'never' ? null : Number(value))
    },
    onChangeMaxUses: (value: string) => {
      setInviteMaxUses(value === 'unlimited' ? null : Number(value))
    },
    onGenerateInvite: () => {
      void generateInvite()
    },
    onCopyInvite: () => {
      void copyInvite()
    },
  }
}
