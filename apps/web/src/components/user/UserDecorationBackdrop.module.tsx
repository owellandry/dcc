'use client'

import { resolveMediaUrl } from '@/lib/api'
import { cn } from '@/lib/cn'

interface UserDecorationBackdropProps {
  src?: string | null
  className?: string
  imageClassName?: string
}

export function UserDecorationBackdrop({
  src,
  className,
  imageClassName,
}: UserDecorationBackdropProps) {
  const resolvedSrc = resolveMediaUrl(src)
  if (!resolvedSrc) return null

  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]',
        className
      )}
    >
      <span className="absolute inset-0 bg-[linear-gradient(90deg,rgba(198,214,255,0.18)_0%,rgba(198,214,255,0.32)_100%)]" />
      <img
        src={resolvedSrc}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className={cn(
          'absolute inset-0 h-full w-full object-cover object-right opacity-95',
          imageClassName
        )}
      />
      <span className="absolute inset-0 bg-[linear-gradient(90deg,rgba(244,247,255,0.86)_0%,rgba(228,236,255,0.68)_38%,rgba(214,226,255,0.14)_100%)]" />
      <span className="absolute inset-0 rounded-[inherit] border border-white/10" />
    </div>
  )
}
