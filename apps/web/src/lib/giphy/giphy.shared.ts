export interface GiphyGif {
  id: string
  title: string
  previewUrl: string
  originalUrl: string
  pageUrl: string
}

interface GiphyApiResponse {
  data: Array<{
    id: string
    title: string
    url: string
    images: {
      fixed_width?: { url?: string }
      fixed_width_downsampled?: { url?: string }
      downsized_medium?: { url?: string }
      original?: { url?: string }
    }
  }>
}

const GIPHY_API_BASE_URL = 'https://api.giphy.com/v1/gifs'
export const GIPHY_API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY?.trim() ?? ''

function buildQueryString(params: Record<string, string | number>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    search.set(key, String(value))
  }
  return search.toString()
}

function mapGif(entry: GiphyApiResponse['data'][number]): GiphyGif | null {
  const previewUrl =
    entry.images.fixed_width_downsampled?.url
    ?? entry.images.fixed_width?.url
    ?? entry.images.downsized_medium?.url
    ?? entry.images.original?.url
    ?? null
  const originalUrl = entry.images.original?.url ?? entry.images.downsized_medium?.url ?? previewUrl

  if (!previewUrl || !originalUrl) return null

  return {
    id: entry.id,
    title: entry.title || 'GIF',
    previewUrl,
    originalUrl,
    pageUrl: entry.url,
  }
}

async function fetchGifs(
  endpoint: 'search' | 'trending',
  params: Record<string, string | number>,
  signal?: AbortSignal
) {
  if (!GIPHY_API_KEY) return []

  const query = buildQueryString({
    api_key: GIPHY_API_KEY,
    limit: 18,
    rating: 'pg-13',
    ...params,
  })
  const response = await fetch(
    `${GIPHY_API_BASE_URL}/${endpoint}?${query}`,
    signal ? { signal } : undefined
  )

  if (!response.ok) {
    throw new Error(`GIPHY_${response.status}`)
  }

  const json = (await response.json()) as GiphyApiResponse
  return json.data.map(mapGif).filter((gif): gif is GiphyGif => gif !== null)
}

export function searchGiphyGifs(query: string, signal?: AbortSignal) {
  return fetchGifs('search', { q: query, lang: 'es' }, signal)
}

export function getTrendingGiphyGifs(signal?: AbortSignal) {
  return fetchGifs('trending', { bundle: 'messaging_non_clips' }, signal)
}
