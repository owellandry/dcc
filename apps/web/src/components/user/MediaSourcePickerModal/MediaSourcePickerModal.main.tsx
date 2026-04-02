'use client'

import { useEffect, useState } from 'react'
import { FolderUp, LoaderCircle, Search, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  GIPHY_API_KEY,
  getTrendingGiphyGifs,
  searchGiphyGifs,
  type GiphyGif,
} from '@/lib/giphy/giphy.shared'

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
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GiphyGif[]>([])
  const [error, setError] = useState<string | null>(null)
  const [helperText, setHelperText] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedGifId, setSelectedGifId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setResults([])
    setError(null)
    setHelperText(null)
    setIsSearching(false)
    setIsSubmitting(false)
    setSelectedGifId(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    if (!GIPHY_API_KEY) {
      setResults([])
      setHelperText('Configura NEXT_PUBLIC_GIPHY_API_KEY para habilitar la busqueda integrada de Giphy.')
      return
    }

    const controller = new AbortController()
    const delay = query.trim() ? 280 : 0
    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true)
      setError(null)
      setHelperText(query.trim() ? null : 'Tendencias de Giphy')

      try {
        const nextResults = query.trim()
          ? await searchGiphyGifs(query.trim(), controller.signal)
          : await getTrendingGiphyGifs(controller.signal)

        setResults(nextResults)
        if (nextResults.length === 0) {
          setHelperText(
            query.trim()
              ? 'No encontramos GIFs para esa busqueda.'
              : 'No hay GIFs para mostrar ahora mismo.'
          )
        }
      } catch {
        if (controller.signal.aborted) return
        setResults([])
        setError('No se pudo cargar Giphy en este momento.')
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false)
        }
      }
    }, delay)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [open, query])

  if (!open) return null

  const handlePickLocal = () => {
    if (isBusy || isSubmitting) return
    onPickLocal()
  }

  const handleSelectGif = async (gif: GiphyGif) => {
    if (!GIPHY_API_KEY || isBusy || isSubmitting) return

    setError(null)
    setIsSubmitting(true)
    setSelectedGifId(gif.id)
    try {
      await onPickGiphy(gif.originalUrl)
    } catch {
      setError('No se pudo importar ese GIF desde Giphy.')
    } finally {
      setIsSubmitting(false)
      setSelectedGifId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-2xl border border-[var(--b1)] bg-[var(--s1)] shadow-[0_24px_52px_rgba(0,0,0,0.48)]"
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
              Buscar en Giphy
            </p>

            <div className="flex items-center gap-2 rounded-xl border border-[var(--b1)] bg-[var(--s1)] px-3">
              <Search size={15} className="shrink-0 text-[var(--t3)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Busca GIFs sin salir de la app"
                className="h-10 flex-1 bg-transparent text-sm text-[var(--t1)] outline-none placeholder:text-[var(--t4)]"
                disabled={isBusy || isSubmitting}
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-[11px] text-[var(--t4)]">
                {GIPHY_API_KEY
                  ? (helperText ?? 'Elige un GIF para importarlo directamente.')
                  : 'La integracion queda lista cuando configures la key publica de Giphy.'}
              </p>
              <span className="text-[10px] font-700 uppercase tracking-[0.14em] text-[var(--t4)]">
                Powered by GIPHY
              </span>
            </div>

            <div className="mt-3">
              {isSearching ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div
                      key={index}
                      className="aspect-[4/3] animate-pulse rounded-xl border border-[var(--b1)] bg-[var(--s1)]"
                    />
                  ))}
                </div>
              ) : results.length > 0 ? (
                <div className="grid max-h-[420px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
                  {results.map((gif) => (
                    <button
                      key={gif.id}
                      type="button"
                      onClick={() => void handleSelectGif(gif)}
                      className={cn(
                        'group relative overflow-hidden rounded-xl border border-[var(--b1)] bg-[var(--s1)] text-left transition-all hover:border-[var(--b2)]',
                        selectedGifId === gif.id && 'border-[var(--ember)] ring-1 ring-[var(--ember)]'
                      )}
                      disabled={isBusy || isSubmitting}
                    >
                      <img
                        src={gif.previewUrl}
                        alt={gif.title}
                        className="aspect-[4/3] w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                        loading="lazy"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-2 py-2">
                        <p className="line-clamp-2 text-[11px] font-700 leading-tight text-white">
                          {gif.title || 'GIF'}
                        </p>
                      </div>
                      {selectedGifId === gif.id ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                          <LoaderCircle size={18} className="animate-spin text-white" />
                        </div>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[var(--b1)] bg-[var(--s1)] px-4 py-8 text-center text-sm text-[var(--t3)]">
                  {GIPHY_API_KEY
                    ? 'Escribe algo como "cat", "party" o "retro".'
                    : 'La busqueda interna de Giphy esta desactivada hasta que configures la API key.'}
                </div>
              )}
            </div>
          </div>

          {error ? <p className="text-xs text-ember">{error}</p> : null}
        </div>
      </div>
    </div>
  )
}
