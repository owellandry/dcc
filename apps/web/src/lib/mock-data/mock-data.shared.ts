import type { User, Server, Channel, Category, ServerMember, Message, Friendship, Role } from '../types'

// ── Mock users ────────────────────────────────────────────────────────────────

export const MOCK_ME: User = {
  id: 'user-me',
  username: 'devuser',
  displayName: 'Dev User',
  discriminator: 1337,
  email: 'dev@dcc.app',
  avatarUrl: null,
  bannerUrl: null,
  bio: 'Just vibing in dev mode 🔥',
  status: 'online',
  customStatus: 'Building DCC',
  isVerified: true,
  createdAt: '2024-01-01T00:00:00Z',
}

export const MOCK_USERS: User[] = [
  MOCK_ME,
  {
    id: 'user-2',
    username: 'rustacean',
    displayName: 'Ferris Main',
    discriminator: 42,
    email: 'rust@dcc.app',
    avatarUrl: null,
    bannerUrl: null,
    bio: 'I write unsafe code safely.',
    status: 'online',
    customStatus: 'cargo build --release',
    isVerified: true,
    createdAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'user-3',
    username: 'cloudflare_fan',
    displayName: 'Edge Fan',
    discriminator: 99,
    email: 'edge@dcc.app',
    avatarUrl: null,
    bannerUrl: null,
    bio: null,
    status: 'idle',
    customStatus: null,
    isVerified: true,
    createdAt: '2024-01-03T00:00:00Z',
  },
  {
    id: 'user-4',
    username: 'tailwind_wizard',
    displayName: 'Tailwind Wizard',
    discriminator: 7,
    email: 'css@dcc.app',
    avatarUrl: null,
    bannerUrl: null,
    bio: 'className goes brrr',
    status: 'dnd',
    customStatus: 'In the zone',
    isVerified: true,
    createdAt: '2024-01-04T00:00:00Z',
  },
  {
    id: 'user-5',
    username: 'night_owl',
    displayName: 'Night Owl',
    discriminator: 404,
    email: 'night@dcc.app',
    avatarUrl: null,
    bannerUrl: null,
    bio: null,
    status: 'offline',
    customStatus: null,
    isVerified: true,
    createdAt: '2024-01-05T00:00:00Z',
  },
]

// ── Mock servers ──────────────────────────────────────────────────────────────

export const MOCK_SERVERS: Server[] = [
  {
    id: 'server-1',
    name: 'DCC Dev Hub',
    description: 'Building the future of chat',
    iconUrl: null,
    bannerUrl: null,
    ownerId: 'user-me',
    inviteCode: 'dcc-dev',
    isPublic: true,
    memberCount: 5,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'server-2',
    name: 'Rust & Axum',
    description: 'Backend wizardry',
    iconUrl: null,
    bannerUrl: null,
    ownerId: 'user-2',
    inviteCode: 'rust-axum',
    isPublic: false,
    memberCount: 3,
    createdAt: '2024-01-10T00:00:00Z',
  },
  {
    id: 'server-3',
    name: 'Design System',
    description: 'Pixels and tokens',
    iconUrl: null,
    bannerUrl: null,
    ownerId: 'user-4',
    inviteCode: 'design-sys',
    isPublic: false,
    memberCount: 2,
    createdAt: '2024-02-01T00:00:00Z',
  },
]

// ── Mock categories ───────────────────────────────────────────────────────────

export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-1', serverId: 'server-1', name: 'General', position: 0 },
  { id: 'cat-2', serverId: 'server-1', name: 'Development', position: 1 },
  { id: 'cat-3', serverId: 'server-1', name: 'Off-topic', position: 2 },
  { id: 'cat-4', serverId: 'server-2', name: 'Rust', position: 0 },
  { id: 'cat-5', serverId: 'server-2', name: 'Infra', position: 1 },
  { id: 'cat-6', serverId: 'server-3', name: 'Design', position: 0 },
]

// ── Mock channels ─────────────────────────────────────────────────────────────

