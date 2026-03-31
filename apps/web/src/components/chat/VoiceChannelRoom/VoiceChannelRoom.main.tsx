'use client'

import { useVoiceChannelRoomModel } from './VoiceChannelRoom.logic'
import { type VoiceChannelRoomProps } from './VoiceChannelRoom.shared'
import { VoiceChannelRoomVisual } from './VoiceChannelRoom.visual'

export function VoiceChannelRoom(props: VoiceChannelRoomProps) {
  const visualProps = useVoiceChannelRoomModel(props)

  return <VoiceChannelRoomVisual {...visualProps} />
}
