import { ArrowUpRight } from 'lucide-react'
import { PersonAvatar } from '@/components/kit/person-avatar'
import { ScoreBadge } from '@/components/kit/score-badge'
import { InterestTag } from '@/components/kit/interest-tag'
import { Button, ButtonLink } from '@/components/ui/button'
import { RequestChatDialog } from './request-chat-dialog'
import { explainMatch } from '@/lib/matching'
import type { MatchResult } from '@/lib/types'

/**
 * The single best match, given real estate.
 *
 * This is the one place on the screen where the accent carries weight — a
 * hairline accent rule down the left edge. Everything else in discovery stays
 * monochrome so this block is unmistakably the thing to look at first.
 */
export function TopMatch({ match }: { match: MatchResult }) {
  const shared = match.shared_interests ?? []

  return (
    <section className="relative overflow-hidden rounded-xl border border-border bg-card">
      <span className="absolute inset-y-0 left-0 w-0.5 bg-brand" aria-hidden />

      <div className="flex flex-col gap-6 p-5 sm:p-6 md:flex-row md:items-start">
        <div className="flex items-start gap-4 md:block">
          <PersonAvatar
            name={match.full_name}
            src={match.avatar_url}
            size="xl"
            className="md:size-28"
          />
          <div className="md:hidden">
            <p className="label-mono text-brand">Top match</p>
            <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em]">
              {match.full_name ?? 'Someone'}
            </h2>
            {match.headline && (
              <p className="text-xs text-muted-foreground">{match.headline}</p>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="hidden items-center justify-between gap-4 md:flex">
            <div>
              <p className="label-mono text-brand">Top match</p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em]">
                {match.full_name ?? 'Someone'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {[match.headline, match.department].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
            <ScoreBadge score={match.score} />
          </div>

          <div className="mt-2 md:hidden">
            <ScoreBadge score={match.score} />
          </div>

          {match.working_on && (
            <blockquote className="mt-4 border-l border-border pl-4 text-sm leading-relaxed text-foreground/80 text-pretty">
              “{match.working_on}”
            </blockquote>
          )}

          <p className="mt-4 text-sm text-muted-foreground">{explainMatch(match)}</p>

          {shared.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {shared.map((name) => (
                <InterestTag key={name} name={name} shared />
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <RequestChatDialog
              recipientId={match.id}
              recipientName={match.full_name}
              recipientHeadline={match.headline}
              avatarUrl={match.avatar_url}
              score={match.score}
              sharedInterests={shared}
              trigger={<Button size="lg">Ask for coffee</Button>}
            />
            <ButtonLink variant="ghost" size="lg" href={`/people/${match.id}`}>
              View profile
              <ArrowUpRight className="size-3.5" />
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  )
}
