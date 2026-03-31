'use client'

import { useSystemWelcomeCardModel } from './MessageItemSystemWelcomeCard.logic'
import { type SystemWelcomeCardProps } from './MessageItemSystemWelcomeCard.shared'
import { SystemWelcomeCardVisual } from './MessageItemSystemWelcomeCard.visual'

export function SystemWelcomeCard(props: SystemWelcomeCardProps) {
  const visualProps = useSystemWelcomeCardModel(props)

  return <SystemWelcomeCardVisual {...visualProps} />
}
