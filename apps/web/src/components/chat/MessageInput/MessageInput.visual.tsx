'use client'

import { PlusCircle, Send, Smile } from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  AttachmentPreview,
  SuggestionPrefix,
  SuggestionTypeLabel,
  type MessageInputVisualProps,
} from './MessageInput.shared'

export function MessageInputVisual({
  content,
  attachmentsEnabled,
  isSending,
  isDragOver,
  attachments,
  suggestions,
  activeSuggestionIndex,
  showSuggestions,
  canSendMessages,
  canSend,
  placeholder,
  inputChannelId,
  replyTarget,
  textareaRef,
  onFileChange,
  onTextareaChange,
  onTextareaKeyDown,
  onTextareaClick,
  onSend,
  onDragOver,
  onDragLeave,
  onDrop,
  onSuggestionMouseDown,
  onRemoveAttachment,
  onCancelReply,
}: MessageInputVisualProps) {
  return (
    <div
      className={cn(
        'relative rounded-xl border bg-[var(--s4)] transition-colors surface-raised',
        attachmentsEnabled && isDragOver ? 'border-[var(--ember)] bg-[var(--ember-dim)]' : 'border-[var(--b1)]'
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {replyTarget && (
        <div className="flex items-center justify-between border-b border-[var(--b0)] px-3 py-2 text-xs text-[var(--t2)]">
          <div className="flex min-w-0 items-center gap-1">
            <span className="shrink-0 text-[var(--t3)]">Respondiendo a</span>
            <span className="shrink-0 font-600 text-[var(--t1)]">{replyTarget.author.username}</span>
            <span className="min-w-0 truncate text-[var(--t3)]">
              {replyTarget.content ?? 'Adjunto'}
            </span>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="rounded-md px-2 py-1 text-[var(--t3)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--t1)]"
          >
            Cancelar
          </button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-[var(--b0)] p-3">
          {attachments.map((file, index) => (
            <AttachmentPreview
              key={`${file.name}-${index}`}
              file={file}
              onRemove={() => onRemoveAttachment(index)}
            />
          ))}
        </div>
      )}

      {showSuggestions && (
        <div className="absolute bottom-[calc(100%+8px)] left-3 z-20 w-80 overflow-hidden rounded-lg border border-[var(--b1)] bg-[var(--s2)] shadow-context">
          {suggestions.map((suggestion, index) => {
            const active = index === activeSuggestionIndex
            return (
              <button
                key={`${suggestion.type}-${suggestion.id}`}
                type="button"
                onMouseDown={(event) => onSuggestionMouseDown(event, suggestion)}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors',
                  active ? 'bg-[var(--ember-dim)] text-[var(--t0)]' : 'text-[var(--t2)] hover:bg-[var(--surface-soft)]'
                )}
              >
                <SuggestionPrefix type={suggestion.type}>{suggestion.label}</SuggestionPrefix>
                <SuggestionTypeLabel type={suggestion.type} />
              </button>
            )
          })}
        </div>
      )}

      <div className="flex items-end gap-2 px-3 py-2.5">
        <label
          data-tooltip={attachmentsEnabled ? 'Adjuntar archivos' : 'Adjuntos proximamente'}
          data-tooltip-position="top"
          className={cn(
            'z-[99] flex shrink-0 items-center justify-center rounded-md p-1.5 text-[var(--t3)] transition-colors',
            attachmentsEnabled
              ? 'cursor-pointer hover:bg-[var(--surface-soft)] hover:text-[var(--t2)]'
              : 'cursor-not-allowed opacity-45'
          )}
        >
          <input
            type="file"
            multiple
            disabled={!canSendMessages || !attachmentsEnabled}
            className="hidden"
            onChange={onFileChange}
          />
          <PlusCircle size={20} />
        </label>

        <textarea
          ref={textareaRef}
          data-message-input-channel={inputChannelId}
          value={content}
          onChange={onTextareaChange}
          onKeyDown={onTextareaKeyDown}
          onClick={onTextareaClick}
          placeholder={placeholder}
          rows={1}
          className="scrollable max-h-[300px] flex-1 resize-none bg-transparent text-[15px] leading-relaxed text-[var(--t1)] placeholder:text-[var(--t4)] outline-none"
          style={{ height: 'auto' }}
          disabled={!canSendMessages}
        />

        <button
          data-tooltip="Emoji"
          data-tooltip-position="top"
          className="flex shrink-0 items-center justify-center rounded-md p-1.5 text-[var(--t3)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--t2)]"
        >
          <Smile size={20} />
        </button>

        {canSend && (
          <button
            onClick={onSend}
            disabled={isSending}
            className="flex shrink-0 items-center justify-center rounded-md bg-ember p-1.5 text-[var(--ember-contrast)] transition-all hover:bg-ember-hover active:scale-95 disabled:opacity-50 animate-pop"
          >
            <Send size={18} />
          </button>
        )}
      </div>

      {attachmentsEnabled && isDragOver && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl">
          <p className="font-display text-sm font-600 text-ember">Drop files here</p>
        </div>
      )}
    </div>
  )
}
