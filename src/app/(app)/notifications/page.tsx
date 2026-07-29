import type { Metadata } from 'next'
import Link from 'next/link'
import { format, formatDistanceToNowStrict, isSameDay, isToday, isYesterday } from 'date-fns'
import { BellOff } from 'lucide-react'
import { requireProfile } from '@/lib/session'
import { createClient } from '@/utils/supabase/server'
import { PageHeader } from '@/components/kit/page-header'
import { EmptyState } from '@/components/kit/empty-state'
import { PersonAvatar } from '@/components/kit/person-avatar'
import { NotificationIcon } from '@/components/notifications/notification-icon'
import { Button, ButtonLink } from '@/components/ui/button'
import { markAllNotificationsRead } from './actions'
import { cn } from '@/lib/utils'
import type { AppNotification } from '@/lib/types'

export const metadata: Metadata = { title: 'Notifications' }

const PAGE_SIZE = 30

interface Row extends AppNotification {
  actor: { full_name: string | null; avatar_url: string | null } | null
}

function dayLabel(date: Date): string {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEEE, d MMMM')
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; limit?: string }>
}) {
  const { user } = await requireProfile()
  const { filter, limit: rawLimit } = await searchParams

  const unreadOnly = filter === 'unread'
  const limit = Math.min(Math.max(Number(rawLimit) || PAGE_SIZE, PAGE_SIZE), 200)

  const supabase = await createClient()

  let query = supabase
    .from('notifications')
    .select('*, actor:profiles!actor_id ( full_name, avatar_url )')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (unreadOnly) query = query.is('read_at', null)

  const { data } = await query

  const all = (data ?? []) as unknown as Row[]
  const hasMore = all.length > limit
  const rows = hasMore ? all.slice(0, limit) : all
  const unreadCount = rows.filter((row) => !row.read_at).length

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Activity"
        title="Notifications"
        description="Requests, replies, messages, and confirmed times."
        action={
          unreadCount > 0 ? (
            <form action={markAllNotificationsRead}>
              <Button type="submit" variant="outline" size="sm">
                Mark all read
              </Button>
            </form>
          ) : undefined
        }
      />

      <nav className="flex items-center gap-1" aria-label="Filter notifications">
        <FilterLink href="/notifications" active={!unreadOnly}>
          All
        </FilterLink>
        <FilterLink href="/notifications?filter=unread" active={unreadOnly}>
          Unread
        </FilterLink>
      </nav>

      {rows.length === 0 ? (
        <EmptyState
          icon={<BellOff />}
          title={unreadOnly ? 'Nothing unread' : 'No notifications yet'}
          description={
            unreadOnly
              ? "You're all caught up."
              : 'Activity on your coffee chats will show up here.'
          }
        />
      ) : (
        <div className="space-y-6">
          {rows.map((row, index) => {
            const created = new Date(row.created_at)
            const previous = rows[index - 1]
            const startsDay =
              !previous || !isSameDay(new Date(previous.created_at), created)

            return (
              <div key={row.id}>
                {startsDay && (
                  <h2 className="label-mono mb-2 pt-2">{dayLabel(created)}</h2>
                )}

                <Link
                  href={row.href ?? '/chats'}
                  className={cn(
                    'flex gap-3 border-l-2 py-3 pl-3 transition-colors hover:bg-muted/40',
                    row.read_at ? 'border-transparent' : 'border-brand'
                  )}
                >
                  <PersonAvatar
                    name={row.actor?.full_name ?? null}
                    src={row.actor?.avatar_url ?? null}
                    size="sm"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <NotificationIcon type={row.type} />
                      <p
                        className={cn(
                          'truncate text-sm',
                          row.read_at ? 'text-muted-foreground' : 'font-medium'
                        )}
                      >
                        {row.title}
                      </p>
                    </div>
                    {row.body && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground text-pretty">
                        {row.body}
                      </p>
                    )}
                  </div>

                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    {formatDistanceToNowStrict(created, { addSuffix: true })}
                  </span>
                </Link>
              </div>
            )
          })}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <ButtonLink
                variant="outline"
                size="lg"
                href={`/notifications?${new URLSearchParams({
                  ...(unreadOnly ? { filter: 'unread' } : {}),
                  limit: String(limit + PAGE_SIZE),
                })}`}
              >
                Load more
              </ButtonLink>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'rounded-md px-2.5 py-1 text-sm transition-colors',
        active
          ? 'bg-muted font-medium text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </Link>
  )
}
