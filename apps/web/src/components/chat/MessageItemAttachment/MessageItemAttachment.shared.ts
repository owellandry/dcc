import type { Attachment } from '@/lib/types'

export interface MessageItemAttachmentProps {
  attachment: Attachment
}

export interface MessageItemAttachmentVisualProps {
  attachment: Attachment
  isImage: boolean
  imageMaxWidth?: number
  sizeLabel?: string
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
