'use client'

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Menu, ShieldBan, UserMinus, UserPlus, Users } from 'lucide-react'
import { ApiRequestError, friendsApi } from '@/lib/api'
import { cn } from '@/lib/cn'
import { isMockSession } from '@/lib/mock-init'
import { MOCK_FRIENDS, MOCK_USERS } from '@/lib/mock-data'
import { getUserDisplayName, getUserHandle } from '@/lib/users/displayName.shared'
import { useAuthStore } from '@/stores/authStore'
import { useFriendsStore } from '@/stores/friendsStore'
import { usePresenceStore } from '@/stores/presenceStore'
import { useMobileSidebar } from '@/components/layout/MobileSidebarShell'
import { UserAvatar } from '@/components/user/UserAvatar'
import type { Friendship, User, UserStatus } from '@/lib/types'

type Tab = 'online' | 'all' | 'pending' | 'blocked' | 'add'
type Notice = { tone: 'success' | 'error'; message: string } | null

export default function FriendsPage() {
  const [tab, setTab] = useState<Tab>('online')
  const [addUsername, setAddUsername] = useState('')
  const [notice, setNotice] = useState<Notice>(null)
  const [submittingRequest, setSubmittingRequest] = useState(false)
  const [pendingActionUserId, setPendingActionUserId] = useState<string | null>(null)

  const mobileSidebar = useMobileSidebar()
  const me = useAuthStore((state) => state.user)
  const friendships = useFriendsStore((state) => state.friendships)
  const hasLoaded = useFriendsStore((state) => state.hasLoaded)
  const isLoading = useFriendsStore((state) => state.isLoading)
  const setLoading = useFriendsStore((state) => state.setLoading)
  const setFriendships = useFriendsStore((state) => state.setFriendships)
  const upsertFriendship = useFriendsStore((state) => state.upsertFriendship)
  const removeFriendshipById = useFriendsStore((state) => state.removeFriendshipById)
  const presence = usePresenceStore((state) => state.presence)
  const isMock = isMockSession()

  useEffect(() => {
    if (isMock) {
      if (!hasLoaded) setFriendships(MOCK_FRIENDS)
    }
  }, [hasLoaded, isMock, setFriendships])

  const acceptedFriends = useMemo(
    () => friendships.filter((friendship) => friendship.status === 'accepted'),
    [friendships]
  )
  const pendingIncoming = useMemo(
    () =>
      friendships.filter(
        (friendship) => friendship.status === 'pending' && friendship.addresseeId === me?.id
      ),
    [friendships, me?.id]
  )
  const pendingOutgoing = useMemo(
    () =>
      friendships.filter(
        (friendship) => friendship.status === 'pending' && friendship.requesterId === me?.id
      ),
    [friendships, me?.id]
  )
  const blockedFriends = useMemo(
    () => friendships.filter((friendship) => friendship.status === 'blocked'),
    [friendships]
  )
  const onlineFriends = useMemo(
    () =>
      acceptedFriends.filter((friendship) => getEffectiveStatus(friendship.user, presence) !== 'offline'),
    [acceptedFriends, presence]
  )

  const visibleFriendships = useMemo(() => {
    if (tab === 'online') return onlineFriends
    if (tab === 'all') return acceptedFriends
    if (tab === 'pending') return [...pendingIncoming, ...pendingOutgoing]
    if (tab === 'blocked') return blockedFriends
    return []
  }, [acceptedFriends, blockedFriends, onlineFriends, pendingIncoming, pendingOutgoing, tab])

  const counts = {
    online: onlineFriends.length,
    all: acceptedFriends.length,
    pending: pendingIncoming.length + pendingOutgoing.length,
    blocked: blockedFriends.length,
  }

  const handleSendRequest = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = addUsername.trim()
    if (!trimmed) return

    setSubmittingRequest(true)
    setNotice(null)

    try {
      const friendship = isMock
        ? createMockFriendRequest(trimmed, me?.id ?? null, friendships)
        : (await friendsApi.sendByUsername(trimmed)).data

      upsertFriendship(friendship)
      setAddUsername('')
      setNotice({
        tone: 'success',
        message: `Solicitud enviada a ${getUserDisplayName(friendship.user)}.`,
      })
      setTab('pending')
    } catch (error) {
      setNotice({
        tone: 'error',
        message: getApiErrorMessage(error, 'No pudimos enviar la solicitud de amistad.'),
      })
    } finally {
      setSubmittingRequest(false)
    }
  }

  const handleFriendAction = async (
    friendship: Friendship,
    action: 'accept' | 'decline' | 'block' | 'remove'
  ) => {
    setPendingActionUserId(friendship.user.id)
    setNotice(null)

    try {
      if (isMock) {
        applyMockFriendAction(friendship, action, upsertFriendship, removeFriendshipById)
      } else if (action === 'accept') {
        const response = await friendsApi.accept(friendship.user.id)
        upsertFriendship(response.data)
      } else if (action === 'block') {
        const response = await friendsApi.block(friendship.user.id)
        upsertFriendship(response.data)
      } else if (action === 'decline') {
        await friendsApi.decline(friendship.user.id)
        removeFriendshipById(friendship.id)
      } else {
        await friendsApi.remove(friendship.user.id)
        removeFriendshipById(friendship.id)
      }

      setNotice({
        tone: 'success',
        message: buildActionMessage(friendship, action),
      })
    } catch (error) {
      setNotice({
        tone: 'error',
        message: getApiErrorMessage(error, 'No pudimos actualizar esa amistad.'),
      })
    } finally {
      setPendingActionUserId((current) => (current === friendship.user.id ? null : current))
    }
  }

  return (
    <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-[var(--s3)]">
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-[var(--b0)] px-4 surface-elevated">
        {mobileSidebar && (
          <button
            type="button"
            aria-label="Abrir sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent bg-[var(--s1)] text-[var(--t3)] transition-all hover:border-[var(--b1)] hover:text-[var(--t1)] md:hidden"
            onClick={mobileSidebar.toggle}
          >
            <Menu size={18} />
          </button>
        )}
        <div className="flex items-center gap-2">
          <Users size={20} className="text-[var(--t3)]" />
          <span className="font-display font-700 text-[var(--t0)]">Friends</span>
        </div>

        <div className="h-4 w-px bg-[var(--b1)]" />

        <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {([
            { key: 'online', label: 'Online', count: counts.online },
            { key: 'all', label: 'All', count: counts.all },
            { key: 'pending', label: 'Pending', count: counts.pending },
            { key: 'blocked', label: 'Blocked', count: counts.blocked },
          ] as const).map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={cn(
                'whitespace-nowrap rounded-md px-3 py-1 text-sm font-500 transition-colors',
                tab === item.key
                  ? 'bg-[var(--b2)] text-[var(--t0)]'
                  : 'text-[var(--t3)] hover:bg-[var(--surface-soft)] hover:text-[var(--t1)]'
              )}
            >
              {item.label}
              {item.count > 0 ? ` (${item.count})` : ''}
            </button>
          ))}
        </nav>

        <button
          onClick={() => setTab('add')}
          className="ml-1 shrink-0 rounded-md bg-[var(--online)]/15 px-2 py-1 text-xs font-700 text-[var(--online)] transition-colors hover:bg-[var(--online)]/25 sm:px-3 sm:text-sm sm:font-600"
        >
          Add Friend
        </button>
      </header>

      <div className="scrollable flex-1 px-5 py-5 sm:px-8 sm:py-6">
        {notice ? <NoticeBanner notice={notice} /> : null}

        {tab === 'add' ? (
          <AddFriendSection
            value={addUsername}
            isSubmitting={submittingRequest}
            onChange={setAddUsername}
            onSubmit={handleSendRequest}
          />
        ) : (
          <FriendsListSection
            tab={tab}
            isLoading={!hasLoaded && isLoading}
            meId={me?.id ?? null}
            friendships={visibleFriendships}
            pendingActionUserId={pendingActionUserId}
            onAction={handleFriendAction}
            presence={presence}
          />
        )}
      </div>
    </main>
  )
}

