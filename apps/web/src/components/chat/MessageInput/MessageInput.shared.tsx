import type {
  ChangeEvent,
  DragEvent,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  RefObject,
} from 'react'
import { useEffect, useState } from 'react'
import { File, X } from 'lucide-react'
import type { Message } from '@/lib/types'

export const MAX_FILE_SIZE = 25 * 1024 * 1024
export const TYPING_DEBOUNCE_MS = 3000
export const ATTACHMENTS_ENABLED = false

export interface MessageInputProps {
  channelId: string
  channelName: string
  canSendMessages: boolean
}

export type SuggestionType = 'user' | 'channel'

export interface TokenContext {
  type: SuggestionType
  start: number
  caret: number
  query: string
}

export interface MentionSuggestion {
  id: string
  type: SuggestionType
  value: string
  label: string
  description?: string
  token: string
}

export interface MessageInputVisualProps {
  content: string
  attachmentsEnabled: boolean
  isSending: boolean
  isDragOver: boolean
  attachments: File[]
  suggestions: MentionSuggestion[]
  activeSuggestionIndex: number
  showSuggestions: boolean
  canSendMessages: boolean
  canSend: boolean
  placeholder: string
  inputChannelId: string
  replyTarget: Message | null
  replyPreviewContent: string
  textareaRef: RefObject<HTMLTextAreaElement | null>
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onTextareaChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  onTextareaKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  onTextareaClick: (event: MouseEvent<HTMLTextAreaElement>) => void
  onSend: () => void
  onDragOver: (event: DragEvent<HTMLDivElement>) => void
  onDragLeave: () => void
  onDrop: (event: DragEvent<HTMLDivElement>) => void
  onSuggestionMouseDown: (event: MouseEvent<HTMLButtonElement>, suggestion: MentionSuggestion) => void
  onRemoveAttachment: (index: number) => void
  onCancelReply: () => void
}

export function normalizeMentionTerm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function normalizeOutgoingContent(value: string): string {
  return value
    .replace(/#\{([^}]+)\}/g, '#$1')
}

export function AttachmentPreview({
  file,
  onRemove,
}: {
  file: File
  onRemove: () => void
}) {
  const isImage = file.type.startsWith('image/')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!isImage) {
      setPreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [file, isImage])

  return (
    <div className="group relative overflow-hidden rounded-lg border border-[var(--b1)]">
      {isImage && previewUrl ? (
        <img src={previewUrl} alt={file.name} className="h-16 w-16 object-cover" />
      ) : (
        <div className="flex h-16 w-32 items-center gap-2 bg-[var(--s2)] px-3">
          <File size={18} className="text-[var(--t3)]" />
          <span className="truncate text-[11px] text-[var(--t2)]">{file.name}</span>
        </div>
      )}
      <button
        onClick={onRemove}
        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--dnd)] opacity-0 transition-opacity group-hover:opacity-100"
      >
        <X size={10} className="text-white" />
      </button>
    </div>
  )
}

export function SuggestionTypeLabel({ type }: { type: SuggestionType }) {
  return (
    <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-[var(--t4)]">
      {type === 'user' ? 'usuario' : 'canal'}
    </span>
  )
}

export function SuggestionPrefix({ type, children }: { type: SuggestionType; children: ReactNode }) {
  const normalizedChildren =
    typeof children === 'string' || typeof children === 'number'
      ? String(children).replace(/^[@#]+/, '')
      : children

  return (
    <span className="truncate">
      {type === 'user' ? '@' : '#'}
      {normalizedChildren}
    </span>
  )
}
