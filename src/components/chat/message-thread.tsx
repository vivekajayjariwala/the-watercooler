'use client'

import {
  startTransition,
  useCallback,
  useEffect,
  useOptimistic,
  useRef,
  useState,
} from 'react'
import { format, isSameDay } from 'date-fns'
import { AlertCircle, Loader2, SendHorizontal } from 'lucide-react'
import { PersonAvatar } from '@/components/kit/person-avatar'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'
import { uniqueChannel } from '@/utils/supabase/realtime'
import { sendMessage, markThreadRead } from '@/app/(app)/chats/actions'
import { cn } from '@/lib/utils'
import type { Message } from '@/lib/types'

const MAX_BODY = 4000
/** Messages from the same person inside this window render as one run. */
const GROUP_WINDOW_MS = 5 * 60 * 1000

interface PendingMessage extends Message {
  pending?: true
  failed?: true
}

export function MessageThread({
  chatId,
  currentUserId,
  otherName,
  otherAvatarUrl,
  initialMessages,
  canSend,
  disabledReason,
}: {
  chatId: string
  currentUserId: string
  otherName: string | null
  otherAvatarUrl: string | null
  initialMessages: Message[]
  canSend: boolean
  disabledReason?: string
}) {
  const [messages, setMessages] = useState<PendingMessage[]>(initialMessages)
  const [optimistic, addOptimistic] = useOptimistic(
    messages,
    (state: PendingMessage[], incoming: PendingMessage) => [...state, incoming]
  )
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [failedBody, setFailedBody] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Tracks whether the reader is parked at the bottom. If they've scrolled up
  // to read history, a new message must not yank them back down.
  const pinnedToBottom = useRef(true)

  /* --- Realtime ---------------------------------------------------------- */
  useEffect(() => {
    const supabase = createClient()

    const channel = uniqueChannel(supabase, `chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const incoming = payload.new as Message
          setMessages((current) =>
            // The sender already has this row from their own insert; the
            // broadcast would otherwise duplicate it.
            current.some((m) => m.id === incoming.id) ? current : [...current, incoming]
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [chatId])

  /* --- Read receipts ----------------------------------------------------- */
  useEffect(() => {
    const hasUnread = messages.some((m) => m.sender_id !== currentUserId && !m.read_at)
    if (hasUnread) void markThreadRead(chatId)
  }, [chatId, currentUserId, messages])

  /* --- Scroll ------------------------------------------------------------ */
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    pinnedToBottom.current = distanceFromBottom < 80
  }, [])

  useEffect(() => {
    if (pinnedToBottom.current) {
      bottomRef.current?.scrollIntoView({ block: 'end' })
    }
  }, [optimistic.length])

  /* --- Sending ----------------------------------------------------------- */
  const submit = useCallback(
    async (body: string) => {
      const trimmed = body.trim()
      if (!trimmed) return

      setError(null)
      setFailedBody(null)
      setDraft('')
      pinnedToBottom.current = true

      const optimisticMessage: PendingMessage = {
        id: `pending-${crypto.randomUUID()}`,
        chat_id: chatId,
        sender_id: currentUserId,
        body: trimmed,
        read_at: null,
        created_at: new Date().toISOString(),
        pending: true,
      }

      const formData = new FormData()
      formData.set('chatId', chatId)
      formData.set('body', trimmed)

      startTransition(async () => {
        addOptimistic(optimisticMessage)
        const result = await sendMessage({ status: 'idle' }, formData)

        if (result.status === 'error') {
          setError(result.message)
          // Hand the text back so the message isn't lost to a failed send.
          setFailedBody(trimmed)
        }
      })
    },
    [addOptimistic, chatId, currentUserId]
  )

  const remaining = MAX_BODY - draft.length

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 space-y-1 overflow-y-auto px-1 py-4"
      >
        {optimistic.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 py-10 text-center">
            <p className="max-w-xs text-sm text-muted-foreground text-pretty">
              No messages yet. A first line about what you have in common is usually
              enough to get going.
            </p>
          </div>
        ) : (
          optimistic.map((message, index) => {
            const previous = optimistic[index - 1]
            const isMine = message.sender_id === currentUserId

            const showDaySeparator =
              !previous || !isSameDay(new Date(previous.created_at), new Date(message.created_at))

            const continuesRun =
              !showDaySeparator &&
              previous?.sender_id === message.sender_id &&
              new Date(message.created_at).getTime() -
                new Date(previous.created_at).getTime() <
                GROUP_WINDOW_MS

            return (
              <div key={message.id}>
                {showDaySeparator && (
                  <div className="flex items-center gap-3 py-4">
                    <span className="h-px flex-1 bg-border" />
                    <span className="label-mono">
                      {format(new Date(message.created_at), 'EEEE, d MMM')}
                    </span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                )}

                <div
                  className={cn(
                    'flex items-end gap-2',
                    isMine ? 'justify-end' : 'justify-start',
                    continuesRun ? 'mt-0.5' : 'mt-3'
                  )}
                >
                  {!isMine && (
                    <span className={cn('shrink-0', continuesRun && 'invisible')}>
                      <PersonAvatar name={otherName} src={otherAvatarUrl} size="xs" />
                    </span>
                  )}

                  <div
                    className={cn(
                      'max-w-[min(32rem,78%)] rounded-xl px-3 py-2 text-sm leading-relaxed',
                      isMine
                        ? 'bg-foreground text-background'
                        : 'border border-border bg-card text-card-foreground',
                      message.pending && 'opacity-60'
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  </div>
                </div>

                {!continuesRun && (
                  <p
                    className={cn(
                      'mt-1 font-mono text-[11px] text-muted-foreground',
                      isMine ? 'pr-1 text-right' : 'pl-8'
                    )}
                  >
                    {message.pending ? (
                      <Loader2 className="inline size-3 animate-spin" />
                    ) : (
                      format(new Date(message.created_at), 'HH:mm')
                    )}
                    {isMine && message.read_at && !message.pending && ' · Read'}
                  </p>
                )}
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div
          role="alert"
          className="mb-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive-subtle px-3 py-2 text-xs text-destructive"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span className="flex-1">{error}</span>
          {failedBody && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => void submit(failedBody)}
            >
              Retry
            </Button>
          )}
        </div>
      )}

      <div className="border-t border-border pt-3">
        {canSend ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void submit(draft)
            }}
            className="flex items-end gap-2"
          >
            <div className="flex-1">
              <label htmlFor="composer" className="sr-only">
                Message
              </label>
              <textarea
                id="composer"
                ref={textareaRef}
                value={draft}
                maxLength={MAX_BODY}
                onChange={(event) => {
                  setDraft(event.target.value)
                  // Auto-grow, capped so the composer can't swallow the thread.
                  const el = event.target
                  el.style.height = 'auto'
                  el.style.height = `${Math.min(el.scrollHeight, 160)}px`
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void submit(draft)
                  }
                }}
                rows={1}
                placeholder="Write a message…"
                className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <Button type="submit" size="icon-lg" disabled={!draft.trim()} aria-label="Send message">
              <SendHorizontal className="size-4" />
            </Button>
          </form>
        ) : (
          <p className="px-1 py-2 text-xs text-muted-foreground">
            {disabledReason ?? 'Messaging opens once this chat is accepted.'}
          </p>
        )}

        {canSend && remaining < 200 && (
          <p className="mt-1 text-right font-mono text-[11px] tabular text-muted-foreground">
            {remaining}
          </p>
        )}
      </div>
    </div>
  )
}
