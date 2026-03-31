'use client'

import {
  FaAward,
  FaBug,
  FaCode,
  FaCrown,
  FaHandshake,
  FaLanguage,
  FaMedal,
  FaRobot,
  FaShieldHalved,
  FaStar,
  FaTrophy,
  FaUserCheck,
  FaUsers,
  FaWandMagicSparkles,
} from 'react-icons/fa6'
import { FaCheck } from 'react-icons/fa'
import { MdVerified } from 'react-icons/md'
import { cn } from '@/lib/cn'
import type { Role, User } from '@/lib/types'

export type UserBadgeId =
  | 'owner'
  | 'verified'
  | 'staff_user'
  | 'developer_user'
  | 'star_user'
  | 'bot'
  | 'early_user'
  | 'bug_hunter'
  | 'founder_user'
  | 'contributor_user'
  | 'mentor_user'
  | 'partner_user'
  | 'supporter_user'
  | 'event_winner'
  | 'content_creator'
  | 'translator_user'
  | 'official_member'

export interface UserBadgeItem {
  id: UserBadgeId
  label: string
}

interface Props {
  badge: UserBadgeItem
}

const BADGE_STYLES: Record<UserBadgeId, { iconClassName: string; icon: React.ReactNode }> = {
  owner: {
    iconClassName: 'text-amber-400',
    icon: <FaCrown className="text-current" />,
  },
  verified: {
    iconClassName: 'text-emerald-400',
    icon: <MdVerified className="text-current" />,
  },
  staff_user: {
    iconClassName: 'text-indigo-400',
    icon: <FaShieldHalved className="text-current" />,
  },
  developer_user: {
    iconClassName: 'text-cyan-400',
    icon: <FaCode className="text-current" />,
  },
  star_user: {
    iconClassName: 'text-yellow-400',
    icon: <FaStar className="text-current" />,
  },
  bot: {
    iconClassName: 'text-fuchsia-400',
    icon: <FaRobot className="text-current" />,
  },
  early_user: {
    iconClassName: 'text-lime-400',
    icon: <FaWandMagicSparkles className="text-current" />,
  },
  bug_hunter: {
    iconClassName: 'text-rose-400',
    icon: <FaBug className="text-current" />,
  },
  founder_user: {
    iconClassName: 'text-orange-400',
    icon: <FaCrown className="text-current" />,
  },
  contributor_user: {
    iconClassName: 'text-sky-400',
    icon: <FaUsers className="text-current" />,
  },
  mentor_user: {
    iconClassName: 'text-violet-400',
    icon: <FaUserCheck className="text-current" />,
  },
  partner_user: {
    iconClassName: 'text-teal-400',
    icon: <FaHandshake className="text-current" />,
  },
  supporter_user: {
    iconClassName: 'text-pink-400',
    icon: <FaMedal className="text-current" />,
  },
  event_winner: {
    iconClassName: 'text-amber-500',
    icon: <FaTrophy className="text-current" />,
  },
  content_creator: {
    iconClassName: 'text-emerald-500',
    icon: <FaAward className="text-current" />,
  },
  translator_user: {
    iconClassName: 'text-blue-400',
    icon: <FaLanguage className="text-current" />,
  },
  official_member: {
    iconClassName: 'text-white',
    icon: <FaCheck className="text-current" />,
  },
}

const BADGE_LABELS: Record<UserBadgeId, string> = {
  owner: 'Propietario',
  verified: 'Verificado',
  staff_user: 'Personal',
  developer_user: 'Desarrollador',
  star_user: 'Usuario Estrella',
  bot: 'Bot',
  early_user: 'Usuario Antiguo',
  bug_hunter: 'Cazador de Bugs',
  founder_user: 'Fundador',
  contributor_user: 'Colaborador',
  mentor_user: 'Mentor',
  partner_user: 'Socio',
  supporter_user: 'Patrocinador',
  event_winner: 'Ganador de Evento',
  content_creator: 'Creador de Contenido',
  translator_user: 'Traductor',
  official_member: 'Miembro oficial',
}

export function Badge({ badge }: Props) {
  const style = BADGE_STYLES[badge.id]
  if (badge.id === 'official_member') {
    return <OfficialMemberTag label={badge.label} />
  }

  return (
    <span className="badge-tooltip inline-flex" data-tooltip={badge.label} data-tooltip-position="top">
      <span
        aria-label={badge.label}
        className="inline-flex h-6 w-6 items-center justify-center transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110"
      >
        <span className={cn('inline-flex items-center justify-center [&_svg]:h-[18px] [&_svg]:w-[18px]', style.iconClassName)}>
          {style.icon}
        </span>
      </span>
    </span>
  )
}

