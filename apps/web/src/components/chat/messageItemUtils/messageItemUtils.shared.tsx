import { format, isToday, isYesterday } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/cn'

export function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) return `Today at ${format(date, 'HH:mm')}`
  if (isYesterday(date)) return `Yesterday at ${format(date, 'HH:mm')}`
  return format(date, 'dd/MM/yyyy HH:mm')
}

export function containsMentionForUser(content: string | null, username: string | null): boolean {
  if (!content || !username) return false
  const normalizedContent = content.toLowerCase()
  const plainMention = new RegExp(`(^|[^\\w])@${escapeRegExp(username)}(?=$|[^\\w])`, 'i')
  return normalizedContent.includes(`@{${username.toLowerCase()}}`) || plainMention.test(content)
}

export function renderMessageContent(
  content: string | null,
  username: string | null,
  resolveChannelHref?: (channelName: string) => string | null
): React.ReactNode {
  if (!content) return null

  const mentionPattern = /@\{([^}]+)\}|#\{([^}]+)\}|(^|[^\w])(@([a-zA-Z0-9._-]+)|#([a-zA-Z0-9._-]+))/g
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = mentionPattern.exec(content)) !== null) {
    const matchedText = match[0]
    const mentionedName = match[1] ?? match[4]
    const mentionedChannel = match[2] ?? match[5]
    const prefix = match[3] ?? ''
    const start = match.index + prefix.length

    if (start > lastIndex) {
      nodes.push(content.slice(lastIndex, start))
    }

    if (mentionedName && !mentionedName.startsWith('#')) {
      const normalizedMentionedName = mentionedName.replace(/^@+/, '')
      const isMentioningMe = username != null && normalizedMentionedName.toLowerCase() === username.toLowerCase()
      nodes.push(
        <span
          key={`${matchedText}-${start}`}
          className={cn(
            'rounded-md px-1 py-0.5 font-600',
            isMentioningMe
              ? 'bg-[var(--ember-dim)] text-ember'
              : 'bg-[var(--surface-soft-hover)] text-[var(--t1)]'
          )}
        >
          @{normalizedMentionedName}
        </span>
      )
    } else {
      const channelName = mentionedChannel ?? (mentionedName?.startsWith('#') ? mentionedName.slice(1) : null)
      if (!channelName) {
        lastIndex = match.index + matchedText.length
        continue
      }

      const href = resolveChannelHref?.(channelName) ?? null
      if (href) {
        nodes.push(
          <Link
            key={`${matchedText}-${start}`}
            href={href}
            className="rounded-md bg-indigo-500/20 px-1 py-0.5 font-600 text-indigo-200 hover:bg-indigo-500/30"
          >
            #{channelName}
          </Link>
        )
      } else {
        nodes.push(
          <span
            key={`${matchedText}-${start}`}
            className="rounded-md bg-indigo-500/20 px-1 py-0.5 font-600 text-indigo-200"
          >
            #{channelName}
          </span>
        )
      }
    }

    lastIndex = match.index + matchedText.length
  }

  if (lastIndex < content.length) {
    nodes.push(content.slice(lastIndex))
  }

  return linkifyNodes(nodes)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<]+/gi
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const PHONE_PATTERN = /^\+?\d[\d\s().-]{6,}\d$/
const LINK_TOKEN_PATTERN = /((?:https?:\/\/|www\.)[^\s<]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|\+?\d[\d\s().-]{6,}\d)/gi

export function extractFirstUrl(content: string | null): string | null {
  if (!content) return null
  const match = content.match(URL_PATTERN)
  if (!match?.length) return null
  const normalizedUrl = normalizeUrl(match[0])
  return normalizedUrl
}

function linkifyNodes(nodes: React.ReactNode[]): React.ReactNode[] {
  const linked: React.ReactNode[] = []

  nodes.forEach((node, index) => {
    if (typeof node !== 'string') {
      linked.push(node)
      return
    }

    linked.push(...linkifyTextSegment(node, `seg-${index}`))
  })

  return linked
}

function linkifyTextSegment(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = LINK_TOKEN_PATTERN.exec(text)) !== null) {
    const token = match[0]
    const start = match.index
    const end = start + token.length

    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start))
    }

    const { core, trailing } = splitTrailingPunctuation(token)
    const normalizedUrl = normalizeUrl(core)
    const isEmail = EMAIL_PATTERN.test(core)
    const isPhone = PHONE_PATTERN.test(core)

    if (normalizedUrl) {
      nodes.push(
        <a
          key={`${keyPrefix}-url-${start}`}
          href={normalizedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-sm px-0.5 text-[#7aabff] underline decoration-[#7aabff]/70 underline-offset-2 transition-colors hover:text-[#9dc4ff]"
        >
          {core}
        </a>
      )
    } else if (isEmail) {
      nodes.push(
        <a
          key={`${keyPrefix}-email-${start}`}
          href={`mailto:${core}`}
          className="rounded-sm px-0.5 text-[#7aabff] underline decoration-[#7aabff]/70 underline-offset-2 transition-colors hover:text-[#9dc4ff]"
        >
          {core}
        </a>
      )
    } else if (isPhone) {
      const telValue = core.replace(/[^\d+]/g, '')
      nodes.push(
        <a
          key={`${keyPrefix}-phone-${start}`}
          href={`tel:${telValue}`}
          className="rounded-sm px-0.5 text-[#7aabff] underline decoration-[#7aabff]/70 underline-offset-2 transition-colors hover:text-[#9dc4ff]"
        >
          {core}
        </a>
      )
    } else {
      nodes.push(core)
    }

    if (trailing) {
      nodes.push(trailing)
    }

    lastIndex = end
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  LINK_TOKEN_PATTERN.lastIndex = 0
  return nodes
}

function normalizeUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`
  return null
}

function splitTrailingPunctuation(token: string): { core: string; trailing: string } {
  const match = token.match(/^(.*?)([),.;:!?]+)?$/)
  if (!match) return { core: token, trailing: '' }
  return { core: match[1] || token, trailing: match[2] ?? '' }
}
