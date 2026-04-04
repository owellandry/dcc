import type { ApiError, ApiResponse, PaginatedResponse } from '../types'

const API_URL = resolveRuntimeUrl(process.env.NEXT_PUBLIC_API_URL, 'http://localhost:8080')
const REQUEST_TIMEOUT_MS = 15_000

/** Converts a server-relative upload path (/uploads/...) to an absolute URL.
 *  Pass-through for already-absolute URLs and null/undefined. */
export function resolveMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (url.startsWith('/')) return `${API_URL}${url}`
  return rewriteMediaUrl(url)
}

function resolveRuntimeUrl(explicitUrl: string | undefined, fallbackUrl: string) {
  const configuredUrl = explicitUrl ?? fallbackUrl

  return rewriteLoopbackHost(configuredUrl, true)
}

function rewriteLoopbackHost(urlValue: string, trimTrailingSlash = false) {
  let normalizedUrl = urlValue

  if (typeof window === 'undefined') {
    return trimTrailingSlash ? normalizedUrl.replace(/\/$/, '') : normalizedUrl
  }

  try {
    const resolvedUrl = new URL(urlValue)
    const browserHostname = window.location.hostname
    const browserIsLocal = isLoopbackHost(browserHostname)
    const browserIsPrivate = browserIsLocal || isPrivateIpv4Host(browserHostname)
    const configuredIsLocal = isLoopbackHost(resolvedUrl.hostname)
    const configuredIsPrivate = configuredIsLocal || isPrivateIpv4Host(resolvedUrl.hostname)

    if (configuredIsPrivate && browserIsPrivate && resolvedUrl.hostname !== browserHostname) {
      resolvedUrl.hostname = browserHostname
      normalizedUrl = resolvedUrl.toString()
    }
  } catch {
    normalizedUrl = urlValue
  }

  return trimTrailingSlash ? normalizedUrl.replace(/\/$/, '') : normalizedUrl
}

function isLoopbackHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

function isPrivateIpv4Host(hostname: string) {
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  const match = hostname.match(ipv4Pattern)
  if (!match) return false

  const octets = match.slice(1).map((part) => Number(part))
  if (octets.some((value) => Number.isNaN(value) || value < 0 || value > 255)) return false

  const a = octets[0] ?? -1
  const b = octets[1] ?? -1
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
}

function rewriteMediaUrl(urlValue: string) {
  const normalizedUrl = rewriteLoopbackHost(urlValue)

  if (typeof window === 'undefined') return normalizedUrl

  try {
    const resolvedUrl = new URL(normalizedUrl)
    const isUploadPath = resolvedUrl.pathname.startsWith('/uploads/')

    if (window.location.protocol === 'https:' && isUploadPath) {
      return `${window.location.origin}${resolvedUrl.pathname}${resolvedUrl.search}`
    }

    return normalizedUrl
  } catch {
    return normalizedUrl
  }
}

// ── In-memory access token ───────────────────────────────────────────────────
let _accessToken: string | null = null
let _refreshing: Promise<string | null> | null = null
const ACCESS_TOKEN_STORAGE_KEY = 'dcc_access_token'

export function setAccessToken(token: string | null) {
  _accessToken = token
  if (typeof window === 'undefined') return

  if (token) {
    window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token)
  } else {
    window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
  }
}

export function getAccessToken() {
  if (!_accessToken && typeof window !== 'undefined') {
    _accessToken = window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
  }
  return _accessToken
}

