'use client'

import { useEffect, useMemo, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { linksApi, resolveMediaUrl } from '@/lib/api'
import { extractFirstUrl } from '@/components/chat/messageItemUtils'

interface Props {
  content: string | null
  onOpenExternalLink?: (url: string) => void
}

interface LinkPreviewData {
  url: string
  title: string | null
  description: string | null
  image: string | null
  siteName: string | null
  hostname: string | null
}

const previewCache = new Map<string, LinkPreviewData | null>()

export function MessageLinkPreview({ content, onOpenExternalLink }: Props) {
  const previewUrl = useMemo(() => extractFirstUrl(content), [content])
  const canRequestPreview = useMemo(() => isPreviewableUrl(previewUrl), [previewUrl])
  const [preview, setPreview] = useState<LinkPreviewData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!previewUrl || !canRequestPreview) {
      setPreview(null)
      return
    }

    if (previewCache.has(previewUrl)) {
      setPreview(previewCache.get(previewUrl) ?? null)
      return
    }

    let cancelled = false
    setIsLoading(true)

    linksApi
      .preview(previewUrl)
      .then((response) => {
        if (cancelled) return
        const data = response.data
        previewCache.set(previewUrl, data)
        setPreview(data)
      })
      .catch(() => {
        if (cancelled) return
        previewCache.set(previewUrl, null)
        setPreview(null)
      })
      .finally(() => {
        if (cancelled) return
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [canRequestPreview, previewUrl])

  if (!previewUrl) return null
  if (!canRequestPreview) return null

  if (isLoading) {
    return <div className="mt-2 h-20 w-full max-w-[460px] animate-pulse rounded-xl border border-[var(--b1)] bg-[var(--s1)]" />
  }

  if (!preview) return null

  const imageUrl = resolveMediaUrl(preview.image)
  const title = preview.title ?? preview.url
  const subtitle = preview.description ?? preview.siteName ?? preview.hostname ?? preview.url

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => {
        if (!onOpenExternalLink) return
        event.preventDefault()
        onOpenExternalLink(preview.url)
      }}
      className="mt-2 flex w-full max-w-[460px] overflow-hidden rounded-xl border border-[var(--b1)] bg-[var(--s1)] transition-colors hover:border-[var(--b2)] hover:bg-[var(--s2)]"
    >
      {imageUrl && (
        <div className="h-[96px] w-[120px] shrink-0 bg-[var(--s0)]">
          <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
        </div>
      )}
      <div className="min-w-0 flex-1 px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--t3)]">
          <span className="truncate">{preview.siteName ?? preview.hostname ?? 'Enlace'}</span>
          <ExternalLink size={12} />
        </div>
        <p className="mt-1 line-clamp-1 text-[13px] font-700 text-[var(--t0)]">{title}</p>
        <p className="mt-0.5 line-clamp-2 text-[12px] text-[var(--t2)]">{subtitle}</p>
      </div>
    </a>
  )
}

function isPreviewableUrl(url: string | null): boolean {
  if (!url) return false

  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
    const hostname = parsed.hostname.toLowerCase()

    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return false
    if (hostname.endsWith('.local')) return false

    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return false
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return false

    const private172 = /^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(hostname)
    if (private172) {
      const secondOctet = Number(private172[1])
      if (secondOctet >= 16 && secondOctet <= 31) return false
    }

    return true
  } catch {
    return false
  }
}