export const MOCK_CHANNELS: Channel[] = [
  // server-1
  { id: 'ch-welcome',   serverId: 'server-1', categoryId: 'cat-1', name: 'welcome',      topic: 'Welcome to DCC Dev Hub!', type: 'text', position: 0, isNsfw: false, slowmodeSeconds: 0, lastMessageId: null, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'ch-general',   serverId: 'server-1', categoryId: 'cat-1', name: 'general',       topic: 'General chat — say hi!', type: 'text', position: 1, isNsfw: false, slowmodeSeconds: 0, lastMessageId: null, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'ch-frontend',  serverId: 'server-1', categoryId: 'cat-2', name: 'frontend',      topic: 'React, Vinext, CSS magic', type: 'text', position: 0, isNsfw: false, slowmodeSeconds: 0, lastMessageId: null, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'ch-backend',   serverId: 'server-1', categoryId: 'cat-2', name: 'backend',       topic: 'Rust + Axum + PostgreSQL', type: 'text', position: 1, isNsfw: false, slowmodeSeconds: 0, lastMessageId: null, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'ch-devops',    serverId: 'server-1', categoryId: 'cat-2', name: 'devops',        topic: 'Docker, CF Workers, deploy', type: 'text', position: 2, isNsfw: false, slowmodeSeconds: 0, lastMessageId: null, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'ch-memes',     serverId: 'server-1', categoryId: 'cat-3', name: 'memes',         topic: null, type: 'text', position: 0, isNsfw: false, slowmodeSeconds: 0, lastMessageId: null, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'ch-random',    serverId: 'server-1', categoryId: 'cat-3', name: 'random',        topic: null, type: 'text', position: 1, isNsfw: false, slowmodeSeconds: 0, lastMessageId: null, createdAt: '2024-01-01T00:00:00Z' },
  // server-2
  { id: 'ch-rust-gen',  serverId: 'server-2', categoryId: 'cat-4', name: 'general',       topic: 'All things Rust', type: 'text', position: 0, isNsfw: false, slowmodeSeconds: 0, lastMessageId: null, createdAt: '2024-01-10T00:00:00Z' },
  { id: 'ch-axum',      serverId: 'server-2', categoryId: 'cat-4', name: 'axum',          topic: 'Axum web framework', type: 'text', position: 1, isNsfw: false, slowmodeSeconds: 0, lastMessageId: null, createdAt: '2024-01-10T00:00:00Z' },
  { id: 'ch-postgres',  serverId: 'server-2', categoryId: 'cat-5', name: 'postgres',      topic: 'SQLx & migrations', type: 'text', position: 0, isNsfw: false, slowmodeSeconds: 0, lastMessageId: null, createdAt: '2024-01-10T00:00:00Z' },
  // server-3
  { id: 'ch-tokens',    serverId: 'server-3', categoryId: 'cat-6', name: 'tokens',        topic: 'Design tokens & variables', type: 'text', position: 0, isNsfw: false, slowmodeSeconds: 0, lastMessageId: null, createdAt: '2024-02-01T00:00:00Z' },
  { id: 'ch-components',serverId: 'server-3', categoryId: 'cat-6', name: 'components',    topic: 'Component library', type: 'text', position: 1, isNsfw: false, slowmodeSeconds: 0, lastMessageId: null, createdAt: '2024-02-01T00:00:00Z' },
]

// ── Mock roles ────────────────────────────────────────────────────────────────

export const MOCK_ROLES: Role[] = [
  { id: 'role-1', serverId: 'server-1', name: '@everyone', color: null, position: 0, permissions: 0b111, isMentionable: false, isHoisted: false, isDefault: true },
  { id: 'role-2', serverId: 'server-1', name: 'Admin',     color: 0xff6b35, position: 3, permissions: 0b1111111111111, isMentionable: true, isHoisted: true, isDefault: false },
  { id: 'role-3', serverId: 'server-1', name: 'Dev',       color: 0x7c6bff, position: 2, permissions: 0b11111, isMentionable: true, isHoisted: true, isDefault: false },
  { id: 'role-4', serverId: 'server-1', name: 'Member',    color: null,     position: 1, permissions: 0b11, isMentionable: false, isHoisted: false, isDefault: false },
]

