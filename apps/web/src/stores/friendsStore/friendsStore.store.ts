'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Friendship } from '@/lib/types'

interface FriendsState {
  friendships: Friendship[]
  hasLoaded: boolean
  isLoading: boolean
  setLoading: (isLoading: boolean) => void
  setFriendships: (friendships: Friendship[]) => void
  upsertFriendship: (friendship: Friendship) => void
  removeFriendshipById: (friendshipId: string) => void
  removeFriendshipByUserId: (userId: string) => void
  reset: () => void
}

function sortFriendships(friendships: Friendship[]) {
  return [...friendships].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export const useFriendsStore = create<FriendsState>()(
  persist(
    (set) => ({
      friendships: [],
      hasLoaded: false,
      isLoading: false,

      setLoading: (isLoading) => set({ isLoading }),

      setFriendships: (friendships) =>
        set({
          friendships: sortFriendships(friendships),
          hasLoaded: true,
          isLoading: false,
        }),

      upsertFriendship: (friendship) =>
        set((state) => {
          const existingIndex = state.friendships.findIndex(
            (current) => current.id === friendship.id || current.user.id === friendship.user.id
          )

          if (existingIndex === -1) {
            return {
              friendships: sortFriendships([friendship, ...state.friendships]),
              hasLoaded: true,
            }
          }

          const next = [...state.friendships]
          next[existingIndex] = friendship
          return {
            friendships: sortFriendships(next),
            hasLoaded: true,
          }
        }),

      removeFriendshipById: (friendshipId) =>
        set((state) => ({
          friendships: state.friendships.filter((friendship) => friendship.id !== friendshipId),
          hasLoaded: state.hasLoaded,
        })),

      removeFriendshipByUserId: (userId) =>
        set((state) => ({
          friendships: state.friendships.filter((friendship) => friendship.user.id !== userId),
          hasLoaded: state.hasLoaded,
        })),

      reset: () =>
        set({
          friendships: [],
          hasLoaded: false,
          isLoading: false,
        }),
    }),
    {
      name: 'dcc-friends',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        friendships: state.friendships,
        hasLoaded: state.hasLoaded,
      }),
    }
  )
)
