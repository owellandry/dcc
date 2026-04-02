import { ChatHeader } from '@/components/chat/ChatHeader'
import { ChatArea } from '@/components/chat/ChatArea'

interface Props {
  params: { channelId: string }
}

export default function DMChannelPage({ params }: Props) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <ChatHeader channelId={params.channelId} />
      <ChatArea channelId={params.channelId} />
    </div>
  )
}
