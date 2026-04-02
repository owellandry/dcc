import { ChannelPageClient } from './ChannelPageClient'

export default function ChannelPage({
  params,
}: {
  params: { serverId: string; channelId: string }
}) {
  return (
    <ChannelPageClient
      serverId={params.serverId}
      channelId={params.channelId}
    />
  )
}