function AddFriendSection({
  value,
  isSubmitting,
  onChange,
  onSubmit,
}: {
  value: string
  isSubmitting: boolean
  onChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
}) {
  return (
    <section className="max-w-3xl">
      <h2 className="font-display text-2xl font-700 text-[var(--t0)]">Add a Friend</h2>
      <p className="mt-1 text-sm text-[var(--t3)]">
        You can add a friend using their DCC username or `username#1234`.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-5 rounded-2xl border border-[var(--b1)] bg-[var(--s1)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="owellpolanco"
            className="flex-1 rounded-xl border border-[var(--b1)] bg-[var(--s4)] px-4 py-3 text-sm text-[var(--t0)] placeholder:text-[var(--t4)] outline-none transition-colors focus:border-[var(--b2)]"
          />
          <button
            type="submit"
            disabled={!value.trim() || isSubmitting}
            className="inline-flex items-center justify-center rounded-xl bg-volt px-5 py-3 text-sm font-700 text-[var(--volt-contrast)] transition-all hover:bg-volt-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Sending...' : 'Send Request'}
          </button>
        </div>
      </form>
    </section>
  )
}

function FriendsListSection({
  tab,
  isLoading,
  meId,
  friendships,
  pendingActionUserId,
  onAction,
  presence,
}: {
  tab: Exclude<Tab, 'add'>
  isLoading: boolean
  meId: string | null
  friendships: Friendship[]
  pendingActionUserId: string | null
  onAction: (friendship: Friendship, action: 'accept' | 'decline' | 'block' | 'remove') => void
  presence: Record<string, { status: UserStatus; customStatus: string | null }>
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--b1)] bg-[var(--s1)] px-4 py-4 text-sm text-[var(--t3)]">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--ember)]/25 border-t-[var(--ember)]" />
        Loading your friends...
      </div>
    )
  }

  if (friendships.length === 0) {
    return <EmptyFriendsState tab={tab} />
  }

  return (
    <section>
      <p className="sidebar-section-label mb-3">
        {tabLabel(tab)} - {friendships.length}
      </p>

      <div className="space-y-3">
        {friendships.map((friendship) => (
          <FriendshipCard
            key={friendship.id}
            friendship={friendship}
            tab={tab}
            meId={meId}
            isBusy={pendingActionUserId === friendship.user.id}
            status={getEffectiveStatus(friendship.user, presence)}
            customStatus={presence[friendship.user.id]?.customStatus ?? friendship.user.customStatus ?? null}
            onAction={onAction}
          />
        ))}
      </div>
    </section>
  )
}

