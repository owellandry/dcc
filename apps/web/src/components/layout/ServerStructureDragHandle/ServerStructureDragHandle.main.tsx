'use client'

import { GripVertical } from 'lucide-react'
import type { DragEventHandler } from 'react'
import { cn } from '@/lib/cn'

interface ServerStructureDragHandleProps {
  label: string
  disabled?: boolean
  className?: string
  onDragStart?: DragEventHandler<HTMLButtonElement>
  onDragEnd?: DragEventHandler<HTMLButtonElement>
}

export function ServerStructureDragHandle({
  label,
  disabled = false,
  className,
  onDragStart,
  onDragEnd,
}: ServerStructureDragHandleProps) {
  return (
    <button
      type="button"
      draggable={!disabled}
      aria-label={label}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      onPointerDown={(event) => {
        event.stopPropagation()
      }}
      onDragStart={disabled ? undefined : onDragStart}
      onDragEnd={disabled ? undefined : onDragEnd}
      className={cn(
        'inline-flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-lg text-[var(--t4)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--t1)] active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      data-tooltip={label}
      data-tooltip-position="bottom"
      disabled={disabled}
    >
      <GripVertical size={14} />
    </button>
  )
}
