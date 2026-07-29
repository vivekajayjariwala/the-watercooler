'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { formatDistanceToNowStrict } from 'date-fns'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PersonAvatar } from '@/components/kit/person-avatar'
import { createClient } from '@/utils/supabase/client'
import { uniqueChannel } from '@/utils/supabase/realtime'
import { markAllNotificationsRead } from '@/app/(app)/notifications/actions'
import { cn } from '@/lib/utils'
import type { AppNotification } from '@/lib/types'

interface PreviewRow extends AppNotification {
  actor?: { full_name: string | null; avatar_url: string | null } | null
}

/**
 * Nav bell.
 *
 * The unread count is server-rendered into `initialUnread` so the badge is
 * correct on first paint, then kept live by a realtime subscription.
 */
export function NotificationBell({
  userId,
  initialUnread,
}: {
  userId: string
  initialUnread: number
}) {
  const [unread, setUnread] = useState(initialUnread)
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // The server count is authoritative, so a re-render with a fresh one resets
  // whatever the realtime handler has been counting up locally.
  const [syncedTo, setSyncedTo] = useState(initialUnread)
  if (syncedTo !== initialUnread) {
    setSyncedTo(initialUnread)
    setUnread(initialUnread)
  }

  /* --- Live badge -------------------------------------------------------- */
  useEffect(() => {
    const supabase = createClient()

    // Built and subscribed synchronously: an `await` here would let Strict
    // Mode's cleanup run before the channel exists, leaking the subscription.
    const channel = uniqueChannel(supabase, `notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          setUnread((count) => count + 1)
          // Drop any cached preview so the panel refetches when next opened.
          setRows([])
          setLoaded(false)
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId])

  /* --- Dismissal --------------------------------------------------------- */
  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  /* --- Preview ----------------------------------------------------------- */
  useEffect(() => {
    if (!open || loaded) return

    let cancelled = false
    const supabase = createClient()

    void supabase
      .from('notifications')
      .select('*, actor:profiles!actor_id ( full_name, avatar_url )')
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data }) => {
        if (cancelled) return
        setRows((data ?? []) as unknown as PreviewRow[])
        setLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [open, loaded])

  // Derived rather than stored: the panel is loading exactly while it is open
  // and the fetch above hasn't landed.
  const loading = open && !loaded
  const badge = unread > 9 ? '9+' : String(unread)

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative text-muted-foreground hover:text-foreground"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-foreground px-1 font-mono text-[9px] font-medium tabular text-background ring-2 ring-background">
            {badge}
          </span>
        )}
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="label-mono">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => {
                  void markAllNotificationsRead().then(() => {
                    setUnread(0)
                    setRows((current) =>
                      current.map((row) => ({
                        ...row,
                        read_at: row.read_at ?? new Date().toISOString(),
                      }))
                    )
                    router.refresh()
                  })
                }}
                className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                Nothing yet.
              </p>
            ) : (
              rows.map((row) => (
                <Link
                  key={row.id}
                  href={row.href ?? '/notifications'}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex gap-2.5 border-b border-border px-3 py-2.5 transition-colors last:border-b-0 hover:bg-muted/50',
                    !row.read_at && 'bg-muted/30'
                  )}
                >
                  <PersonAvatar
                    name={row.actor?.full_name ?? null}
                    src={row.actor?.avatar_url ?? null}
                    size="xs"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{row.title}</p>
                    {row.body && (
                      <p className="truncate text-[11px] text-muted-foreground">{row.body}</p>
                    )}
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {formatDistanceToNowStrict(new Date(row.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!row.read_at && (
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand" aria-label="Unread" />
                  )}
                </Link>
              ))
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-border px-3 py-2 text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
          </Link>
        </div>
      )}
    </div>
  )
}
