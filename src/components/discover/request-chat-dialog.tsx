'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Coffee } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SubmitButton } from '@/components/kit/submit-button'
import { PersonAvatar } from '@/components/kit/person-avatar'
import { InterestTag } from '@/components/kit/interest-tag'
import { requestChat, type RequestChatState } from '@/app/(app)/discover/actions'

const INITIAL: RequestChatState = { status: 'idle' }
const MAX_MESSAGE = 500

/**
 * Asking someone for coffee. A dialog rather than a page — the request is a
 * small decision made in the middle of browsing, and bouncing to a separate
 * route loses the context that prompted it.
 */
export function RequestChatDialog({
  recipientId,
  recipientName,
  recipientHeadline,
  avatarUrl,
  score,
  sharedInterests,
  trigger,
}: {
  recipientId: string
  recipientName: string | null
  recipientHeadline: string | null
  avatarUrl: string | null
  score: number
  sharedInterests: string[]
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const messageId = useId()
  const [message, setMessage] = useState('')
  const router = useRouter()

  const firstName = recipientName?.trim().split(/\s+/)[0] ?? 'them'

  /**
   * An async `action` rather than `useActionState`, because everything that
   * happens after a send — the toast, closing the dialog, clearing the draft —
   * belongs to the submit that caused it. Routed through `useActionState` the
   * result arrives as a state change instead, and the only place left to react
   * to it is an effect that fires on every result the component has ever seen.
   *
   * `useFormStatus` inside `SubmitButton` still reports pending for as long as
   * this promise is outstanding, so the button behaves exactly as before.
   */
  async function send(formData: FormData) {
    const result = await requestChat(INITIAL, formData)

    if (result.status === 'success') {
      toast.success(`Your request is on its way to ${result.recipientName}.`, {
        action: { label: 'View', onClick: () => router.push(`/chats/${result.chatId}`) },
      })
      setOpen(false)
      setMessage('')
      return
    }

    if (result.status === 'duplicate') {
      toast(`You already have an open chat with ${result.recipientName}.`)
      setOpen(false)
      return
    }

    if (result.status === 'unavailable') {
      toast(`${result.recipientName} isn't taking requests right now.`)
      setOpen(false)
      return
    }

    if (result.status === 'error') toast.error(result.message)
  }

  // A placeholder that names something real gives people a first line to
  // steal, which is most of the reason a request ever gets sent.
  const placeholder = sharedInterests.length
    ? `Hi ${firstName} — I saw we're both into ${sharedInterests[0].toLowerCase()}. Free for a coffee sometime this week?`
    : `Hi ${firstName} — I'd love to hear what you're working on. Free for a coffee sometime this week?`

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ask for a coffee</DialogTitle>
          <DialogDescription>
            {firstName} sees your note alongside your profile.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
          <PersonAvatar name={recipientName} src={avatarUrl} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{recipientName ?? 'Someone'}</p>
            {recipientHeadline && (
              <p className="truncate text-xs text-muted-foreground">{recipientHeadline}</p>
            )}
          </div>
        </div>

        {sharedInterests.length > 0 && (
          <div className="space-y-2">
            <p className="label-mono">Common ground</p>
            <div className="flex flex-wrap gap-1.5">
              {sharedInterests.slice(0, 6).map((name) => (
                <InterestTag key={name} name={name} shared />
              ))}
            </div>
          </div>
        )}

        <form action={send} className="space-y-3">
          <input type="hidden" name="recipientId" value={recipientId} />
          <input type="hidden" name="score" value={score} />

          <div className="space-y-1.5">
            <label htmlFor={messageId} className="label-mono">
              Message <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <Textarea
              id={messageId}
              name="message"
              rows={4}
              maxLength={MAX_MESSAGE}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={placeholder}
              className="resize-none"
            />
            <p className="text-right font-mono text-[11px] tabular text-muted-foreground">
              {message.length}/{MAX_MESSAGE}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <DialogClose
              render={
                <Button type="button" variant="outline" size="lg">
                  Cancel
                </Button>
              }
            />
            <SubmitButton size="lg" pendingText="Sending…">
              <Coffee className="size-3.5" />
              Send request
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
