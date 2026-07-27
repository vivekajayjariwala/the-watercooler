import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { sendChatRequest } from './actions'

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

  // Fetch recipient profile
  const { data: recipient } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', recipientId)
    .single()

  if (!recipient) {
    redirect('/dashboard')
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Schedule Coffee Chat
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Send a request to connect with <span className="font-semibold text-gray-700 dark:text-gray-200">{recipient.name}</span> over a coffee (or tea!).
        </p>

        <form action={sendChatRequest} className="space-y-6">
          <input type="hidden" name="initiator_id" value={user.id} />
          <input type="hidden" name="recipient_id" value={recipient.id} />

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Message (Optional)
            </label>
            <textarea
              name="message"
              id="message"
              rows={4}
              placeholder="Hi! I saw we both like Hiking. Would love to grab a coffee and chat about your recent trips."
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-transparent focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div className="flex justify-end pt-4 space-x-4">
            <a
              href="/dashboard"
              className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Cancel
            </a>
            <button
              type="submit"
              className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Send Request
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
