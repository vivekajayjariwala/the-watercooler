import Link from 'next/link'
import { formatDistanceToNowStrict } from 'date-fns'
import { CalendarCheck } from 'lucide-react'
import { PersonAvatar } from '@/components/kit/person-avatar'
import { InterestTag } from '@/components/kit/interest-tag'
import { ScoreBadge } from '@/components/kit/score-badge'
import { SubmitButton } from '@/components/kit/submit-button'
import { Button } from '@/components/ui/button'
import { respondToRequest, withdrawRequest } from '@/app/(app)/chats/actions'
import type { ChatSummary } from './data'

function relative(iso: string): string {
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true })
}

/**
 * An incoming request. Shows the pairing rationale captured at request time —
 * `match_reasons` is a snapshot, so it stays truthful even if either profile
 * has changed since.
 */
export function IncomingRequest({ summary }: { summary: ChatSummary }) {
  const { chat, other } = summary
  const reasons = chat.match_reasons ?? []

  return (
    <article className="surface p-4">
      <div className="flex items-start gap-3">
        <PersonAvatar name={other.full_name} src={other.avatar_url} size="lg" />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-medium tracking-tight">
                <Link href={`/people/${other.id}`} className="hover:underline">
                  {other.full_name ?? 'Someone'}
                </Link>
              </h3>
              <p className="truncate text-xs text-muted-foreground">
                {[other.headline, other.department].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
            {chat.match_score != null && <ScoreBadge score={chat.match_score} />}
          </div>

          {reasons.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {reasons.slice(0, 4).map((name) => (
                <InterestTag key={name} name={name} shared />
              ))}
            </div>
          )}

          {chat.message && (
            <blockquote className="mt-3 border-l border-border pl-3 text-sm leading-relaxed text-foreground/80 text-pretty">
              {chat.message}
            </blockquote>
          )}

          <p className="mt-2 font-mono text-[11px] text-muted-foreground">
            {relative(chat.created_at)}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <form action={respondToRequest}>
              <input type="hidden" name="chatId" value={chat.id} />
              <input type="hidden" name="decision" value="accepted" />
              <SubmitButton size="lg" pendingText="Accepting…">
                Accept
              </SubmitButton>
            </form>
            <form action={respondToRequest}>
              <input type="hidden" name="chatId" value={chat.id} />
              <input type="hidden" name="decision" value="declined" />
              <SubmitButton variant="outline" size="lg" pendingText="…">
                Not now
              </SubmitButton>
            </form>
          </div>
        </div>
      </div>
    </article>
  )
}

/** An accepted chat in the active list. */
export function ActiveChat({ summary }: { summary: ChatSummary }) {
  const { chat, other, lastMessage, unreadCount } = summary

  return (
    <Link
      href={`/chats/${chat.id}`}
      className="group flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/50"
    >
      <PersonAvatar name={other.full_name} src={other.avatar_url} size="md" />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-medium tracking-tight">
            {other.full_name ?? 'Someone'}
          </p>
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
            {relative(lastMessage?.created_at ?? chat.updated_at)}
          </span>
        </div>

        <p className="truncate text-xs text-muted-foreground">
          {lastMessage?.body ?? 'No messages yet — say hello.'}
        </p>

        {chat.scheduled_at && (
          <p className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <CalendarCheck className="size-3" aria-hidden />
            {new Date(chat.scheduled_at).toLocaleString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>

      {unreadCount > 0 && (
        <span className="shrink-0 rounded-full bg-foreground px-1.5 py-0.5 font-mono text-[10px] font-medium tabular text-background">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  )
}

/** An outgoing request still waiting on the other person. */
export function SentRequest({ summary }: { summary: ChatSummary }) {
  const { chat, other } = summary
  const firstName = other.full_name?.trim().split(/\s+/)[0] ?? 'them'

  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-3">
      <PersonAvatar name={other.full_name} src={other.avatar_url} size="md" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium tracking-tight">
          <Link href={`/people/${other.id}`} className="hover:underline">
            {other.full_name ?? 'Someone'}
          </Link>
        </p>
        <p className="truncate text-xs text-muted-foreground">
          Waiting on {firstName} · asked {relative(chat.created_at)}
        </p>
      </div>

      <form action={withdrawRequest} className="shrink-0">
        <input type="hidden" name="chatId" value={chat.id} />
        <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
          Withdraw
        </Button>
      </form>
    </div>
  )
}