// ── Core fetch wrapper ───────────────────────────────────────────────────────
class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    method: string,
    path: string,
    options: {
      body?: unknown
      params?: Record<string, string | number | boolean | undefined>
      formData?: FormData
      isRetry?: boolean
      skipAuthRefresh?: boolean
    } = {}
  ): Promise<T> {
    const { body, params, formData, isRetry = false, skipAuthRefresh = false } = options

    // Build URL with query params
    const url = new URL(`${this.baseUrl}/v1${path}`)
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) url.searchParams.set(key, String(value))
      }
    }

    // Build headers
    const headers: HeadersInit = {}
    if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`
    if (body && !formData) headers['Content-Type'] = 'application/json'

    const requestInit: RequestInit = {
      method,
      headers,
      credentials: 'include',
    }
    const payload = formData ?? (body ? JSON.stringify(body) : null)
    if (payload !== null) {
      requestInit.body = payload
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    requestInit.signal = controller.signal

    let res: Response
    try {
      res = await fetch(url.toString(), requestInit)
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiRequestError(
          0,
          'REQUEST_TIMEOUT',
          'La solicitud tardó demasiado. Intenta de nuevo.'
        )
      }
      throw new ApiRequestError(
        0,
        'NETWORK_ERROR',
        'No se pudo conectar con el servidor. Verifica que la API esté encendida.'
      )
    }
    clearTimeout(timeoutId)

    // Auto-refresh on 401
    if (res.status === 401 && !isRetry && !skipAuthRefresh) {
      const newToken = await this.refresh()
      if (newToken) {
        return this.request(method, path, { ...options, isRetry: true })
      }
      // Refresh failed — clear auth state
      setAccessToken(null)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:logout'))
      }
      throw new AuthError('Session expired')
    }

    if (!res.ok) {
      const contentType = res.headers.get('content-type') ?? ''
      const defaultMessage = `Request failed (${res.status} ${res.statusText || 'Unknown'})`
      let errBody: Partial<ApiError> = {}
      let textMessage = ''

      if (contentType.includes('application/json')) {
        errBody = (await res.json().catch(() => ({}))) as Partial<ApiError>
      } else {
        textMessage = await res.text().catch(() => '')
      }

      throw new ApiRequestError(
        res.status,
        errBody.error?.code ?? `HTTP_${res.status}`,
        (errBody.error?.details?.[0]?.message ?? errBody.error?.message ?? textMessage.trim()) ||
          defaultMessage,
        errBody.error?.details
      )
    }

    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  }

  private async refresh(): Promise<string | null> {
    if (_refreshing) return _refreshing
    _refreshing = (async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      try {
        const res = await fetch(`${this.baseUrl}/v1/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        if (res.status === 204 || !res.ok) return null
        const data = (await res.json()) as ApiResponse<{ accessToken: string }>
        _accessToken = data.data.accessToken
        return _accessToken
      } catch {
        clearTimeout(timeoutId)
        return null
      } finally {
        _refreshing = null
      }
    })()
    return _refreshing
  }

  // ── HTTP methods ────────────────────────────────────────────────────────────

  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
    return params
      ? this.request<ApiResponse<T>>('GET', path, { params })
      : this.request<ApiResponse<T>>('GET', path)
  }

  post<T>(path: string, body?: unknown) {
    return body === undefined
      ? this.request<ApiResponse<T>>('POST', path)
      : this.request<ApiResponse<T>>('POST', path, { body })
  }

  postWithOptions<T>(
    path: string,
    body: unknown | undefined,
    options: {
      skipAuthRefresh?: boolean
    }
  ) {
    return body === undefined
      ? this.request<ApiResponse<T>>('POST', path, options)
      : this.request<ApiResponse<T>>('POST', path, { ...options, body })
  }

  patch<T>(path: string, body?: unknown) {
    return body === undefined
      ? this.request<ApiResponse<T>>('PATCH', path)
      : this.request<ApiResponse<T>>('PATCH', path, { body })
  }

  put<T>(path: string, body?: unknown) {
    return body === undefined
      ? this.request<ApiResponse<T>>('PUT', path)
      : this.request<ApiResponse<T>>('PUT', path, { body })
  }

  delete<T = void>(path: string) {
    return this.request<ApiResponse<T>>('DELETE', path)
  }

  upload<T>(path: string, formData: FormData) {
    return this.request<ApiResponse<T>>('POST', path, { formData })
  }

  getPaginated<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
    return params
      ? this.request<PaginatedResponse<T>>('GET', path, { params })
      : this.request<PaginatedResponse<T>>('GET', path)
  }
}

// ── Error classes ────────────────────────────────────────────────────────────

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Array<{ field: string; message: string }>
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────

export const api = new ApiClient(API_URL)

// ── Domain helpers ───────────────────────────────────────────────────────────

export const authApi = {
  register: (body: { username: string; email: string; password: string }) =>
    api.post<{ message: string; verificationUrl?: string | null }>('/auth/register', body),
  login: (body: { login: string; password: string; twoFactorCode?: string }) =>
    api.post<{ accessToken?: string; requiresTwoFactor?: boolean }>('/auth/login', body),
  logout: () => api.post('/auth/logout'),
  refresh: () =>
    api.postWithOptions<{ accessToken: string }>('/auth/refresh', undefined, {
      skipAuthRefresh: true,
    }),
  verifyEmail: (token: string) => api.post('/auth/verify-email', { token }),
  resendVerification: () =>
    api.post<{ message: string; verificationUrl?: string | null }>('/auth/resend-verification'),
  oauthUrl: (provider: 'google' | 'github') => `${API_URL}/v1/auth/oauth/${provider}`,
}

