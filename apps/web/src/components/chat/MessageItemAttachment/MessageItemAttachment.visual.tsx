'use client'

import { File } from 'lucide-react'
import { type MessageItemAttachmentVisualProps } from './MessageItemAttachment.shared'

export function MessageItemAttachmentVisual({
  attachment,
  isImage,
  imageMaxWidth,
  sizeLabel,
}: MessageItemAttachmentVisualProps) {
  if (isImage) {
    return (
      <div className="overflow-hidden rounded-lg border border-[var(--b1)]" style={{ maxWidth: 400 }}>
        <img
          src={attachment.url}
          alt={attachment.filename}
          className="max-h-80 w-auto object-contain"
          style={imageMaxWidth ? { maxWidth: imageMaxWidth } : undefined}
        />
      </div>
    )
  }

  return (
    <a
      href={attachment.url}
      download={attachment.filename}
      className="flex items-center gap-2.5 rounded-lg border border-[var(--b1)] bg-[var(--s2)] px-3 py-2 text-sm text-[var(--t2)] transition-colors hover:border-[var(--b2)] hover:text-[var(--t1)]"
    >
      <File size={18} />
      <div>
        <p className="text-[13px] font-500 text-[var(--t0)]">{attachment.filename}</p>
        {sizeLabel && <p className="text-[11px]">{sizeLabel}</p>}
      </div>
    </a>
  )
}