function FriendshipCard({
  friendship,
  tab,
  meId,
  isBusy,
  status,
  customStatus,
  onAction,
}: {
  friendship: Friendship
  tab: Exclude<Tab, 'add'>
  meId: string | null
  isBusy: boolean
  status: UserStatus
  customStatus: string | null
  onAction: (friendship: Friendship, action: 'accept' | 'decline' | 'block' | 'remove') => void
}) {
  const isIncomingPending = friendship.status === 'pending' && friendship.addresseeId === meId
  const isOutgoingPending = friendship.status === 'pending' && friendship.requesterId === meId

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-[var(--b1)] bg-[var(--s1)] p-4 shadow-[0_12px_26px_rgba(0,0,0,0.14)] sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <UserAvatar user={friendship.user} size={48} showStatus />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate font-display text-[16px] font-700 text-[var(--t0)]">
              {getUserDisplayName(friendship.user)}
            </p>
            <StatusPill status={status} />
          </div>

          <p className="truncate text-sm text-[var(--t3)]">
            {customStatus || `${getUserHandle(friendship.user)}#${String(friendship.user.discriminator).padStart(4, '0')}`}
          </p>

          {tab === 'pending' ? (
            <p className="mt-1 text-xs font-600 uppercase tracking-[0.12em] text-[var(--t4)]">
              {isIncomingPending ? 'Incoming request' : isOutgoingPending ? 'Outgoing request' : 'Pending'}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {friendship.status === 'accepted' ? (
          <>
            <ActionButton
              icon={<ShieldBan size={15} />}
              label="Block"
              busy={isBusy}
              onClick={() => onAction(friendship, 'block')}
            />
            <ActionButton
              icon={<UserMinus size={15} />}
              label="Remove"
              busy={isBusy}
              onClick={() => onAction(friendship, 'remove')}
            />
          </>
        ) : null}

        {friendship.status === 'pending' && isIncomingPending ? (
          <>
            <ActionButton
              icon={<UserPlus size={15} />}
              label="Accept"
              busy={isBusy}
              emphasis="positive"
              onClick={() => onAction(friendship, 'accept')}
            />
            <ActionButton
              icon={<UserMinus size={15} />}
              label="Decline"
              busy={isBusy}
              onClick={() => onAction(friendship, 'decline')}
            />
            <ActionButton
              icon={<ShieldBan size={15} />}
              label="Block"
              busy={isBusy}
              onClick={() => onAction(friendship, 'block')}
            />
          </>
        ) : null}

        {friendship.status === 'pending' && isOutgoingPending ? (
          <ActionButton
            icon={<UserMinus size={15} />}
            label="Cancel"
            busy={isBusy}
            onClick={() => onAction(friendship, 'remove')}
          />
        ) : null}

        {friendship.status === 'blocked' ? (
          <ActionButton
            icon={<UserMinus size={15} />}
            label="Unblock"
            busy={isBusy}
            onClick={() => onAction(friendship, 'remove')}
          />
        ) : null}
      </div>
    </article>
  )
}

function ActionButton({
  icon,
  label,
  busy,
  emphasis,
  onClick,
}: {
  icon: ReactNode
  label: string
  busy: boolean
  emphasis?: 'positive'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        emphasis === 'positive'
          ? 'bg-[var(--online)]/15 text-[var(--online)] hover:bg-[var(--online)]/25'
          : 'bg-[var(--s4)] text-[var(--t2)] hover:bg-[var(--surface-soft)] hover:text-[var(--t1)]'
      )}
    >
      {busy ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" /> : icon}
      {label}
    </button>
  )
}

