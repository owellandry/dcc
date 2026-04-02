'use client'

import { useState } from 'react'
import { Menu, Users } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useMobileSidebar } from '@/components/layout/MobileSidebarShell'

type Tab = 'online' | 'all' | 'pending' | 'blocked' | 'add'

export default function FriendsPage() {
  const [tab, setTab] = useState<Tab>('online')
  const [addUsername, setAddUsername] = useState('')
  const mobileSidebar = useMobileSidebar()

  return (
    <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-[var(--s3)]">
      {/* Header */}
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

        {/* Tabs */}
        <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {(['online', 'all', 'pending', 'blocked'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'whitespace-nowrap rounded-md px-3 py-1 text-sm font-500 capitalize transition-colors',
                tab === t
                  ? 'bg-[var(--b2)] text-[var(--t0)]'
                  : 'text-[var(--t3)] hover:bg-[var(--surface-soft)] hover:text-[var(--t1)]'
              )}
            >
              {t}
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

      {/* Content */}
      <div className="scrollable flex-1 px-8 py-6">
        {tab === 'add' ? (
          <AddFriendSection value={addUsername} onChange={setAddUsername} />
        ) : (
          <FriendListSection tab={tab} />
        )}
      </div>
    </main>
  )
}

function AddFriendSection({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="max-w-xl">
      <h2 className="font-display text-xl font-700 text-[var(--t0)]">Add a Friend</h2>
      <p className="mt-1 text-sm text-[var(--t3)]">You can add a friend using their DCC username.</p>

      <div className="mt-5 flex gap-2 rounded-xl border border-[var(--b1)] bg-[var(--s4)] px-4 py-3 surface-elevated">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter a username"
          className="flex-1 bg-transparent text-sm text-[var(--t0)] placeholder:text-[var(--t4)] outline-none"
        />
        <button
          disabled={!value.trim()}
          className="rounded-lg bg-volt px-4 py-1.5 text-sm font-600 text-[var(--volt-contrast)] transition-all hover:bg-volt-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send Request
        </button>
      </div>
    </div>
  )
}

function FriendListSection({ tab }: { tab: Tab }) {
  return (
    <div>
      <p className="sidebar-section-label mb-3">
        {tab === 'online' ? 'Online' : tab === 'pending' ? 'Pending' : tab === 'blocked' ? 'Blocked' : 'All Friends'} — 0
      </p>
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--s2)] surface-elevated">
          <Users size={36} className="text-[var(--t4)]" strokeWidth={1.5} />
        </div>
        <p className="text-[var(--t3)]">
          {tab === 'online'
            ? "No one's online yet"
            : tab === 'pending'
            ? 'No pending requests'
            : tab === 'blocked'
            ? 'Nobody blocked'
            : 'No friends yet — add someone!'}
        </p>
      </div>
    </div>
  )
}
