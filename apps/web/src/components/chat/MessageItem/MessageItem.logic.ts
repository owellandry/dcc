'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { format } from 'date-fns'
import { useShallow } from 'zustand/react/shallow'
import { channelsApi } from '@/lib/api'
import { useMessagesStore } from '@/stores/messagesStore'
import { useAuthStore } from '@/stores/authStore'
import { usePresenceStore } from '@/stores/presenceStore'
import { useServersStore } from '@/stores/serversStore'
import type { ServerMember } from '@/lib/types'
import { containsMentionForUser, formatTimestamp, renderMessageContent } from '../messageItemUtils'
import { normalizeMentionTerm, type MessageItemProps, type MessageItemVisualProps } from './MessageItem.shared'
import type { FloatingAnchorRect } from '@/lib/layout/floatingCard.shared'

export function useMessageItemController({
  message,
  grouped,
}: MessageItemProps): MessageItemVisualProps {
  const [isHovered, setIsHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false)
  const [reactionPickerStyle, setReactionPickerStyle] = useState({ top: 0, left: 0 })
  const [editContent, setEditContent] = useState(message.content ?? '')
  const [previewAnchorRect, setPreviewAnchorRect] = useState<FloatingAnchorRect | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const actionsMenuRef = useRef<HTMLDivElement>(null)
  const reactionPickerRef = useRef<HTMLDivElement>(null)
  const reactionTriggerRef = useRef<HTMLDivElement>(null)
  const inFlightReactionsRef = useRef<Set<string>>(new Set())
  const myUserId = useAuthStore((state) => state.user?.id)
  const myUsername = useAuthStore((state) => state.user?.username ?? null)
  const {
    updateMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    setReplyTarget,
  } = useMessagesStore()
  const status = usePresenceStore((state) => state.presence[message.author.id]?.status ?? 'offline')
  const { member, ownerId } = useServersStore(
    useShallow((state) => {
      const channel = state.channels[message.channelId]
      const serverId = channel?.serverId
      return {
        member: serverId ? state.members[serverId]?.[message.author.id] ?? null : null,
        ownerId: serverId ? state.servers[serverId]?.ownerId ?? null : null,
      }
    })
  )

  const isOwn = message.author.id === myUserId
  const isMentioningMe = useMemo(
    () => containsMentionForUser(message.content, myUsername),
    [message.content, myUsername]
  )

  const resolveChannelHref = useCallback((channelName: string): string | null => {
    const state = useServersStore.getState()
    const currentChannel = state.channels[message.channelId]
    const serverId = currentChannel?.serverId
    if (!serverId) return null

    const normalizedTarget = normalizeMentionTerm(channelName)
    for (const channel of Object.values(state.channels)) {
      if (channel.serverId !== serverId || channel.type !== 'text' || !channel.name) continue
      if (normalizeMentionTerm(channel.name) === normalizedTarget) {
        return `/channels/${serverId}/${channel.id}`
      }
    }
    return null
  }, [message.channelId])

  const renderedContent = useMemo(
    () => renderMessageContent(message.content, myUsername, resolveChannelHref),
    [message.content, myUsername, resolveChannelHref]
  )

  const previewMember = useMemo<ServerMember>(() => {
    if (member) return member
    return {
      serverId: 'unknown',
      userId: message.author.id,
      nickname: null,
      joinedAt: message.createdAt,
      roles: [],
      user: message.author,
    }
  }, [member, message.author, message.createdAt])

  const isOwner = useMemo(() => member !== null && ownerId === member.userId, [member, ownerId])

  useEffect(() => {
    if (isEditing) return
    setEditContent(message.content ?? '')
  }, [isEditing, message.content])

  const handleEdit = useCallback(async () => {
    if (!editContent.trim() || editContent === message.content) {
      setIsEditing(false)
      return
    }

    try {
      const response = await channelsApi.editMessage(message.id, { content: editContent })
      updateMessage(message.channelId, message.id, response.data)
    } catch {
      // ignore
    }

    setIsEditing(false)
  }, [editContent, message.channelId, message.content, message.id, updateMessage])

  const handleDelete = useCallback(async () => {
    try {
      await channelsApi.deleteMessage(message.id)
      deleteMessage(message.channelId, message.id)
    } catch {
      // ignore
    }
  }, [deleteMessage, message.channelId, message.id])

  const handleReaction = useCallback(async (emoji: string) => {
    if (!myUserId) return
    const requestKey = `${message.id}:${emoji}`
    if (inFlightReactionsRef.current.has(requestKey)) return
    inFlightReactionsRef.current.add(requestKey)
    const myReaction = message.reactions.find((reaction) => reaction.emoji === emoji && reaction.meReacted)

    if (myReaction) {
      removeReaction(message.channelId, message.id, emoji, myUserId, myUserId)
    } else {
      addReaction(message.channelId, message.id, emoji, myUserId, myUserId)
    }

    try {
      if (myReaction) {
        await channelsApi.removeReaction(message.id, emoji)
        return
      }
      await channelsApi.addReaction(message.id, emoji)
    } catch {
      if (myReaction) {
        addReaction(message.channelId, message.id, emoji, myUserId, myUserId)
      } else {
        removeReaction(message.channelId, message.id, emoji, myUserId, myUserId)
      }
    } finally {
      inFlightReactionsRef.current.delete(requestKey)
    }
  }, [addReaction, message.channelId, message.id, message.reactions, myUserId, removeReaction])

  const handleReply = useCallback(() => {
    setReplyTarget(message.channelId, message)
    setIsReactionPickerOpen(false)
    setIsHovered(false)
  }, [message, setReplyTarget])

  const updateReactionPickerPosition = useCallback(() => {
    const trigger = reactionTriggerRef.current
    if (!trigger) return
    const picker = reactionPickerRef.current
    const triggerRect = trigger.getBoundingClientRect()
    const padding = 12
    const offset = 10
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const measuredWidth = picker?.getBoundingClientRect().width ?? 380
    const measuredHeight = picker?.getBoundingClientRect().height ?? 520
    const shouldOpenUp = triggerRect.bottom + offset + measuredHeight > viewportHeight - padding

    const preferredLeft = triggerRect.right - measuredWidth + triggerRect.width
    const preferredTop = shouldOpenUp
      ? triggerRect.top - measuredHeight - offset
      : triggerRect.bottom + offset

    const maxLeft = Math.max(padding, viewportWidth - measuredWidth - padding)
    const maxTop = Math.max(padding, viewportHeight - measuredHeight - padding)
    const left = Math.max(padding, Math.min(preferredLeft, maxLeft))
    const top = Math.max(padding, Math.min(preferredTop, maxTop))
    setReactionPickerStyle({ top, left })
  }, [])

  const handleOpenPreview = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    setPreviewAnchorRect({
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    })
  }, [])

  const handleEditContentChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(event.target.value)
  }, [])

  const handleEditKeyDown = useCallback((event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleEdit()
    }

    if (event.key === 'Escape') {
      setEditContent(message.content ?? '')
      setIsEditing(false)
    }
  }, [handleEdit, message.content])

  const handleMouseLeave = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    const relatedTarget = event.relatedTarget
    if (relatedTarget instanceof Node) {
      const isMovingToActionsMenu = actionsMenuRef.current?.contains(relatedTarget) ?? false
      const isMovingToReactionPicker = reactionPickerRef.current?.contains(relatedTarget) ?? false
      const isMovingToPreview = previewRef.current?.contains(relatedTarget) ?? false

      if (isMovingToActionsMenu || isMovingToReactionPicker || isMovingToPreview) {
        return
      }
    }

    if (!isReactionPickerOpen) {
      setIsHovered(false)
    }
  }, [isReactionPickerOpen])

  useEffect(() => {
    if (!previewAnchorRect && !isReactionPickerOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (previewRef.current && !previewRef.current.contains(target)) {
        setPreviewAnchorRect(null)
      }
      const clickedInTrigger = reactionTriggerRef.current?.contains(target) ?? false
      const clickedInActionsMenu = actionsMenuRef.current?.contains(target) ?? false
      const clickedInPicker = reactionPickerRef.current?.contains(target) ?? false
      if (!clickedInTrigger && !clickedInActionsMenu && !clickedInPicker) {
        setIsReactionPickerOpen(false)
        setIsHovered(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setPreviewAnchorRect(null)
      setIsReactionPickerOpen(false)
    }

    window.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isReactionPickerOpen, previewAnchorRect])

  useEffect(() => {
    if (!isReactionPickerOpen) return

    updateReactionPickerPosition()

    const handleViewportChange = () => {
      updateReactionPickerPosition()
    }

    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('scroll', handleViewportChange, true)

    return () => {
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('scroll', handleViewportChange, true)
    }
  }, [isReactionPickerOpen, updateReactionPickerPosition])

  return {
    message,
    grouped,
    isHovered,
    isEditing,
    editContent,
    isOwn,
    isMentioningMe,
    timestamp: formatTimestamp(message.createdAt),
    groupedTimestamp: format(new Date(message.createdAt), 'HH:mm'),
    renderedContent,
    previewAnchorRect,
    isReactionPickerOpen,
    reactionPickerStyle,
    previewMember,
    status,
    isOwner,
    previewRef,
    actionsMenuRef,
    reactionPickerRef,
    reactionTriggerRef,
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: handleMouseLeave,
    onOpenPreview: handleOpenPreview,
    onEditContentChange: handleEditContentChange,
    onEditKeyDown: handleEditKeyDown,
    onStartEditing: () => {
      setIsReactionPickerOpen(false)
      setIsEditing(true)
    },
    onCancelEditing: () => {
      setEditContent(message.content ?? '')
      setIsEditing(false)
    },
    onDelete: () => {
      void handleDelete()
    },
    onReaction: (emoji: string) => {
      void handleReaction(emoji)
    },
    onToggleReactionPicker: () => {
      setIsReactionPickerOpen((previous) => {
        const next = !previous
        if (next) {
          setIsHovered(true)
          requestAnimationFrame(updateReactionPickerPosition)
        }
        return next
      })
    },
    onPickReaction: (emoji: string) => {
      setIsReactionPickerOpen(false)
      void handleReaction(emoji)
    },
    onReply: handleReply,
  }
}
