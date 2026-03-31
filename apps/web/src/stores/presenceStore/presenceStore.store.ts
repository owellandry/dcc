'use client'

import { create } from 'zustand'
import type { UserStatus } from '@/lib/types'

interface PresenceState {
  presence: Record<string, { status: UserStatus; customStatus: string | null }>
  setPresence: (userId: string, status: UserStatus, customStatus: string | null) => void
  getStatus: (userId: string) => UserStatus
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  presence: {},

  setPresence: (userId, status, customStatus) =>
    set((s) => ({
      presence: { ...s.presence, [userId]: { status, customStatus } },
    })),

  getStatus: (userId) => get().presence[userId]?.status ?? 'offline',
}))
