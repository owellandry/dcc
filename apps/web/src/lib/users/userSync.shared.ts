import type { User } from '@/lib/types'
import { useMessagesStore } from '@/stores/messagesStore'
import { useServersStore } from '@/stores/serversStore'

export function syncUserAcrossClientStores(userId: string, patch: Partial<User>) {
  useServersStore.getState().syncUser(userId, patch)
  useMessagesStore.getState().syncUser(userId, patch)
}
