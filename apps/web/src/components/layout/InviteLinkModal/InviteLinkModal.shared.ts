export interface InviteLinkModalProps {
  isOpen: boolean
  serverId: string
  onClose: () => void
}

export interface InviteLinkModalVisualProps {
  isOpen: boolean
  inviteExpiresInSeconds: number | null
  inviteMaxUses: number | null
  inviteUrl: string
  inviteError: string | null
  isGeneratingInvite: boolean
  isCopyingInvite: boolean
  onClose: () => void
  onChangeExpiresInSeconds: (value: string) => void
  onChangeMaxUses: (value: string) => void
  onGenerateInvite: () => void
  onCopyInvite: () => void
}

export const INVITE_DURATION_OPTIONS = [
  { label: '30 minutos', value: 30 * 60 },
  { label: '1 hora', value: 60 * 60 },
  { label: '6 horas', value: 6 * 60 * 60 },
  { label: '12 horas', value: 12 * 60 * 60 },
  { label: '1 dia', value: 24 * 60 * 60 },
  { label: '7 dias', value: 7 * 24 * 60 * 60 },
] as const

export const INVITE_MAX_USES_OPTIONS = [1, 5, 10, 25, 50, 100] as const
