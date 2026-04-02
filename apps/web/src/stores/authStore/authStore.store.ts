'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/lib/types'
import { setAccessToken } from '@/lib/api'
import { syncUserAcrossClientStores } from '@/lib/users/userSync.shared'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  // Actions
  setUser: (user: User) => void
  setAccessToken: (token: string) => void
  logout: () => void
  setLoading: (v: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => {
        syncUserAcrossClientStores(user.id, user)
        set({ user, isAuthenticated: true, isLoading: false })
      },

      setAccessToken: (token) => {
        setAccessToken(token)
        set({ isAuthenticated: true, isLoading: false })
      },

      logout: () => {
        setAccessToken(null)
        set({ user: null, isAuthenticated: false, isLoading: false })
      },

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'dcc-auth',
      // Only persist user data, not tokens (tokens live in httpOnly cookie)
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)
