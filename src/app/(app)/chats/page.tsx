import type { Metadata } from 'next'
import Link from 'next/link'
import { Coffee, Inbox, Send } from 'lucide-react'
import { requireProfile } from '@/lib/session'
import { getChatSummaries } from '@/components/chat/data'
import {
  ActiveChat,
  IncomingRequest,
  SentRequest,
} from '@/components/chat/chat-list-item'
import { PageHeader } from '@/components/kit/page-header'
import { EmptyState } from '@/components/kit/empty-state'
import { ButtonLink } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Chats' }

const TABS = [
  { key: 'requests', label: 'Requests' },
  { key: 'active', label: 'Active' },
  { key: 'sent', label: 'Sent' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default async function ChatsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { user } = await requireProfile()
  const { tab } = await searchParams
  const { incoming, active, sent } = await getChatSummaries(user.id)

  const counts: Record<TabKey, number> = {
    requests: incoming.length,
    active: active.length,
    sent: sent.length,
  }

  // Default to whichever tab has something worth looking at, so the inbox opens
  // on the thing that needs a decision rather than an empty first tab.
  const requested = TABS.find((t) => t.key === tab)?.key
  const current: TabKey =
    requested ?? (incoming.length > 0 ? 'requests' : active.length > 0 ? 'active' : 'requests')

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Chats"
        title="Coffee chats"
        description="Requests waiting on you, conversations in flight, and the asks you've sent."
      />

      <nav className="flex items-center gap-1 border-b border-border" aria-label="Chat folders">
        {TABS.map((t) => {
          const isCurrent = t.key === current
          return (
            <Link
              key={t.key}
              href={`/chats?tab=${t.key}`}
              aria-current={isCurrent ? 'page' : undefined}
              className={cn(
                '-mb-px flex items-center gap-2 border-b px-3 py-2 text-sm transition-colors',
                isCurrent
                  ? 'border-foreground font-medium text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
              <span
                className={cn(
                  'font-mono text-[11px] tabular',
                  isCurrent ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {counts[t.key]}
              </span>
            </Link>
          )
        })}
      </nav>

      {current === 'requests' &&
        (incoming.length === 0 ? (
          <EmptyState
            icon={<Inbox />}
            title="No requests waiting"
            description="When someone asks you for a coffee, it lands here with the reason you two were paired."
            action={
              <ButtonLink variant="outline" size="lg" href="/discover">
                Find someone
              </ButtonLink>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {incoming.map((summary) => (
              <IncomingRequest key={summary.chat.id} summary={summary} />
            ))}
          </div>
        ))}

      {current === 'active' &&
        (active.length === 0 ? (
          <EmptyState
            icon={<Coffee />}
            title="No conversations yet"
            description="Once a request is accepted, the thread opens here and you can sort out a time."
            action={
              <ButtonLink variant="outline" size="lg" href="/discover">
                Find someone
              </ButtonLink>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="divide-y divide-border">
              {active.map((summary) => (
                <ActiveChat key={summary.chat.id} summary={summary} />
              ))}
            </div>
          </div>
        ))}

      {current === 'sent' &&
        (sent.length === 0 ? (
          <EmptyState
            icon={<Send />}
            title="Nothing sent yet"
            description="Requests you send stay here until the other person replies."
            action={
              <ButtonLink variant="outline" size="lg" href="/discover">
                Find someone
              </ButtonLink>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="divide-y divide-border">
              {sent.map((summary) => (
                <SentRequest key={summary.chat.id} summary={summary} />
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}
