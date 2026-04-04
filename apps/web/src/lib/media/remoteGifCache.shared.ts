'use client'

import { useEffect, useState } from 'react'
import { resolveMediaUrl } from '@/lib/api'

const DATABASE_NAME = 'dcc-media-cache'
const DATABASE_VERSION = 1
const STORE_NAME = 'remote-gifs'

const objectUrlCache = new Map<string, string>()
const pendingUrlCache = new Map<string, Promise<string>>()

interface CachedRemoteGifRecord {
  url: string
  blob: Blob
  updatedAt: number
}

export function useCachedRemoteGifUrl(src?: string | null) {
  const resolvedUrl = resolveMediaUrl(src)
  const [cachedUrl, setCachedUrl] = useState<string | undefined>(() => {
    if (!resolvedUrl) return undefined
    return objectUrlCache.get(resolvedUrl) ?? resolvedUrl
  })

  useEffect(() => {
    if (!resolvedUrl) {
      setCachedUrl(undefined)
      return
    }

    if (!isRemoteGifUrl(resolvedUrl)) {
      setCachedUrl(resolvedUrl)
      return
    }

    const inMemoryUrl = objectUrlCache.get(resolvedUrl)
    if (inMemoryUrl) {
      setCachedUrl(inMemoryUrl)
      return
    }

    setCachedUrl(resolvedUrl)
    let cancelled = false

    void getCachedRemoteGifUrl(resolvedUrl).then((nextUrl) => {
      if (cancelled) return
      setCachedUrl(nextUrl)
    })

    return () => {
      cancelled = true
    }
  }, [resolvedUrl])

  return cachedUrl
}

async function getCachedRemoteGifUrl(url: string): Promise<string> {
  const cachedObjectUrl = objectUrlCache.get(url)
  if (cachedObjectUrl) return cachedObjectUrl

  const pending = pendingUrlCache.get(url)
  if (pending) return pending

  const nextPromise = (async () => {
    const database = await openMediaCacheDatabase()
    const cachedRecord = await readGifRecord(database, url)
    if (cachedRecord?.blob) {
      const objectUrl = URL.createObjectURL(cachedRecord.blob)
      objectUrlCache.set(url, objectUrl)
      return objectUrl
    }

    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
    })
    if (!response.ok) {
      throw new Error('REMOTE_GIF_FETCH_FAILED')
    }

    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    objectUrlCache.set(url, objectUrl)
    await writeGifRecord(database, { url, blob, updatedAt: Date.now() })
    return objectUrl
  })().finally(() => {
    pendingUrlCache.delete(url)
  })

  pendingUrlCache.set(url, nextPromise)
  return nextPromise
}

function isRemoteGifUrl(url: string) {
  if (typeof window === 'undefined') return false

  try {
    const parsed = new URL(url)
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      parsed.origin !== window.location.origin &&
      /\.gif($|\?)/i.test(parsed.pathname + parsed.search)
    )
  } catch {
    return false
  }
}

function openMediaCacheDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'url' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('INDEXED_DB_OPEN_FAILED'))
  })
}

function readGifRecord(database: IDBDatabase, url: string): Promise<CachedRemoteGifRecord | null> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(url)

    request.onsuccess = () => resolve((request.result as CachedRemoteGifRecord | undefined) ?? null)
    request.onerror = () => reject(request.error ?? new Error('INDEXED_DB_READ_FAILED'))
  })
}

function writeGifRecord(database: IDBDatabase, record: CachedRemoteGifRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(record)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error('INDEXED_DB_WRITE_FAILED'))
  })
}
