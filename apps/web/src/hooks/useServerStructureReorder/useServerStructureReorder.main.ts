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

    setChannels(serverId, nextStructure.channels, nextStructure.categories)
    latestStructureRef.current = nextStructure

    if (isMockSession()) return

    isReorderingStructureRef.current = true

    try {
      await serversApi.reorderStructure(serverId, buildStructureReorderPayload(nextStructure))
    } catch {
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
    if (!serverId || !enabled || isReorderingStructureRef.current) return

    const previousStructure = latestStructureRef.current
    const nextStructure = moveChannelInStructure(
      previousStructure.categories,
      previousStructure.channels,
      draggedChannelId,
      target
    )

    if (!nextStructure) return

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
    if (!serverId || !enabled || isReorderingStructureRef.current) return

    const previousStructure = latestStructureRef.current
    const nextStructure = moveCategoryInStructure(
      previousStructure.categories,
      previousStructure.channels,
      draggedCategoryId,
      target
    )

    if (!nextStructure) return

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