// ── Mock members ──────────────────────────────────────────────────────────────

export const MOCK_MEMBERS: ServerMember[] = [
  { serverId: 'server-1', userId: 'user-me',  nickname: null,        joinedAt: '2024-01-01T00:00:00Z', roles: [MOCK_ROLES[1]!], user: MOCK_USERS[0]! },
  { serverId: 'server-1', userId: 'user-2',   nickname: 'ferris 🦀', joinedAt: '2024-01-02T00:00:00Z', roles: [MOCK_ROLES[2]!], user: MOCK_USERS[1]! },
  { serverId: 'server-1', userId: 'user-3',   nickname: null,        joinedAt: '2024-01-03T00:00:00Z', roles: [MOCK_ROLES[3]!], user: MOCK_USERS[2]! },
  { serverId: 'server-1', userId: 'user-4',   nickname: null,        joinedAt: '2024-01-04T00:00:00Z', roles: [MOCK_ROLES[2]!], user: MOCK_USERS[3]! },
  { serverId: 'server-1', userId: 'user-5',   nickname: null,        joinedAt: '2024-01-05T00:00:00Z', roles: [MOCK_ROLES[3]!], user: MOCK_USERS[4]! },
]

// ── Mock messages ─────────────────────────────────────────────────────────────

function msg(
  id: string,
  channelId: string,
  authorIndex: number,
  content: string,
  minsAgo: number,
  extra: Partial<Message> = {}
): Message {
  const date = new Date(Date.now() - minsAgo * 60 * 1000)
  return {
    id,
    channelId,
    author: MOCK_USERS[authorIndex]!,
    content,
    type: 'default',
    replyTo: null,
    attachments: [],
    reactions: [],
    isEdited: false,
    createdAt: date.toISOString(),
    editedAt: null,
    ...extra,
  }
}

