import { type ChannelHeaderBarProps, type ChannelHeaderBarVisualProps } from './ChannelHeaderBar.shared'

export function useChannelHeaderBarModel({
  channelName,
  topic,
  iconKey,
  fontKey,
  fontWeight,
  channelType,
  isMemberListOpen,
  onToggleMemberList,
}: ChannelHeaderBarProps): ChannelHeaderBarVisualProps {
  const normalizedName = channelName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  const isRulesChannel = /\b(regla|reglas|rule|rules)\b/.test(normalizedName)
  const isWelcomeChannel = /\b(bienvenida|bienvenidas|welcome)\b/.test(normalizedName)

  return {
    channelName,
    ...(topic !== undefined ? { topic } : {}),
    channelKind: channelType === 'voice' ? 'voice' : isWelcomeChannel ? 'welcome' : isRulesChannel ? 'rules' : 'default',
    ...(channelType !== undefined ? { channelType } : {}),
    ...(iconKey !== undefined ? { iconKey } : {}),
    ...(fontKey !== undefined ? { fontKey } : {}),
    ...(fontWeight !== undefined ? { fontWeight } : {}),
    ...(isMemberListOpen !== undefined ? { isMemberListOpen } : {}),
    ...(onToggleMemberList !== undefined ? { onToggleMemberList } : {}),
  }
}