export const usersApi = {
  me: () => api.get<import('../types').User>('/users/@me'),
  update: (
    body: Partial<
      Pick<
        import('../types').User,
        | 'displayName'
        | 'username'
        | 'email'
        | 'bio'
        | 'status'
        | 'customStatus'
        | 'avatarUrl'
        | 'avatarDecorationUrl'
        | 'bannerUrl'
      >
    > & {
      voiceMicMuted?: boolean
      voiceHeadphonesMuted?: boolean
      voiceInputProfile?: import('../types').VoiceInputProfile
      voiceInputTone?: number
      voiceInputEffectMix?: number
      currentPassword?: string
      newPassword?: string
    }
  ) => api.patch<import('../types').User>('/users/@me', body),
  prepareTwoFactor: (body: { currentPassword?: string }) =>
    api.post<{
      secret: string
      otpauthUrl: string
      qrCodeDataUrl: string
      accountName: string
      issuer: string
    }>('/users/@me/two-factor/setup', body),
  enableTwoFactor: (body: { secret: string; code: string; currentPassword?: string }) =>
    api.post<{ backupCodes: string[] }>('/users/@me/two-factor/enable', body),
  disableTwoFactor: (body: { code: string; currentPassword?: string }) =>
    api.post<{ message: string }>('/users/@me/two-factor/disable', body),
  uploadAvatar: (formData: FormData) =>
    api.upload<{ avatarUrl: string }>('/uploads/avatar', formData),
  uploadAvatarDecoration: (formData: FormData) =>
    api.upload<{ avatarDecorationUrl: string }>('/uploads/avatar-decoration', formData),
  uploadBanner: (formData: FormData) =>
    api.upload<{ bannerUrl: string }>('/uploads/banner', formData),
  getUser: (id: string) => api.get<import('../types').User>(`/users/${id}`),
}

export const serversApi = {
  list: () => api.get<import('../types').Server[]>('/servers/@me'),
  get: (id: string) => api.get<import('../types').Server>(`/servers/${id}`),
  getDetails: (id: string) =>
    api.get<{
      server: import('../types').Server
      channels: import('../types').Channel[]
      categories: import('../types').Category[]
      roles: import('../types').Role[]
    }>(`/servers/${id}`),
  create: (body: { name: string; description?: string }) =>
    api.post<
      import('../types').Server & {
        channels: import('../types').Channel[]
        categories: import('../types').Category[]
        roles: import('../types').Role[]
      }
    >('/servers', body),
  update: (
    id: string,
    body: Partial<
      Pick<
        import('../types').Server,
        'name' | 'description' | 'isPublic' | 'iconUrl' | 'bannerUrl' | 'inviteCode'
      >
    >
  ) =>
    api.patch<import('../types').Server>(`/servers/${id}`, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.isPublic !== undefined ? { is_public: body.isPublic } : {}),
      ...(body.iconUrl !== undefined ? { icon_url: body.iconUrl } : {}),
      ...(body.bannerUrl !== undefined ? { banner_url: body.bannerUrl } : {}),
      ...(body.inviteCode !== undefined ? { invite_code: body.inviteCode } : {}),
    }),
  uploadIcon: (serverId: string, formData: FormData) =>
    api.upload<{ iconUrl: string }>(`/servers/${serverId}/icon`, formData),
  uploadBanner: (serverId: string, formData: FormData) =>
    api.upload<{ bannerUrl: string }>(`/servers/${serverId}/banner`, formData),
  delete: (id: string) => api.delete(`/servers/${id}`),
  getInvite: (code: string) =>
    api.get<{ server: import('../types').Server; inviteCode: string }>(`/invites/${code}`),
  join: (code: string) => api.post<import('../types').Server>(`/invites/${code}/join`),
  createInvite: (
    serverId: string,
    body?: { expiresInSeconds?: number | null; maxUses?: number | null }
  ) => api.post<{ code: string }>(`/servers/${serverId}/invites`, body),
  getMembers: (serverId: string, params?: { limit?: number; after?: string }) =>
    api.getPaginated<import('../types').ServerMember>(`/servers/${serverId}/members`, params),
  createCategory: (serverId: string, body: { name: string }) =>
    api.post<import('../types').Category>(`/servers/${serverId}/categories`, body),
  updateCategory: (
    categoryId: string,
    body: Partial<Pick<import('../types').Category, 'name' | 'position'>>
  ) => api.patch<import('../types').Category>(`/categories/${categoryId}`, body),
  deleteCategory: (categoryId: string) => api.delete(`/categories/${categoryId}`),
  reorderStructure: (
    serverId: string,
    body: {
      categories?: Array<{ id: string; position: number }>
      channels?: Array<{ id: string; position: number; categoryId?: string | null }>
    }
  ) => api.post<void>(`/servers/${serverId}/structure/reorder`, body),
  createRole: (
    serverId: string,
    body: {
      name: string
      color?: number | null
      permissions?: number
      isHoisted?: boolean
      isMentionable?: boolean
    }
  ) => api.post<import('../types').Role>(`/servers/${serverId}/roles`, body),
  updateRole: (
    roleId: string,
    body: Partial<
      Pick<
        import('../types').Role,
        'name' | 'color' | 'permissions' | 'position' | 'isHoisted' | 'isMentionable'
      >
    >
  ) => api.patch<import('../types').Role>(`/roles/${roleId}`, body),
  deleteRole: (roleId: string) => api.delete(`/roles/${roleId}`),
  replaceMemberRoles: (serverId: string, userId: string, roleIds: string[]) =>
    api.put<import('../types').ServerMember>(`/servers/${serverId}/members/${userId}/roles`, {
      roleIds,
    }),
  kickMember: (serverId: string, userId: string) =>
    api.post<void>(`/servers/${serverId}/members/${userId}/kick`),
  banMember: (serverId: string, body: { userId: string; reason?: string | null }) =>
    api.post<void>(`/servers/${serverId}/bans`, body),
  unbanMember: (serverId: string, userId: string) =>
    api.delete(`/servers/${serverId}/bans/${userId}`),
  replaceCategoryOverwrites: (
    categoryId: string,
    overwrites: Array<{
      targetType: import('../types').PermissionOverwriteTargetType
      targetId: string
      allowBits: number
      denyBits: number
    }>
  ) =>
    api.put<import('../types').PermissionOverwrite[]>(`/categories/${categoryId}/overwrites`, {
      overwrites,
    }),
  replaceChannelOverwrites: (
    channelId: string,
    overwrites: Array<{
      targetType: import('../types').PermissionOverwriteTargetType
      targetId: string
      allowBits: number
      denyBits: number
    }>
  ) =>
    api.put<import('../types').PermissionOverwrite[]>(`/channels/${channelId}/overwrites`, {
      overwrites,
    }),
}

