'use client'

import { cn } from '@/lib/cn'

export interface FencedCodeBlock {
  language: string | null
  code: string
}

export function extractFencedCodeBlocks(content: string): FencedCodeBlock[] {
  const blocks: FencedCodeBlock[] = []
  const pattern = /```([a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(content)) !== null) {
    blocks.push({
      language: match[1]?.trim() || null,
      code: (match[2] ?? '').replace(/\n$/, ''),
    })
  }

  return blocks
}

export function splitByFencedCodeBlocks(content: string): Array<
  | { type: 'text'; value: string }
  | { type: 'code'; code: string; language: string | null }
> {
  const segments: Array<
    | { type: 'text'; value: string }
    | { type: 'code'; code: string; language: string | null }
  > = []
  const pattern = /```([a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(content)) !== null) {
    const start = match.index
    const end = pattern.lastIndex
    if (start > lastIndex) {
      segments.push({ type: 'text', value: content.slice(lastIndex, start) })
    }
    segments.push({
      type: 'code',
      language: match[1]?.trim() || null,
      code: (match[2] ?? '').replace(/\n$/, ''),
    })
    lastIndex = end
  }

  if (lastIndex < content.length) {
    segments.push({ type: 'text', value: content.slice(lastIndex) })
  }

  if (segments.length === 0) {
    segments.push({ type: 'text', value: content })
  }

  return segments
}

export function CodeEditorBlock({
  code,
  language,
  compact = false,
}: {
  code: string
  language?: string | null
  compact?: boolean
}) {
  return (
    <div className={cn('my-1 overflow-hidden rounded-lg border border-[var(--b1)] bg-[var(--s1)]', compact && 'my-0.5')}>
      <div className={cn('flex items-center border-b border-[var(--b1)] px-2.5 py-1', compact && 'py-0.5')}>
        <span className="text-[9px] font-700 uppercase tracking-[0.1em] text-[var(--t4)]">
          {language || 'code'}
        </span>
      </div>
      <pre
        className={cn(
          'scrollable overflow-x-auto px-2.5 py-2 font-mono text-[11px] leading-5 text-[var(--t1)]',
          compact && 'px-2 py-1.5 text-[10px] leading-4'
        )}
      >
        <code>{code}</code>
      </pre>
    </div>
  )
}