export function OfficialMemberTag({
  label = BADGE_LABELS.official_member,
  compact = false,
  className,
}: {
  label?: string
  compact?: boolean
  className?: string
}) {
  const style = BADGE_STYLES.official_member

  return (
    <span className="badge-tooltip inline-flex align-middle" data-tooltip={label} data-tooltip-position="bottom">
      <span
        role="img"
        aria-label={label}
        className={cn(
          'inline-flex shrink-0 items-center rounded-md bg-[#5865f2] font-800 uppercase tracking-[0.06em] text-white transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110',
          compact
            ? 'h-5 gap-1 pl-1 pr-2 text-[9px] leading-none'
            : 'h-6 gap-1 pl-1 pr-2 text-[10px] leading-none',
          className
        )}
      >
        <span
          className={cn(
            'inline-flex items-center justify-center',
            compact ? '[&_svg]:h-[12px] [&_svg]:w-[12px]' : '[&_svg]:h-[14px] [&_svg]:w-[14px]'
          )}
        >
          {style.icon}
        </span>
        <span>OFICIAL</span>
      </span>
    </span>
  )
}

export function buildMemberBadges({
  isOwner,
  user,
  roles,
}: {
  isOwner: boolean
  user: User
  roles: Role[]
}): UserBadgeItem[] {
  const badges: UserBadgeItem[] = []
  const seen = new Set<UserBadgeId>()
  const roleNames = roles.map((role) => role.name.toLowerCase()).join(' ')
  const userAgeDays = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  const persistedBadgeIds = (user.badges ?? []).filter((badgeId): badgeId is UserBadgeId =>
    badgeId !== 'official_member' && isUserBadgeId(badgeId)
  )
  const addBadge = (id: UserBadgeId, label: string) => {
    if (seen.has(id)) return
    seen.add(id)
    badges.push({ id, label })
  }

  if (isOwner) addBadge('owner', BADGE_LABELS.owner)
  persistedBadgeIds.forEach((badgeId) => addBadge(badgeId, BADGE_LABELS[badgeId]))
  if (user.isVerified) addBadge('verified', BADGE_LABELS.verified)
  if (/\b(staff|team|support|helper|moderator|mod|admin)\b/.test(roleNames)) addBadge('staff_user', BADGE_LABELS.staff_user)
  if (/\b(dev|developer|engineer|coder|programmer|tech)\b/.test(roleNames)) addBadge('developer_user', BADGE_LABELS.developer_user)
  if (/\b(star|vip|mvp|legend|pro)\b/.test(roleNames)) addBadge('star_user', BADGE_LABELS.star_user)
  if (/\b(bot|automation|ai)\b/.test(roleNames) || /\bbot\b/i.test(user.username)) addBadge('bot', BADGE_LABELS.bot)
  if (/\b(qa|tester|testing|bug)\b/.test(roleNames)) addBadge('bug_hunter', BADGE_LABELS.bug_hunter)
  if (/\b(founder|creator|origin|owner)\b/.test(roleNames)) addBadge('founder_user', BADGE_LABELS.founder_user)
  if (/\b(contributor|contrib|volunteer|collaborator)\b/.test(roleNames)) addBadge('contributor_user', BADGE_LABELS.contributor_user)
  if (/\b(mentor|coach|teacher|guide)\b/.test(roleNames)) addBadge('mentor_user', BADGE_LABELS.mentor_user)
  if (/\b(partner|sponsor|affiliate)\b/.test(roleNames)) addBadge('partner_user', BADGE_LABELS.partner_user)
  if (/\b(supporter|support|backer|booster)\b/.test(roleNames)) addBadge('supporter_user', BADGE_LABELS.supporter_user)
  if (/\b(winner|champion|tournament)\b/.test(roleNames)) addBadge('event_winner', BADGE_LABELS.event_winner)
  if (/\b(creator|streamer|content|artist|designer)\b/.test(roleNames)) addBadge('content_creator', BADGE_LABELS.content_creator)
  if (/\b(translator|localizer|localization|language)\b/.test(roleNames)) addBadge('translator_user', BADGE_LABELS.translator_user)
  if (userAgeDays >= 365) addBadge('early_user', BADGE_LABELS.early_user)

  return badges
}

export function hasOfficialMemberBadge({
  user,
  roles = [],
}: {
  user: User
  roles?: Role[]
}) {
  if ((user.badges ?? []).includes('official_member')) return true
  const roleNames = roles.map((role) => role.name.toLowerCase()).join(' ')
  return /\b(official|oficial)\b/.test(roleNames)
}

function isUserBadgeId(value: string): value is UserBadgeId {
  return value in BADGE_STYLES
}
