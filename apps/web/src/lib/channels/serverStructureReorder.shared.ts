import type { Category, Channel } from '@/lib/types'

export type StructureDragItem =
  | { kind: 'category'; id: string }
  | { kind: 'channel'; id: string }

export type StructureDropPlacement = 'before' | 'after'

export type StructureChannelDropTarget =
  | { kind: 'channel'; channelId: string; placement: StructureDropPlacement }
  | { kind: 'category'; categoryId: string | null }

export interface StructureCategoryDropTarget {
  categoryId: string
  placement: StructureDropPlacement
}

export interface ServerStructureSnapshot {
  categories: Category[]
  channels: Channel[]
}

function sortCategories(categories: Category[]) {
  return [...categories].sort((left, right) => left.position - right.position)
}

function sortChannels(channels: Channel[]) {
  return [...channels].sort((left, right) => {
    if (left.categoryId !== right.categoryId) {
      if (left.categoryId === null) return -1
      if (right.categoryId === null) return 1
      return left.categoryId.localeCompare(right.categoryId)
    }

    return left.position - right.position
  })
}

function toChannelGroupKey(categoryId: string | null) {
  return categoryId ?? '__uncategorized__'
}

function fromChannelGroupKey(groupKey: string) {
  return groupKey === '__uncategorized__' ? null : groupKey
}

function groupChannelsByCategory(channels: Channel[]) {
  const groups = new Map<string, Channel[]>()

  for (const channel of channels) {
    const groupKey = toChannelGroupKey(channel.categoryId)
    const currentGroup = groups.get(groupKey) ?? []
    currentGroup.push(channel)
    groups.set(groupKey, currentGroup)
  }

  return groups
}

function normalizeCategories(categories: Category[]) {
  return sortCategories(categories).map((category, index) => ({
    ...category,
    position: index,
  }))
}

function normalizeChannels(channels: Channel[]) {
  const sortedChannels = sortChannels(channels)
  const groupedChannels = groupChannelsByCategory(sortedChannels)

  for (const [groupKey, groupChannels] of groupedChannels.entries()) {
    groupedChannels.set(
      groupKey,
      groupChannels.map((channel, index) => ({
        ...channel,
        categoryId: fromChannelGroupKey(groupKey),
        position: index,
      }))
    )
  }

  return sortedChannels.map((channel) => {
    const groupKey = toChannelGroupKey(channel.categoryId)
    return groupedChannels.get(groupKey)?.find((entry) => entry.id === channel.id) ?? channel
  })
}

function structureChanged(previous: ServerStructureSnapshot, next: ServerStructureSnapshot) {
  if (previous.categories.length !== next.categories.length || previous.channels.length !== next.channels.length) {
    return true
  }

  return previous.categories.some((category, index) => {
    const nextCategory = next.categories[index]
    return !nextCategory || category.id !== nextCategory.id || category.position !== nextCategory.position
  }) || previous.channels.some((channel, index) => {
    const nextChannel = next.channels[index]
    return (
      !nextChannel ||
      channel.id !== nextChannel.id ||
      channel.position !== nextChannel.position ||
      channel.categoryId !== nextChannel.categoryId
    )
  })
}

export function normalizeServerStructure(
  categories: Category[],
  channels: Channel[]
): ServerStructureSnapshot {
  return {
    categories: normalizeCategories(categories),
    channels: normalizeChannels(channels),
  }
}

export function moveCategoryInStructure(
  categories: Category[],
  channels: Channel[],
  draggedCategoryId: string,
  target: StructureCategoryDropTarget
): ServerStructureSnapshot | null {
  if (draggedCategoryId === target.categoryId) return null

  const snapshot = normalizeServerStructure(categories, channels)
  const orderedCategories = [...snapshot.categories]
  const draggedIndex = orderedCategories.findIndex((category) => category.id === draggedCategoryId)
  const targetIndex = orderedCategories.findIndex((category) => category.id === target.categoryId)

  if (draggedIndex === -1 || targetIndex === -1) return null

  const [draggedCategory] = orderedCategories.splice(draggedIndex, 1)
  if (!draggedCategory) return null

  const insertIndex = targetIndex + (target.placement === 'after' ? 1 : 0)
  orderedCategories.splice(insertIndex > draggedIndex ? insertIndex - 1 : insertIndex, 0, draggedCategory)

  const nextSnapshot = {
    categories: orderedCategories.map((category, index) => ({
      ...category,
      position: index,
    })),
    channels: snapshot.channels,
  }

  return structureChanged(snapshot, nextSnapshot) ? nextSnapshot : null
}

