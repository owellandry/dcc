import { ServerEntryPageClient } from './ServerEntryPageClient'

export default function ServerEntryPage({
  params,
}: {
  params: { serverId: string }
}) {
  return <ServerEntryPageClient serverId={params.serverId} />
}
