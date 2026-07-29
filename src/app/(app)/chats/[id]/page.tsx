import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getSession, requireProfile } from '@/lib/session'
import { getThread, statusLabel } from '@/components/chat/data'
import { MessageThread } from '@/components/chat/message-thread'
import { SchedulePanel } from '@/components/schedule/schedule-panel'
import { PersonAvatar } from '@/components/kit/person-avatar'
import { InterestTag } from '@/components/kit/interest-tag'
import { SubmitButton } from '@/components/kit/submit-button'
import { Button, ButtonLink } from '@/components/ui/button'
import { respondToRequest, withdrawRequest } from '../actions'

/**
 * `getSession` and `getThread` are both `cache`d, so naming the other person
 * here costs nothing the page wasn't already paying. No redirect on a missing
 * session — the layout's `requireProfile` owns that, and metadata shouldn't be
 * the thing that decides where someone lands.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const session = await getSession()
  if (!session) return { title: 'Chat' }

  const thread = await getThread(id, session.user.id)
  return { title: thread ? `Chat with ${thread.other.full_name ?? 'someone'}` : 'Chat' }
}

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user } = await requireProfile()

  const thread = await getThread(id, user.id)
  if (!thread) notFound()

  const { chat, other, messages, isInitiator } = thread
  const firstName = other.full_name?.trim().split(/\s+/)[0] ?? 'them'
  const isAccepted = chat.status === 'accepted'
  const reasons = chat.match_reasons ?? []

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col gap-6 lg:flex-row">
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border pb-4">
          <ButtonLink
            variant="ghost"
            size="icon-sm"
            aria-label="Back to chats"
            className="text-muted-foreground lg:hidden"
            href="/chats"
          >
            <ArrowLeft className="size-4" />
          </ButtonLink>

          <PersonAvatar name={other.full_name} src={other.avatar_url} size="md" />

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-medium tracking-tight">
              <Link href={`/people/${other.id}`} className="hover:underline">
                {other.full_name ?? 'Someone'}
              </Link>
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {[other.headline, other.department].filter(Boolean).join(' · ') || '—'}
            </p>
          </div>

          <span className="pill shrink-0">{statusLabel(chat.status, isInitiator)}</span>
        </header>

        {chat.status === 'pending' && (
          <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
            {chat.message && (
              <blockquote className="border-l border-border pl-3 text-sm leading-relaxed text-foreground/80 text-pretty">
                {chat.message}
              </blockquote>
            )}

            {reasons.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {reasons.map((name) => (
                  <InterestTag key={name} name={name} shared />
                ))}
              </div>
            )}

            {isInitiator ? (
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Waiting for {firstName} to reply. Messaging opens once they accept.
                </p>
                <form action={withdrawRequest}>
                  <input type="hidden" name="chatId" value={chat.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-muted-foreground"
                  >
                    Withdraw
                  </Button>
                </form>
              </div>
            ) : (
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
            )}
          </div>
        )}

        <MessageThread
          chatId={chat.id}
          currentUserId={user.id}
          otherName={other.full_name}
          otherAvatarUrl={other.avatar_url}
          initialMessages={messages}
          canSend={isAccepted}
          disabledReason={
            isInitiator
              ? `Messaging opens once ${firstName} accepts.`
              : 'Accept the request to start the conversation.'
          }
        />
      </div>

      {isAccepted && (
        <aside className="w-full shrink-0 lg:w-72">
          <SchedulePanel
            chatId={chat.id}
            currentUserId={user.id}
            otherUserId={other.id}
            otherUserName={other.full_name}
            scheduledAt={chat.scheduled_at}
            durationMinutes={chat.duration_minutes}
            locationKind={chat.location_kind}
            locationDetail={chat.location_detail}
          />
        </aside>
      )}
    </div>
  )
}
