import {
  formatBytes,
  type MessageItemAttachmentProps,
  type MessageItemAttachmentVisualProps,
} from './MessageItemAttachment.shared'

export function useMessageItemAttachmentModel({
  attachment,
}: MessageItemAttachmentProps): MessageItemAttachmentVisualProps {
  const isImage = attachment.contentType?.startsWith('image/') ?? false

  return {
    attachment,
    isImage,
    ...(attachment.width ? { imageMaxWidth: Math.min(400, attachment.width) } : {}),
    ...(attachment.sizeBytes ? { sizeLabel: formatBytes(attachment.sizeBytes) } : {}),
  }
}