export function moveChannelInStructure(
  categories: Category[],
  channels: Channel[],
  draggedChannelId: string,
  target: StructureChannelDropTarget
): ServerStructureSnapshot | null {
  const snapshot = normalizeServerStructure(categories, channels)
  const orderedChannels = [...snapshot.channels]
  const draggedChannel = orderedChannels.find((channel) => channel.id === draggedChannelId)
  if (!draggedChannel) return null

  const groupedChannels = groupChannelsByCategory(orderedChannels)
  const sourceGroupKey = toChannelGroupKey(draggedChannel.categoryId)
  const sourceGroup = [...(groupedChannels.get(sourceGroupKey) ?? [])]
  const sourceIndex = sourceGroup.findIndex((channel) => channel.id === draggedChannelId)
  if (sourceIndex === -1) return null

  sourceGroup.splice(sourceIndex, 1)
  groupedChannels.set(sourceGroupKey, sourceGroup)

  if (target.kind === 'category') {
    const destinationGroupKey = toChannelGroupKey(target.categoryId)
    const destinationGroup =
      destinationGroupKey === sourceGroupKey
        ? sourceGroup
        : [...(groupedChannels.get(destinationGroupKey) ?? [])]

    destinationGroup.push({
      ...draggedChannel,
      categoryId: target.categoryId,
    })
    groupedChannels.set(destinationGroupKey, destinationGroup)
  } else {
    const targetChannel = orderedChannels.find((channel) => channel.id === target.channelId)
    if (!targetChannel || targetChannel.id === draggedChannelId) return null

    const destinationGroupKey = toChannelGroupKey(targetChannel.categoryId)
    const destinationGroup =
      destinationGroupKey === sourceGroupKey
        ? sourceGroup
        : [...(groupedChannels.get(destinationGroupKey) ?? [])]

    const targetIndex = destinationGroup.findIndex((channel) => channel.id === target.channelId)
    if (targetIndex === -1) return null

    const insertIndex = targetIndex + (target.placement === 'after' ? 1 : 0)
    destinationGroup.splice(insertIndex, 0, {
      ...draggedChannel,
      categoryId: targetChannel.categoryId,
    })
    groupedChannels.set(destinationGroupKey, destinationGroup)
  }

  const nextChannelsMap = new Map<string, Channel>()

  for (const channel of orderedChannels) {
    const groupKey = toChannelGroupKey(channel.categoryId)
    if (!groupedChannels.has(groupKey)) {
      groupedChannels.set(groupKey, [])
    }
  }

  for (const [groupKey, group] of groupedChannels.entries()) {
    group.forEach((channel, index) => {
      nextChannelsMap.set(channel.id, {
        ...channel,
        categoryId: fromChannelGroupKey(groupKey),
        position: index,
      })
    })
  }

  const nextSnapshot = {
    categories: snapshot.categories,
    channels: orderedChannels.map((channel) => nextChannelsMap.get(channel.id) ?? channel),
  }

  return structureChanged(snapshot, nextSnapshot) ? nextSnapshot : null
}

export function buildStructureReorderPayload(snapshot: ServerStructureSnapshot) {
  const normalizedSnapshot = normalizeServerStructure(snapshot.categories, snapshot.channels)

  return {
    categories: normalizedSnapshot.categories.map((category) => ({
      id: category.id,
      position: category.position,
    })),
    channels: normalizedSnapshot.channels.map((channel) => ({
      id: channel.id,
      position: channel.position,
      categoryId: channel.categoryId,
    })),
  }
}