export const channelsApi = {
  getMessages: (channelId: string, params?: { before?: string; after?: string; limit?: number }) =>
    api.getPaginated<import('../types').Message>(`/channels/${channelId}/messages`, params),
  sendMessage: (channelId: string, body: { content?: string; replyToId?: string }) =>
    api.post<import('../types').Message>(`/channels/${channelId}/messages`, body),
  markRead: (channelId: string) =>
    api.post<import('../types').ChannelReadState>(`/channels/${channelId}/read`),
  editMessage: (messageId: string, body: { content: string }) =>
    api.patch<import('../types').Message>(`/messages/${messageId}`, body),
  deleteMessage: (messageId: string) => api.delete(`/messages/${messageId}`),
  addReaction: (messageId: string, emoji: string) =>
    api.post(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`),
  removeReaction: (messageId: string, emoji: string) =>
    api.delete(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`),
  create: (
    serverId: string,
    body: {
      name: string
      type?: string
      categoryId?: string | null
      topic?: string | null
      iconKey?: string | null
      fontKey?: string | null
      fontWeight?: number | null
      isNsfw?: boolean
      slowmodeSeconds?: number
    }
  ) => api.post<import('../types').Channel>(`/servers/${serverId}/channels`, body),
  update: (
    channelId: string,
    body: Partial<
      Pick<
        import('../types').Channel,
        | 'name'
        | 'topic'
        | 'iconKey'
        | 'fontKey'
        | 'fontWeight'
        | 'position'
        | 'categoryId'
        | 'isNsfw'
        | 'slowmodeSeconds'
      >
    >
  ) => api.patch<import('../types').Channel>(`/channels/${channelId}`, body),
  delete: (channelId: string) => api.delete(`/channels/${channelId}`),
}

export const dmsApi = {
  list: () => api.get<import('../types').Channel[]>('/dms'),
  open: (userId: string) => api.post<import('../types').Channel>(`/dms/${userId}`),
  close: (channelId: string) => api.delete(`/dms/${channelId}`),
}

export const readStatesApi = {
  list: () => api.get<import('../types').ChannelReadState[]>('/channels/read-states'),
}

export const friendsApi = {
  list: () => api.get<import('../types').Friendship[]>('/friends'),
  sendByUsername: (username: string) =>
    api.post<import('../types').Friendship>('/friends', { username }),
  send: (userId: string) => api.post(`/friends/${userId}`),
  accept: (userId: string) =>
    api.patch<import('../types').Friendship>(`/friends/${userId}`, { action: 'accept' }),
  decline: (userId: string) => api.patch(`/friends/${userId}`, { action: 'decline' }),
  block: (userId: string) =>
    api.patch<import('../types').Friendship>(`/friends/${userId}`, { action: 'block' }),
  remove: (userId: string) => api.delete(`/friends/${userId}`),
}

export const linksApi = {
  preview: (url: string) =>
    api.get<{
      url: string
      title: string | null
      description: string | null
      image: string | null
      siteName: string | null
      hostname: string | null
    }>('/utils/link-preview', { url }),
}
