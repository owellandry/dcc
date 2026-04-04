'use client'

import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { serversApi } from '@/lib/api'
import { isMockSession } from '@/lib/mock-init'
import type { Category, Channel } from '@/lib/types'
import {
  buildStructureReorderPayload,
  moveCategoryInStructure,
  moveChannelInStructure,
  type ServerStructureSnapshot,
  type StructureCategoryDropTarget,
  type StructureChannelDropTarget,
} from '@/lib/channels/serverStructureReorder.shared'
import { useServersStore } from '@/stores/serversStore'

interface UseServerStructureReorderOptions {
  serverId: string | null
  categories: Category[]
  channels: Channel[]
  enabled: boolean
}

export function useServerStructureReorder({
  serverId,
  categories,
  channels,
  enabled,
}: UseServerStructureReorderOptions) {
  const setChannels = useServersStore((state) => state.setChannels)
  const latestStructureRef = useRef<ServerStructureSnapshot>({ categories, channels })
  const isReorderingStructureRef = useRef(false)

  useEffect(() => {
    latestStructureRef.current = { categories, channels }
  }, [categories, channels])

  const persistStructure = async (
    nextStructure: ServerStructureSnapshot,
    previousStructure: ServerStructureSnapshot,
    errorMessage: string
  ) => {
    if (!serverId) return

    console.debug('[ServerStructureReorder]', 'persist-start', {
      serverId,
      nextCategories: nextStructure.categories.map((category) => ({
        id: category.id,
        position: category.position,
      })),
      nextChannels: nextStructure.channels.map((channel) => ({
        id: channel.id,
        categoryId: channel.categoryId,
        position: channel.position,
      })),
    })

    setChannels(serverId, nextStructure.channels, nextStructure.categories)
    latestStructureRef.current = nextStructure

    if (isMockSession()) {
      console.debug('[ServerStructureReorder]', 'persist-skip-mock-session', { serverId })
      return
    }

    isReorderingStructureRef.current = true

    try {
      await serversApi.reorderStructure(serverId, buildStructureReorderPayload(nextStructure))
      console.debug('[ServerStructureReorder]', 'persist-success', { serverId })
    } catch {
      console.debug('[ServerStructureReorder]', 'persist-failed-rollback', { serverId })
      setChannels(serverId, previousStructure.channels, previousStructure.categories)
      latestStructureRef.current = previousStructure
      toast.error(errorMessage)
    } finally {
      isReorderingStructureRef.current = false
    }
  }

  const moveChannel = async (
    draggedChannelId: string,
    target: StructureChannelDropTarget
  ) => {
    console.debug('[ServerStructureReorder]', 'move-channel-request', {
      serverId,
      enabled,
      isReordering: isReorderingStructureRef.current,
      draggedChannelId,
      target,
    })

    if (!serverId || !enabled || isReorderingStructureRef.current) {
      console.debug('[ServerStructureReorder]', 'move-channel-blocked', {
        serverId,
        enabled,
        isReordering: isReorderingStructureRef.current,
      })
      return
    }

    const previousStructure = latestStructureRef.current
    const nextStructure = moveChannelInStructure(
      previousStructure.categories,
      previousStructure.channels,
      draggedChannelId,
      target
    )

    if (!nextStructure) {
      console.debug('[ServerStructureReorder]', 'move-channel-noop', {
        draggedChannelId,
        target,
      })
      return
    }

    await persistStructure(
      nextStructure,
      previousStructure,
      'No se pudo reordenar el canal.'
    )
  }

  const moveCategory = async (
    draggedCategoryId: string,
    target: StructureCategoryDropTarget
  ) => {
    console.debug('[ServerStructureReorder]', 'move-category-request', {
      serverId,
      enabled,
      isReordering: isReorderingStructureRef.current,
      draggedCategoryId,
      target,
    })

    if (!serverId || !enabled || isReorderingStructureRef.current) {
      console.debug('[ServerStructureReorder]', 'move-category-blocked', {
        serverId,
        enabled,
        isReordering: isReorderingStructureRef.current,
      })
      return
    }

    const previousStructure = latestStructureRef.current
    const nextStructure = moveCategoryInStructure(
      previousStructure.categories,
      previousStructure.channels,
      draggedCategoryId,
      target
    )

    if (!nextStructure) {
      console.debug('[ServerStructureReorder]', 'move-category-noop', {
        draggedCategoryId,
        target,
      })
      return
    }

    await persistStructure(
      nextStructure,
      previousStructure,
      'No se pudo reordenar la categoria.'
    )
  }

  return {
    isReorderingStructure: false,
    moveChannel,
    moveCategory,
  }
}
