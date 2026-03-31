'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, FolderUp, LoaderCircle, Sparkles, X } from 'lucide-react'

interface Props {
  open: boolean
  title: string
  isBusy?: boolean
  onClose: () => void
  onPickLocal: () => void
  onPickGiphy: (url: string) => Promise<void>
}

export function MediaSourcePickerModal({
  open,
  title,
  isBusy = false,
  onClose,
  onPickLocal,
  onPickGiphy,
}: Props) {
  const [giphyUrl, setGiphyUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setGiphyUrl('')
    setError(null)
    setIsSubmitting(false)
  }, [open])

  if (!open) return null

  const handlePickLocal = () => {
    if (isBusy || isSubmitting) return
    onPickLocal()
  }

  const handleSubmitGiphy = async () => {
    const url = giphyUrl.trim()
    if (!url) {
      setError('Pega un enlace de Giphy.')
      return
    }
    if (!url.includes('giphy.com') && !url.includes('giphyusercontent.com')) {
      setError('El enlace debe ser de giphy.com.')
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      await onPickGiphy(url)
    } catch {
      setError('No se pudo usar ese enlace de Giphy.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-[var(--b1)] bg-[var(--s1)] shadow-[0_24px_52px_rgba(0,0,0,0.48)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--b1)] px-4 py-3">
          <p className="font-display text-[17px] font-700 text-[var(--t0)]">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--t3)] transition-colors hover:bg-[var(--s2)] hover:text-[var(--t1)]"
            disabled={isBusy || isSubmitting}
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <button
            type="button"
            onClick={handlePickLocal}
            className="flex w-full items-center justify-between rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3.5 py-3 text-left transition-colors hover:border-[var(--b2)]"
            disabled={isBusy || isSubmitting}
          >
            <span className="flex items-center gap-2 text-sm font-700 text-[var(--t1)]">
              <FolderUp size={16} />
              Desde tu PC
            </span>
            <span className="text-xs text-[var(--t4)]">JPG, PNG, GIF, WEBP</span>
          </button>

          <div className="rounded-xl border border-[var(--b1)] bg-[var(--s2)] p-3">
            <p className="mb-2 flex items-center gap-2 text-sm font-700 text-[var(--t1)]">
              <Sparkles size={15} />
              Desde Giphy
            </p>
            <div className="flex gap-2">
              <input
                value={giphyUrl}
                onChange={(event) => setGiphyUrl(event.target.value)}
                placeholder="https://giphy.com/gifs/..."
                className="h-10 flex-1 rounded-lg border border-[var(--b1)] bg-[var(--s1)] px-3 text-sm text-[var(--t1)] outline-none transition-colors focus:border-[var(--b2)]"
                disabled={isBusy || isSubmitting}
              />
              <button
                type="button"
                onClick={handleSubmitGiphy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-ember px-3 py-2 text-xs font-700 text-[var(--ember-contrast)] transition-opacity hover:opacity-90 disabled:opacity-60"
                disabled={isBusy || isSubmitting}
              >
                {isSubmitting ? <LoaderCircle size={13} className="animate-spin" /> : <ExternalLink size={13} />}
                Usar
              </button>
            </div>
            <p className="mt-2 text-[11px] text-[var(--t4)]">Pega un enlace de imagen o de página de Giphy.</p>
          </div>

          {error && <p className="text-xs text-ember">{error}</p>}
        </div>
      </div>
    </div>
  )
}
