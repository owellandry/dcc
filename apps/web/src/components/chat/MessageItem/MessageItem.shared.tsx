import type {
  CSSProperties,
  ChangeEvent,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  RefObject,
} from 'react'
import type { Message, ServerMember, UserStatus } from '@/lib/types'
import type { FloatingAnchorRect } from '@/lib/layout/floatingCard.shared'

export interface MessageItemProps {
  message: Message
  grouped: boolean
}

export interface MessageItemVisualProps {
  message: Message
  grouped: boolean
  isHovered: boolean
  isEditing: boolean
  editContent: string
  isOwn: boolean
  isMentioningMe: boolean
  timestamp: string
  groupedTimestamp: string
  renderedContent: ReactNode
  previewAnchorRect: FloatingAnchorRect | null
  previewMember: ServerMember
  status: UserStatus
  isOwner: boolean
  previewRef: RefObject<HTMLDivElement | null>
  actionsMenuRef: RefObject<HTMLDivElement | null>
  reactionPickerRef: RefObject<HTMLDivElement | null>
  reactionTriggerRef: RefObject<HTMLDivElement | null>
  reactionPickerStyle: CSSProperties
  onMouseEnter: () => void
  onMouseLeave: (event: MouseEvent<HTMLElement>) => void
  onOpenPreview: (event: MouseEvent<HTMLElement>) => void
  onEditContentChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  onEditKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  onStartEditing: () => void
  onCancelEditing: () => void
  onDelete: () => void
  onReaction: (emoji: string) => void
  isReactionPickerOpen: boolean
  onToggleReactionPicker: () => void
  onPickReaction: (emoji: string) => void
  onReply: () => void
}

export function normalizeMentionTerm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}
