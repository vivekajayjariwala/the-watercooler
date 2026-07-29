import Link from 'next/link'
import { PersonAvatar } from '@/components/kit/person-avatar'
import { Button } from '@/components/ui/button'
import { RequestChatDialog } from './request-chat-dialog'
import { scoreToPercent } from '@/lib/matching'
import type { MatchResult } from '@/lib/types'

/**
 * The dense list view. Deliberately table-like: a mono rank, the person, their
 * overlap count, and a right-aligned score that lines up down the column so the
 * ranking is readable at a glance.
 */
export function MatchRow({ match, rank }: { match: MatchResult; rank: number }) {
  const shared = match.shared_interests ?? []
  const percent = scoreToPercent(match.score)

  return (
    <div className="group relative flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50 sm:gap-4">
      <span className="w-6 shrink-0 font-mono text-[11px] tabular text-muted-foreground">
        {String(rank).padStart(2, '0')}
      </span>

      <PersonAvatar name={match.full_name} src={match.avatar_url} size="sm" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium tracking-tight">
          <Link
            href={`/people/${match.id}`}
            className="outline-none after:absolute after:inset-0 after:content-['']"
          >
            {match.full_name ?? 'Someone'}
          </Link>
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {match.headline ?? '—'}
        </p>
      </div>

      <span className="hidden w-32 shrink-0 truncate text-xs text-muted-foreground md:block">
        {match.department ?? '—'}
      </span>

      <span className="hidden w-24 shrink-0 font-mono text-[11px] tabular text-muted-foreground sm:block">
        {shared.length > 0 ? `${shared.length} shared` : '—'}
      </span>

      <span className="w-10 shrink-0 text-right font-mono text-xs font-medium tabular">
        {percent}%
      </span>

      <div className="relative z-10 shrink-0">
        <RequestChatDialog
          recipientId={match.id}
          recipientName={match.full_name}
          recipientHeadline={match.headline}
          avatarUrl={match.avatar_url}
          score={match.score}
          sharedInterests={shared}
          trigger={
            <Button variant="ghost" size="sm" className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100">
              Ask
            </Button>
          }
        />
      </div>
    </div>
  )
}
