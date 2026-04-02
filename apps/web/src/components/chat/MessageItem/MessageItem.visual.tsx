'use client'

import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { useCallback, useState } from 'react'
import { CornerUpLeft, Pencil, Smile, Trash2 } from 'lucide-react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'
import { interactiveMotion, motion, overlayCardVariants } from '@/lib/motion'
import { UserAvatar } from '@/components/user/UserAvatar'
import { OfficialMemberTag, hasOfficialMemberBadge } from '@/components/user/Badge'
import { MemberPreviewCard } from '@/components/user/MemberPreviewCard'
import { ReactionPicker } from '../ReactionPicker'
import { SystemWelcomeCard } from '../MessageItemSystemWelcomeCard'
import { MessageItemAttachment } from '../MessageItemAttachment'
import { MessageLinkPreview } from '../MessageLinkPreview'
import { ExternalNavigationModal } from '../ExternalNavigationModal'
import type { MessageItemVisualProps } from './MessageItem.shared'

export function MessageItemVisual({
  message,
  grouped,
  isHovered,
  isEditing,
  editContent,
  isOwn,
  isMentioningMe,
  timestamp,
  groupedTimestamp,
  renderedContent,
  previewAnchorRect,
  previewMember,
  status,
  isOwner,
  previewRef,
  actionsMenuRef,
  reactionPickerRef,
  reactionTriggerRef,
  reactionPickerStyle,
  onMouseEnter,
  onMouseLeave,
  onOpenPreview,
  onEditContentChange,
  onEditKeyDown,
  onStartEditing,
  onCancelEditing,
  onDelete,
  onReaction,
  isReactionPickerOpen,
  onToggleReactionPicker,
  onPickReaction,
  onReply,
}: MessageItemVisualProps) {
  if (message.type === 'system') {
    return <SystemWelcomeCard message={message} />
  }

  const isOfficialAuthor = hasOfficialMemberBadge({ user: message.author })
  const [externalTargetUrl, setExternalTargetUrl] = useState<string | null>(null)

  const handleOpenExternalModal = useCallback((url: string) => {
    setExternalTargetUrl(url)
  }, [])

  const handleCloseExternalModal = useCallback(() => {
    setExternalTargetUrl(null)
  }, [])

  const handleConfirmExternalNavigation = useCallback(() => {
    if (!externalTargetUrl) return
    const lowerUrl = externalTargetUrl.toLowerCase()
    if (lowerUrl.startsWith('mailto:') || lowerUrl.startsWith('tel:')) {
      window.location.href = externalTargetUrl
    } else {
      window.open(externalTargetUrl, '_blank', 'noopener,noreferrer')
    }
    setExternalTargetUrl(null)
  }, [externalTargetUrl])

  return (
    <motion.div
      className={cn(
        'group relative flex items-start gap-3 px-4 transition-colors',
        // Espaciado compacto tipo chat
        grouped ? 'py-0.5' : message.replyTo ? 'pt-4 pb-2' : 'py-2.5',
        // Hover sutil del mensaje
        'hover:bg-[var(--surface-soft)] border-l-2 border-transparent hover:border-l-[var(--b1)]/60',
        isMentioningMe && 'border-l-ember/80 bg-[rgba(255,176,77,0.09)] shadow-[inset_0_0_0_1px_rgba(255,176,77,0.12)]'
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      initial={{ opacity: 0, y: grouped ? 4 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
    >
      {/* Avatar / Timestamp compacto */}
      <div className="w-10 shrink-0">
        {grouped ? (
          <span
            className={cn(
              'block text-right text-[10px] text-[var(--t4)] transition-opacity',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
          >
            {groupedTimestamp}
          </span>
        ) : (
          <button
            onClick={onOpenPreview}
            className={cn('block rounded-full', message.replyTo ? 'mt-[40px]' : 'mt-[9px]')}
            type="button"
          >
            <UserAvatar user={message.author} size={40} />
          </button>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {/* Reply context */}
        {message.replyTo && <ReplyContext replyTo={message.replyTo} />}

        {/* Header solo en mensajes no agrupados */}
        {!grouped && (
          <div className="mb-0.5 flex items-baseline gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenPreview}
                className="truncate cursor-pointer text-[15px] font-700 text-[var(--t0)] transition-colors hover:text-[var(--t0)] hover:underline"
              >
                {message.author.username}
              </button>
              {isOfficialAuthor && <OfficialMemberTag compact className="translate-y-[1px]" />}
            </div>
            <span className="text-[11px] text-[var(--t4)]">{timestamp}</span>
          </div>
        )}

        {/* Contenido o edición */}
        {isEditing ? (
          <div className="flex flex-col gap-1.5">
            <textarea
              autoFocus
              value={editContent}
              onChange={onEditContentChange}
              onKeyDown={onEditKeyDown}
              className="min-h-[60px] w-full resize-none rounded-xl border border-[var(--ember)]/35 bg-[var(--s0)] px-3 py-2 text-sm text-[var(--t0)] shadow-[0_0_0_1px_rgba(255,176,77,0.1)] outline-none focus:border-[var(--ember)]/70 focus:shadow-[0_0_0_2px_rgba(255,176,77,0.16)]"
            />
            <div className="flex gap-2 text-xs text-[var(--t3)]">
              <span>Enter para guardar</span>
              <span className="text-[var(--t4)]">•</span>
              <button
                type="button"
                onClick={onCancelEditing}
                className="text-[var(--dnd)] transition-colors hover:text-[#ff6b7a] hover:underline"
              >
                Escape para cancelar
              </button>
            </div>
          </div>
        ) : (
          <MessageContent
            content={message.content}
            renderedContent={renderedContent}
            isEdited={!!message.isEdited}
            attachments={message.attachments}
            onOpenExternalLink={handleOpenExternalModal}
          />
        )}

        {/* Reacciones */}
        {message.reactions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {message.reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                type="button"
                onClick={() => onReaction(reaction.emoji)}
                className={cn(
                  'flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-all animate-pop',
                  reaction.meReacted
                    ? 'border-ember/45 bg-[var(--ember-dim)] text-ember shadow-[0_0_0_1px_rgba(255,176,77,0.15)]'
                    : 'border-[var(--b1)] bg-[var(--surface-soft)] text-[var(--t2)] hover:border-[var(--b2)] hover:bg-[var(--surface-soft-hover)] hover:text-[var(--t1)]'
                )}
              >
                <span>{reaction.emoji}</span>
                <span className="font-600">{reaction.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Barra de acciones del mensaje */}
      {(isHovered || isReactionPickerOpen) && !isEditing && (
        <div
          ref={actionsMenuRef}
          className="absolute right-4 top-1 flex items-center gap-0.5 rounded-xl border border-[var(--b1)] bg-[var(--s0)] p-1 shadow-context opacity-0 transition-all duration-150 group-hover:opacity-100"
        >
          <div ref={reactionTriggerRef} className="relative">
            <ActionButton
              title="Reaccionar"
              icon={<Smile size={18} />}
              onActivate={onToggleReactionPicker}
              triggerOnMouseDown
            />
          </div>
          <ActionButton title="Responder" icon={<CornerUpLeft size={18} />} onActivate={onReply} />
          {isOwn && (
            <>
              <ActionButton title="Editar" icon={<Pencil size={18} />} onActivate={onStartEditing} />
              <ActionButton title="Eliminar" icon={<Trash2 size={18} />} onActivate={onDelete} danger />
            </>
          )}
        </div>
      )}

      {/* Picker de reacciones (portal) */}
      {isReactionPickerOpen && typeof document !== 'undefined'
        ? createPortal(
            <div style={reactionPickerStyle} className="fixed z-[1000]">
              <ReactionPicker pickerRef={reactionPickerRef} onPick={onPickReaction} />
            </div>,
            document.body
          )
        : null}

      {/* Preview del usuario */}
      {previewAnchorRect && (
        <MemberPreviewCard
          previewRef={previewRef}
          member={previewMember}
          status={status}
          isOwner={isOwner}
          anchorRect={previewAnchorRect}
          preferredPlacement="right"
        />
      )}

      {createPortal(
        <ExternalNavigationModal
          open={externalTargetUrl !== null}
          url={externalTargetUrl}
          onCancel={handleCloseExternalModal}
          onContinue={handleConfirmExternalNavigation}
        />,
        document.body
      )}
    </motion.div>
  )
}

/* ====================== COMPONENTES AUXILIARES ====================== */

function ReplyContext({
  replyTo,
}: {
  replyTo: NonNullable<MessageItemVisualProps['message']['replyTo']>
}) {
  const previewText = getReplyPreviewText(replyTo)
  const isOfficialAuthor = hasOfficialMemberBadge({ user: replyTo.author })

  return (
    <div className="mb-2 mt-[10px] flex items-center gap-2 text-[13px]">
      {/* Spine del reply */}
      <div
        aria-hidden="true"
        className="-ml-8 mt-2 h-4 w-7 shrink-0 rounded-tl-xl border-l-2 border-t-2 border-[var(--b2)]/70"
      />

      <UserAvatar user={replyTo.author} size={16} className="rounded-full" />

      <span className="flex min-w-0 items-center gap-1.5 font-semibold text-[var(--t2)] transition-colors group-hover:text-[var(--t1)]">
        <span className="truncate">{replyTo.author.username}</span>
        {isOfficialAuthor && <OfficialMemberTag compact className="translate-y-[1px]" />}
      </span>

      {previewText && (
        <span className="min-w-0 truncate text-[var(--t2)]/85 transition-colors group-hover:text-[var(--t1)]/80">
          {previewText}
        </span>
      )}
    </div>
  )
}

function MessageContent({
  content,
  renderedContent,
  isEdited,
  attachments,
  onOpenExternalLink,
}: {
  content: string | null
  renderedContent: ReactNode
  isEdited: boolean
  attachments: MessageItemVisualProps['message']['attachments']
  onOpenExternalLink: (url: string) => void
}) {
  const handleContentClickCapture = useCallback((event: ReactMouseEvent<HTMLParagraphElement>) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    const link = target.closest('a[href]') as HTMLAnchorElement | null
    if (!link) return
    const href = link.getAttribute('href')
    if (!href) return
    if (href.startsWith('/')) return
    if (href.startsWith('#')) return
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      const isSameOriginHttp = (href.startsWith('http://') || href.startsWith('https://'))
        && typeof window !== 'undefined'
        && (() => {
          try {
            return new URL(href).origin === window.location.origin
          } catch {
            return false
          }
        })()
      if (isSameOriginHttp) return
      event.preventDefault()
      onOpenExternalLink(href)
    }
  }, [onOpenExternalLink])

  return (
    <div className="message-content">
      {content && (
        <p className="message-body" onClickCapture={handleContentClickCapture}>
          {renderedContent}
          {isEdited && <span className="ml-1 text-[11px] text-[var(--t4)]">(editado)</span>}
        </p>
      )}

      <MessageLinkPreview content={content} onOpenExternalLink={onOpenExternalLink} />

      {attachments.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <MessageItemAttachment key={attachment.id} attachment={attachment} />
          ))}
        </div>
      )}
    </div>
  )
}

function getReplyPreviewText(replyTo: NonNullable<MessageItemVisualProps['message']['replyTo']>) {
  if (replyTo.content?.trim()) return replyTo.content
  if (replyTo.attachments.length > 0) {
    return replyTo.attachments.length === 1 ? 'Archivo adjunto' : 'Archivos adjuntos'
  }
  return 'Mensaje sin texto'
}

function ActionButton({
  icon,
  title,
  onActivate,
  danger,
  triggerOnMouseDown,
}: {
  icon: ReactNode
  title: string
  onActivate: () => void
  danger?: boolean
  triggerOnMouseDown?: boolean
}) {
  return (
    <motion.button
      type="button"
      data-tooltip={title}
      data-tooltip-position="top"
      onClick={triggerOnMouseDown ? undefined : onActivate}
      onMouseDown={
        triggerOnMouseDown
          ? (e) => {
              e.preventDefault()
              onActivate()
            }
          : undefined
      }
      onKeyDown={
        triggerOnMouseDown
          ? (e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return
              e.preventDefault()
              onActivate()
            }
          : undefined
      }
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-lg border border-transparent transition-all hover:bg-[var(--surface-soft-hover)]',
        danger
          ? 'text-[var(--t3)] hover:border-[var(--dnd)]/30 hover:bg-[var(--dnd)]/15 hover:text-[var(--dnd)]'
          : 'text-[var(--t3)] hover:text-[var(--t1)]'
      )}
      {...interactiveMotion}
    >
      {icon}
    </motion.button>
  )
}