function NoticeBanner({ notice }: { notice: NonNullable<Notice> }) {
  return (
    <div
      className={cn(
        'mb-4 rounded-2xl border px-4 py-3 text-sm',
        notice.tone === 'success'
          ? 'border-[var(--online)]/30 bg-[var(--online)]/10 text-[var(--online)]'
          : 'border-[var(--dnd)]/30 bg-[var(--dnd)]/10 text-[var(--dnd)]'
      )}
    >
      {notice.message}
    </div>
  )
}

function EmptyFriendsState({ tab }: { tab: Exclude<Tab, 'add'> }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--b1)] bg-[var(--s1)] px-6 py-14 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--s2)] surface-elevated">
        <Users size={36} className="text-[var(--t4)]" strokeWidth={1.5} />
      </div>
      <p className="font-display text-lg font-700 text-[var(--t0)]">{emptyTitle(tab)}</p>
      <p className="max-w-md text-sm text-[var(--t3)]">{emptyDescription(tab)}</p>
    </div>
  )
}

function StatusPill({ status }: { status: UserStatus }) {
  const palette =
    status === 'online'
      ? 'bg-[var(--online)]/15 text-[var(--online)]'
      : status === 'idle'
        ? 'bg-[var(--idle)]/15 text-[var(--idle)]'
        : status === 'dnd'
          ? 'bg-[var(--dnd)]/15 text-[var(--dnd)]'
          : 'bg-[var(--s4)] text-[var(--t4)]'

  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-700 uppercase tracking-[0.08em]', palette)}>
      {status}
    </span>
  )
}

function getEffectiveStatus(
  user: User,
  presence: Record<string, { status: UserStatus; customStatus: string | null }>
) {
  return presence[user.id]?.status ?? user.status ?? 'offline'
}

function tabLabel(tab: Exclude<Tab, 'add'>) {
  if (tab === 'online') return 'Online'
  if (tab === 'all') return 'All Friends'
  if (tab === 'pending') return 'Pending Requests'
  return 'Blocked'
}

function emptyTitle(tab: Exclude<Tab, 'add'>) {
  if (tab === 'online') return "No one's online right now"
  if (tab === 'all') return 'No friends yet'
  if (tab === 'pending') return 'No pending requests'
  return 'No blocked users'
}

function emptyDescription(tab: Exclude<Tab, 'add'>) {
  if (tab === 'online') return 'Your accepted friends will appear here when they come online.'
  if (tab === 'all') return 'Send a friend request to start building your list.'
  if (tab === 'pending') return 'Incoming and outgoing requests will show up here.'
  return 'People you block will move into this list until you unblock them.'
}

function buildActionMessage(friendship: Friendship, action: 'accept' | 'decline' | 'block' | 'remove') {
  const name = getUserDisplayName(friendship.user)
  if (action === 'accept') return `${name} is now in your friends list.`
  if (action === 'decline') return `Request from ${name} declined.`
  if (action === 'block') return `${name} has been blocked.`
  return `Updated friendship with ${name}.`
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function createMockFriendRequest(identifier: string, meId: string | null, friendships: Friendship[]) {
  const normalized = identifier.trim().toLowerCase()
  const match = MOCK_USERS.find((user) => {
    const handle = `${user.username}#${String(user.discriminator).padStart(4, '0')}`.toLowerCase()
    return user.username.toLowerCase() === normalized || handle === normalized
  })

  if (!match) {
    throw new Error('User not found')
  }
  if (match.id === meId) {
    throw new Error('Cannot send friend request to yourself')
  }
  if (friendships.some((friendship) => friendship.user.id === match.id)) {
    throw new Error('Friendship already exists')
  }

  return {
    id: `mock-friend-${Date.now()}`,
    requesterId: meId ?? 'user-me',
    addresseeId: match.id,
    status: 'pending',
    createdAt: new Date().toISOString(),
    user: match,
  } satisfies Friendship
}

function applyMockFriendAction(
  friendship: Friendship,
  action: 'accept' | 'decline' | 'block' | 'remove',
  upsertFriendship: (friendship: Friendship) => void,
  removeFriendshipById: (friendshipId: string) => void
) {
  if (action === 'accept') {
    upsertFriendship({ ...friendship, status: 'accepted' })
    return
  }

  if (action === 'block') {
    upsertFriendship({ ...friendship, status: 'blocked' })
    return
  }

  removeFriendshipById(friendship.id)
}
