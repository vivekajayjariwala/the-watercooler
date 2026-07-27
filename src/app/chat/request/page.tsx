import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { sendChatRequest } from './actions'
import Link from 'next/link'

export default async function RequestChatPage({
  searchParams,
}: {
  searchParams: { to?: string }
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { to: recipientId } = await searchParams

  if (!recipientId) {
    redirect('/dashboard')
  }

  const { data: recipient } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', recipientId)
    .single()

  if (!recipient) {
    redirect('/dashboard')
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8 w-full">
      <div className="bg-background border-thin rounded-md p-8 sm:p-12 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-4">
          Schedule Coffee Chat
        </h1>
        <p className="text-foreground/70 mb-8 leading-relaxed">
          Send a request to connect with <span className="font-medium text-foreground">{recipient.name}</span> over a coffee (or tea).
        </p>

        <form action={sendChatRequest} className="space-y-6">
          <input type="hidden" name="initiator_id" value={user.id} />
          <input type="hidden" name="recipient_id" value={recipient.id} />

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
              Message (Optional)
            </label>
            <textarea
              name="message"
              id="message"
              rows={5}
              placeholder="Hi! I saw we both like Hiking. Would love to grab a coffee and chat about your recent trips."
              className="block w-full rounded-sm border-thin bg-transparent px-4 py-3 text-foreground placeholder-foreground/40 focus:border-foreground focus:ring-1 focus:ring-foreground sm:text-sm resize-none"
            />
          </div>

          <div className="flex justify-end pt-6 space-x-4">
            <Link
              href="/dashboard"
              className="inline-flex justify-center rounded-sm border-thin bg-transparent py-2.5 px-6 text-sm font-medium text-foreground hover:bg-muted/30 focus:outline-none transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="inline-flex justify-center rounded-sm border-thin bg-accent py-2.5 px-6 text-sm font-medium text-accent-foreground shadow-sm hover:bg-accent/80 focus:outline-none focus:ring-2 focus:ring-foreground transition-colors"
            >
              Send Request &rarr;
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
