// ── Shared domain types ─────────────────────────────────────────────────────

export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline'

export interface User {
  id: string
  username: string
  displayName: string | null
  discriminator: number
  email: string
  avatarUrl: string | null
  avatarDecorationUrl: string | null
  bannerUrl: string | null
  bio: string | null
  status: UserStatus
  customStatus: string | null
  voiceMicMuted?: boolean
  voiceHeadphonesMuted?: boolean
  isVerified: boolean
  twoFactorEnabled?: boolean
  badges?: string[]
  createdAt: string
}

export interface OAuthAccount {
  provider: 'google' | 'github'
  providerId: string
}

// ── Auth ────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string
  expiresAt: number // unix ms
}

export interface LoginRequest {
  login: string
  password: string
  twoFactorCode?: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

// ── Servers ─────────────────────────────────────────────────────────────────

export interface Server {
  id: string
  name: string
  description: string | null
  iconUrl: string | null
  bannerUrl: string | null
  ownerId: string
  inviteCode: string
  isPublic: boolean
  memberCount: number
  createdAt: string
}

export interface Role {
  id: string
  serverId: string
  name: string
  color: number | null
  position: number
  permissions: number
  isMentionable: boolean
  isHoisted: boolean
  isManaged?: boolean
  isDefault: boolean
  createdAt?: string
}

export interface ServerMember {
  serverId: string
  userId: string
  nickname: string | null
  joinedAt: string
  roles: Role[]
  user: User
}

// ── Channels ────────────────────────────────────────────────────────────────

export type ChannelType = 'text' | 'voice' | 'announcement' | 'dm' | 'group_dm'

export interface Category {
  id: string
  serverId: string
  name: string
  position: number
  overwrites?: PermissionOverwrite[]
}

export interface Channel {
  id: string
  serverId: string | null
  categoryId: string | null
  name: string | null
  topic: string | null
  iconKey?: string | null
  fontKey?: string | null
  fontWeight?: number | null
  type: ChannelType
  position: number
  isNsfw: boolean
  slowmodeSeconds: number
  lastMessageId: string | null
  createdAt: string
  participants?: User[]
  canSendMessages?: boolean
  overwrites?: PermissionOverwrite[]
}

export interface ChannelReadState {
  channelId: string
  lastReadMessageId: string | null
  lastReadAt: string
  unreadCount: number
  mentionCount: number
}

export type PermissionOverwriteTargetType = 'role' | 'member'

export interface PermissionOverwrite {
  id: string
  serverId: string
  categoryId: string | null
  channelId: string | null
  targetType: PermissionOverwriteTargetType
  targetId: string
  allowBits: number
  denyBits: number
  createdAt?: string
}

export interface ServerBan {
  serverId: string
  userId: string
  bannedBy: string
  reason: string | null
  createdAt: string
}

export interface VoiceParticipant {
  userId: string
  serverId: string
  channelId: string
  joinedAt: string
}

export type VoiceSignalType = 'offer' | 'answer' | 'ice-candidate'

export type VoiceScreenSurface = 'monitor' | 'window' | 'browser' | 'application' | 'unknown'

export interface VoiceScreenShare {
  userId: string
  serverId: string
  channelId: string
  startedAt: string
  surface: VoiceScreenSurface
  width: number | null
  height: number | null
  frameRate: number | null
}

// ── Messages ────────────────────────────────────────────────────────────────

export type MessageType = 'default' | 'system' | 'reply'

export interface Attachment {
  id: string
  url: string
  filename: string
  contentType: string | null
  sizeBytes: number | null
  width: number | null
  height: number | null
}

export interface Reaction {
  emoji: string
  count: number
  meReacted: boolean
}

export interface MessageReplyPreview {
  id: string
  author: User
  content: string | null
  attachments: Attachment[]
}

export interface Message {
  id: string
  channelId: string
  author: User
  content: string | null
  type: MessageType
  replyTo: MessageReplyPreview | null
  attachments: Attachment[]
  reactions: Reaction[]
  isEdited: boolean
  createdAt: string
  editedAt: string | null
}

// ── Friends ─────────────────────────────────────────────────────────────────

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked'

export interface Friendship {
  id: string
  requesterId: string
  addresseeId: string
  status: FriendshipStatus
  createdAt: string
  user: User // the other user
}

export interface FriendRemoveEvent {
  friendshipId: string
  userId: string
  reason: 'declined' | 'removed' | 'blocked'
}

// ── WebSocket events ─────────────────────────────────────────────────────────

export interface VoiceChannelStateSnapshot {
  serverId: string
  channelId: string
  participants: VoiceParticipant[]
  screenShares: VoiceScreenShare[]
}

export type GatewayEvent =
  | { op: 10; d: { heartbeatInterval: number } }
  | { op: 11; d: { user: User; guilds: Server[]; dmChannels: Channel[]; voiceStates: VoiceChannelStateSnapshot[] } }
  | { op: 12; d: null }
  | { op: 'MESSAGE_CREATE'; d: Message }
  | { op: 'MESSAGE_UPDATE'; d: Partial<Message> & { id: string; channelId: string } }
  | { op: 'MESSAGE_DELETE'; d: { messageId: string; channelId: string } }
  | {
      op: 'REACTION_ADD'
      d: { messageId: string; channelId: string; userId: string; emoji: string }
    }
  | {
      op: 'REACTION_REMOVE'
      d: { messageId: string; channelId: string; userId: string; emoji: string }
    }
  | { op: 'TYPING_START'; d: { channelId: string; userId: string; timestamp: number } }
  | {
      op: 'PRESENCE_UPDATE'
      d: { userId: string; status: UserStatus; customStatus: string | null }
    }
  | { op: 'GUILD_CREATE'; d: Server }
  | { op: 'GUILD_UPDATE'; d: Partial<Server> & { id: string } }
  | { op: 'GUILD_DELETE'; d: { guildId: string } }
  | { op: 'GUILD_MEMBER_ADD'; d: ServerMember }
  | { op: 'GUILD_MEMBER_REMOVE'; d: { guildId: string; userId: string } }
  | { op: 'CHANNEL_CREATE'; d: Channel }
  | { op: 'CHANNEL_UPDATE'; d: Partial<Channel> & { id: string } }
  | { op: 'CHANNEL_DELETE'; d: { channelId: string; guildId?: string } }
  | { op: 'FRIEND_REQUEST'; d: Friendship }
  | { op: 'FRIEND_UPDATE'; d: Friendship }
  | { op: 'FRIEND_REMOVE'; d: FriendRemoveEvent }
  | {
      op: 'VOICE_STATE_SNAPSHOT'
      d: {
        serverId: string
        channelId: string
        participants: VoiceParticipant[]
        screenShares: VoiceScreenShare[]
      }
    }
  | { op: 'VOICE_USER_JOINED'; d: VoiceParticipant }
  | { op: 'VOICE_USER_LEFT'; d: { serverId: string; channelId: string; userId: string } }
  | {
      op: 'VOICE_SCREEN_SHARE_UPDATED'
      d: {
        serverId: string
        channelId: string
        userId: string
        share: VoiceScreenShare | null
      }
    }
  | {
      op: 'VOICE_SIGNAL'
      d: {
        serverId: string
        channelId: string
        fromUserId: string
        signalType: VoiceSignalType
        payload: unknown
      }
    }

// ── API response wrappers ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  meta?: Record<string, unknown>
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Array<{ field: string; message: string }>
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    hasMore: boolean
    nextCursor: string | null
    prevCursor: string | null
  }
}