export const MOCK_MESSAGES: Record<string, Message[]> = {
  'ch-general': [
    msg('m1',  'ch-general', 1, 'hey everyone! just joined the server 👋', 120),
    msg('m2',  'ch-general', 0, 'welcome!! glad you made it', 118),
    msg('m3',  'ch-general', 2, 'yo what\'s up', 117),
    msg('m4',  'ch-general', 1, 'been working on the Rust backend all morning', 115),
    msg('m5',  'ch-general', 0, 'how\'s axum treating you?', 114),
    msg('m6',  'ch-general', 1, 'honestly loving it. the tower middleware composability is 🔥', 113, { reactions: [{ emoji: '🔥', count: 3, meReacted: true }, { emoji: '💯', count: 2, meReacted: false }] }),
    msg('m7',  'ch-general', 3, 'meanwhile I\'m fighting tailwind specificity', 110),
    msg('m8',  'ch-general', 0, 'haha skill issue', 109, { reactions: [{ emoji: '💀', count: 4, meReacted: true }] }),
    msg('m9',  'ch-general', 3, 'ok RUDE', 108),
    msg('m10', 'ch-general', 2, 'anyone tried the vinext deploy to cloudflare yet?', 90),
    msg('m11', 'ch-general', 0, 'yep! build times are insane — 4x faster than next.js', 88),
    msg('m12', 'ch-general', 1, 'nice. does RSC work properly on workers?', 87),
    msg('m13', 'ch-general', 0, 'yeah just gotta be careful with node APIs. no fs, no crypto directly', 86),
    msg('m14', 'ch-general', 0, 'use the WebCrypto API instead', 85),
    msg('m15', 'ch-general', 2, 'good to know 👍', 83),
    msg('m16', 'ch-general', 3, 'btw I pushed the new design system tokens. check #tokens in the design server', 60),
    msg('m17', 'ch-general', 0, 'saw it! the ember + volt combo looks fire', 58),
    msg('m18', 'ch-general', 1, 'agreed. way better than the old generic purple', 57, { reactions: [{ emoji: '❤️', count: 2, meReacted: false }] }),
    msg('m19', 'ch-general', 4, 'just woke up, what did I miss', 30),
    msg('m20', 'ch-general', 0, 'not much, just shipping 🚀', 28),
  ],
  'ch-frontend': [
    msg('m-f1', 'ch-frontend', 3, 'guys the MessageList virtualization is smooth as butter', 200),
    msg('m-f2', 'ch-frontend', 0, '@tanstack/react-virtual does the heavy lifting', 199),
    msg('m-f3', 'ch-frontend', 3, 'how does the cursor pagination work with it?', 198),
    msg('m-f4', 'ch-frontend', 0, 'we load 50 messages at a time. when you scroll to the top it fetches older ones and prepends them', 196),
    msg('m-f5', 'ch-frontend', 0, 'the virtualizer adjusts automatically', 195),
    msg('m-f6', 'ch-frontend', 2, 'what about optimistic updates?', 180),
    msg('m-f7', 'ch-frontend', 0, 'message gets appended to the store immediately, then the WS event deduplicates it when it arrives', 178),
    msg('m-f8', 'ch-frontend', 3, 'smart. so no double messages', 177),
    msg('m-f9', 'ch-frontend', 0, 'exactly 👌', 176, { reactions: [{ emoji: '👌', count: 1, meReacted: false }] }),
  ],
  'ch-backend': [
    msg('m-b1', 'ch-backend', 1, 'sqlx is incredible btw. compile-time query checking is game changing', 300),
    msg('m-b2', 'ch-backend', 0, 'yeah the `query!` macro catches errors before runtime', 299),
    msg('m-b3', 'ch-backend', 1, 'working on the message pagination query rn', 295),
    msg('m-b4', 'ch-backend', 1, '```sql\nSELECT * FROM messages\nWHERE channel_id = $1\n  AND created_at < $2\nORDER BY created_at DESC\nLIMIT $3\n```', 294),
    msg('m-b5', 'ch-backend', 0, 'nice. make sure the index is on (channel_id, created_at DESC)', 292),
    msg('m-b6', 'ch-backend', 1, 'already on it. EXPLAIN ANALYZE shows index-only scan 🎉', 290, { reactions: [{ emoji: '🎉', count: 2, meReacted: true }] }),
  ],
  'ch-welcome': [
    msg('m-w1', 'ch-welcome', 0, '# Welcome to DCC Dev Hub! 👋\n\nThis is where we build DCC and ship features fast.\n\nCheck out the channels below to get started.', 10000),
  ],
  'ch-memes': [
    msg('m-mm1', 'ch-memes', 2, 'me writing TypeScript vs me writing Rust', 500),
    msg('m-mm2', 'ch-memes', 1, 'borrow checker jumpscare', 499, { reactions: [{ emoji: '💀', count: 5, meReacted: true }, { emoji: '😂', count: 3, meReacted: false }] }),
    msg('m-mm3', 'ch-memes', 3, 'the css is not doing what I want it to do meme but its tailwind', 490),
    msg('m-mm4', 'ch-memes', 0, 'just add more classes lmao', 489),
  ],
}

// ── Mock friendships ──────────────────────────────────────────────────────────

export const MOCK_FRIENDS: Friendship[] = [
  { id: 'fr-1', requesterId: 'user-me', addresseeId: 'user-2', status: 'accepted', createdAt: '2024-01-02T00:00:00Z', user: MOCK_USERS[1]! },
  { id: 'fr-2', requesterId: 'user-3', addresseeId: 'user-me', status: 'accepted', createdAt: '2024-01-03T00:00:00Z', user: MOCK_USERS[2]! },
  { id: 'fr-3', requesterId: 'user-4', addresseeId: 'user-me', status: 'pending',  createdAt: '2024-03-01T00:00:00Z', user: MOCK_USERS[3]! },
]

// ── Presence map ──────────────────────────────────────────────────────────────

export const MOCK_PRESENCE: Record<string, { status: User['status']; customStatus: string | null }> = {
  'user-me':  { status: 'online',  customStatus: 'Building DCC' },
  'user-2':   { status: 'online',  customStatus: 'cargo build --release' },
  'user-3':   { status: 'idle',    customStatus: null },
  'user-4':   { status: 'dnd',     customStatus: 'In the zone' },
  'user-5':   { status: 'offline', customStatus: null },
}
