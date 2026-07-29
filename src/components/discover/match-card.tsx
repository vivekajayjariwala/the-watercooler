import Link from 'next/link'
import { PersonAvatar } from '@/components/kit/person-avatar'
import { ScoreBadge } from '@/components/kit/score-badge'
import { InterestTag } from '@/components/kit/interest-tag'
import { Button } from '@/components/ui/button'
import { RequestChatDialog } from './request-chat-dialog'
import { explainMatch } from '@/lib/matching'
import type { MatchResult } from '@/lib/types'

/**
 * One person in the grid.
 *
 * The card is a link, but the CTA is a separate button *outside* the anchor —
 * a stretched-link overlay covers the card body so the whole surface is
 * clickable without ever nesting one interactive element inside another.
 */
export function MatchCard({ match }: { match: MatchResult }) {
  const shared = match.shared_interests ?? []

  return (
    <article className="surface surface-hover group relative flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <PersonAvatar name={match.full_name} src={match.avatar_url} size="lg" />
        <ScoreBadge score={match.score} />
      </div>

      <div className="mt-3 min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium tracking-tight">
          <Link
            href={`/people/${match.id}`}
            className="outline-none after:absolute after:inset-0 after:content-['']"
          >
            {match.full_name ?? 'Someone'}
          </Link>
        </h3>
        {match.headline && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{match.headline}</p>
        )}

        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground text-pretty">
          {explainMatch(match)}
        </p>

        {shared.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {shared.slice(0, 3).map((name) => (
              <InterestTag key={name} name={name} shared />
            ))}
            {shared.length > 3 && (
              <span className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[11px] tabular text-muted-foreground">
                +{shared.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Above the stretched link so it stays independently clickable. */}
      <div className="relative z-10 mt-4">
        <RequestChatDialog
          recipientId={match.id}
          recipientName={match.full_name}
          recipientHeadline={match.headline}
          avatarUrl={match.avatar_url}
          score={match.score}
          sharedInterests={shared}
          trigger={
            <Button variant="outline" size="lg" className="w-full">
              Ask for coffee
            </Button>
          }
        />
      </div>
    </article>
  )
}
