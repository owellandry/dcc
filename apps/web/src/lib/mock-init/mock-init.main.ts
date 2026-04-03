/**
 * Hydrates all Zustand stores with mock data.
 * Call this once on the client to enter dev/preview mode.
 */
import {
  MOCK_ME, MOCK_SERVERS, MOCK_CHANNELS, MOCK_CATEGORIES,
  MOCK_MEMBERS, MOCK_MESSAGES, MOCK_PRESENCE, MOCK_FRIENDS,
} from '../mock-data'
import { useAuthStore } from '@/stores/authStore'
import { useFriendsStore } from '@/stores/friendsStore'
import { useServersStore } from '@/stores/serversStore'
import { useMessagesStore } from '@/stores/messagesStore'
import { usePresenceStore } from '@/stores/presenceStore'
import { setAccessToken } from '../api'

export const DEV_FLAG = 'dcc_dev_mode'

export function initMockSession() {
  // Mark dev mode in sessionStorage so the app layout skips real auth
  sessionStorage.setItem(DEV_FLAG, '1')

  // Fake access token so API client doesn't complain
  setAccessToken('dev_mock_token')

  // Auth store
  const authStore = useAuthStore.getState()
  authStore.setUser(MOCK_ME)

  // Servers store
  const serversStore = useServersStore.getState()
  serversStore.setServers(MOCK_SERVERS)

  // Channels + categories (per server)
  for (const server of MOCK_SERVERS) {
    const channels = MOCK_CHANNELS.filter((ch) => ch.serverId === server.id)
    const categories = MOCK_CATEGORIES.filter((cat) => cat.serverId === server.id)
    serversStore.setChannels(server.id, channels, categories)
    serversStore.setMembers(server.id, MOCK_MEMBERS.filter((m) => m.serverId === server.id))
  }

  // Messages store
  const messagesStore = useMessagesStore.getState()
  for (const [channelId, messages] of Object.entries(MOCK_MESSAGES)) {
    messagesStore.setMessages(channelId, [...messages].reverse(), false)
  }

  // Presence store
  const presenceStore = usePresenceStore.getState()
  for (const [userId, p] of Object.entries(MOCK_PRESENCE)) {
    presenceStore.setPresence(userId, p.status, p.customStatus)
  }

  useFriendsStore.getState().setFriendships(MOCK_FRIENDS)
}

export function isMockSession(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(DEV_FLAG) === '1'
}

export function clearMockSession() {
  sessionStorage.removeItem(DEV_FLAG)
  useAuthStore.getState().logout()
}
