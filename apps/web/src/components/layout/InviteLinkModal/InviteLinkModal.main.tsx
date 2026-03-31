'use client'

import { useInviteLinkModalModel } from './InviteLinkModal.logic'
import { type InviteLinkModalProps } from './InviteLinkModal.shared'
import { InviteLinkModalVisual } from './InviteLinkModal.visual'

export function InviteLinkModal(props: InviteLinkModalProps) {
  const visualProps = useInviteLinkModalModel(props)

  return <InviteLinkModalVisual {...visualProps} />
}
