'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import toast from 'react-hot-toast'
import { ApiRequestError, channelsApi } from '@/lib/api'
import { useMessagesStore } from '@/stores/messagesStore'
import { useServerChannels, useServerMembers, useServersStore } from '@/stores/serversStore'
import {
  ATTACHMENTS_ENABLED,
  MAX_FILE_SIZE,
  normalizeMentionTerm,
  normalizeOutgoingContent,
  TYPING_DEBOUNCE_MS,
  type MentionSuggestion,
  type MessageInputProps,
  type MessageInputVisualProps,
  type SuggestionType,
} from './MessageInput.shared'

interface ActiveMatch {
  type: SuggestionType
  start: number
  query: string
}

export function useMessageInputController({
  channelId,
  channelName,
  canSendMessages,
}: MessageInputProps): MessageInputVisualProps {
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [tokenContext, setTokenContext] = useState<{
    type: SuggestionType
    start: number
    caret: number
    query: string
  } | null>(null)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { appendMessage, clearReplyTarget } = useMessagesStore()
  const replyTarget = useMessagesStore((state) => state.replyTargets[channelId] ?? null)
  const serverId = useServersStore((state) => state.channels[channelId]?.serverId ?? null)
  const serverMembers = useServerMembers(serverId)
  const serverChannels = useServerChannels(serverId)

  const sendTyping = useCallback(() => {
    if (typingTimeout.current) return
    typingTimeout.current = setTimeout(() => {
      typingTimeout.current = null
    }, TYPING_DEBOUNCE_MS)
  }, [])

  const syncTokenContext = useCallback((value: string, caret: number) => {
    const activeMatch = resolveActiveMatch(value, caret)

    if (!activeMatch) {
      setTokenContext(null)
      return
    }

    setTokenContext({
      type: activeMatch.type,
      start: activeMatch.start,
      caret,
      query: activeMatch.query,
    })
    setActiveSuggestionIndex(0)
  }, [])

  const suggestions = useMemo<MentionSuggestion[]>(() => {
    if (!tokenContext) return []
    const query = normalizeMentionTerm(tokenContext.query)

    if (tokenContext.type === 'user') {
      return serverMembers
        .map((member) => ({
          id: member.userId,
          type: 'user' as const,
          value: member.user.username,
          label: member.nickname ? `${member.user.username} (${member.nickname})` : member.user.username,
        }))
        .filter((item) => {
          if (!query) return true
          const normalizedLabel = normalizeMentionTerm(item.label)
          const normalizedValue = normalizeMentionTerm(item.value)
          return normalizedLabel.includes(query) || normalizedValue.includes(query)
        })
        .slice(0, 6)
    }

    return serverChannels
      .filter((channel) => channel.type === 'text' && channel.name)
      .map((channel) => ({
        id: channel.id,
        type: 'channel' as const,
        value: channel.name ?? '',
        label: channel.name ?? '',
      }))
      .filter((item) => {
        if (!query) return true
        return normalizeMentionTerm(item.label).includes(query)
      })
      .slice(0, 6)
  }, [serverChannels, serverMembers, tokenContext])

  const applySuggestion = useCallback((suggestion: MentionSuggestion) => {
    if (!tokenContext || !textareaRef.current) return
    const textarea = textareaRef.current
    const caret = textarea.selectionStart ?? tokenContext.caret
    const before = content.slice(0, tokenContext.start)
    const after = content.slice(caret)
    const token = suggestion.type === 'user' ? `@${suggestion.value}` : `#${suggestion.value}`
    const nextContent = `${before}${token} ${after}`
    const nextCaret = before.length + token.length + 1

    setContent(nextContent)
    setTokenContext(null)
    setActiveSuggestionIndex(0)

    requestAnimationFrame(() => {
      if (!textareaRef.current) return
      textareaRef.current.focus()
      textareaRef.current.selectionStart = nextCaret
      textareaRef.current.selectionEnd = nextCaret
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`
    })
  }, [content, tokenContext])

  const handleSend = useCallback(async () => {
    if (!canSendMessages) return
    const normalizedContent = normalizeOutgoingContent(content)
    const text = normalizedContent.trim()
    if (!text) return
    if (isSending) return

    setIsSending(true)
    const previousContent = content
    setContent('')
    setTokenContext(null)
    setActiveSuggestionIndex(0)
    setAttachments([])

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      const payload = {
        ...(text ? { content: text } : {}),
        ...(replyTarget ? { replyToId: replyTarget.id } : {}),
      }
      const response = await channelsApi.sendMessage(channelId, payload)
      appendMessage(response.data)
      if (replyTarget) {
        clearReplyTarget(channelId)
      }
    } catch (error) {
      setContent(previousContent)
      if (error instanceof ApiRequestError && error.status === 403) {
        toast.error('Este canal es solo de lectura para tu rol')
      } else {
        toast.error('No se pudo enviar el mensaje')
      }
    } finally {
      setIsSending(false)
      textareaRef.current?.focus()
    }
  }, [appendMessage, canSendMessages, channelId, clearReplyTarget, content, isSending, replyTarget])

  const handleTextareaKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (tokenContext && suggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveSuggestionIndex((previous) => (previous + 1) % suggestions.length)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveSuggestionIndex((previous) => (previous - 1 + suggestions.length) % suggestions.length)
        return
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        const selectedSuggestion = suggestions[activeSuggestionIndex] ?? suggestions[0]
        if (selectedSuggestion) {
          applySuggestion(selectedSuggestion)
        }
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        setTokenContext(null)
        return
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }, [activeSuggestionIndex, applySuggestion, handleSend, suggestions, tokenContext])

  const handleTextareaChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value
    setContent(nextValue)
    sendTyping()
    const textarea = event.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`
    const caret = textarea.selectionStart ?? nextValue.length
    syncTokenContext(nextValue, caret)
  }, [sendTyping, syncTokenContext])

  const handleTextareaClick = useCallback((event: MouseEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget
    const caret = textarea.selectionStart ?? textarea.value.length
    syncTokenContext(textarea.value, caret)
  }, [syncTokenContext])

  const addFiles = useCallback((files: File[]) => {
    const validFiles = files.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} supera el limite de 25 MB`)
        return false
      }
      return true
    })
    setAttachments((previous) => [...previous, ...validFiles].slice(0, 10))
  }, [])

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return
    addFiles(Array.from(event.target.files))
  }, [addFiles])

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!ATTACHMENTS_ENABLED) return
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!ATTACHMENTS_ENABLED) return
    setIsDragOver(false)
    addFiles(Array.from(event.dataTransfer.files))
  }, [addFiles])

  const handleSuggestionMouseDown = useCallback((
    event: MouseEvent<HTMLButtonElement>,
    suggestion: MentionSuggestion,
  ) => {
    event.preventDefault()
    applySuggestion(suggestion)
  }, [applySuggestion])

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments((previous) => previous.filter((_, currentIndex) => currentIndex !== index))
  }, [])

  useEffect(() => {
    if (!replyTarget || !textareaRef.current) return

    const textarea = textareaRef.current
    requestAnimationFrame(() => {
      textarea.focus()
      const length = textarea.value.length
      textarea.selectionStart = length
      textarea.selectionEnd = length
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`
    })
  }, [replyTarget])

  return {
    content,
    attachmentsEnabled: ATTACHMENTS_ENABLED,
    isSending,
    isDragOver,
    attachments,
    suggestions,
    activeSuggestionIndex,
    showSuggestions: tokenContext !== null && suggestions.length > 0,
    canSendMessages,
    canSend: canSendMessages && content.trim().length > 0,
    placeholder: canSendMessages ? `Escribe en #${channelName}` : 'Este canal es solo de lectura',
    inputChannelId: channelId,
    replyTarget,
    textareaRef,
    onFileChange: handleFileChange,
    onTextareaChange: handleTextareaChange,
    onTextareaKeyDown: handleTextareaKeyDown,
    onTextareaClick: handleTextareaClick,
    onSend: handleSend,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
    onSuggestionMouseDown: handleSuggestionMouseDown,
    onRemoveAttachment: handleRemoveAttachment,
    onCancelReply: () => clearReplyTarget(channelId),
  }
}

function resolveActiveMatch(value: string, caret: number): ActiveMatch | null {
  const textUntilCaret = value.slice(0, caret)
  const userMatch = /(?:^|\s)(@\{?)([^\s}]*)$/.exec(textUntilCaret)
  const channelMatch = /(?:^|\s)(#\{?)([^\s}]*)$/.exec(textUntilCaret)

  const matches = [
    createMatch('user', userMatch),
    createMatch('channel', channelMatch),
  ].filter((match): match is ActiveMatch => match !== null)

  return matches.sort((left, right) => right.start - left.start)[0] ?? null
}

function createMatch(type: SuggestionType, match: RegExpExecArray | null): ActiveMatch | null {
  if (!match) return null

  const prefix = match[1] ?? (type === 'user' ? '@' : '#')

  return {
    type,
    start: match.index + match[0].lastIndexOf(prefix),
    query: match[2] ?? '',
  }
}
