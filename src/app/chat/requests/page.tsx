import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { respondToChat } from './actions'

export default async function ChatRequestsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch pending requests I received
  const { data: pendingRequests } = await supabase
    .from('coffee_chats')
    .select(`
      id,
      message,
      created_at,
      initiator:profiles!initiator_id (id, name, title, avatar_url)
    `)
    .eq('recipient_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  // Fetch accepted chats
  const { data: acceptedChats } = await supabase
    .from('coffee_chats')
    .select(`
      id,
      message,
      status,
      created_at,
      initiator:profiles!initiator_id (id, name, title, avatar_url),
      recipient:profiles!recipient_id (id, name, title, avatar_url)
    `)
    .or(`initiator_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-12">
      
      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Pending Requests
        </h2>
        
        {pendingRequests && pendingRequests.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {pendingRequests.map((req) => (
              <div key={req.id} className="bg-white dark:bg-gray-800 shadow-md rounded-xl p-6 border border-yellow-200 dark:border-yellow-900/50">
                <div className="flex items-center mb-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-400 flex items-center justify-center text-white font-bold">
                    {/* @ts-ignore */}
                    {req.initiator?.name?.charAt(0) || '?'}
                  </div>
                  <div className="ml-3">
                    {/* @ts-ignore */}
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{req.initiator?.name}</h3>
                    {/* @ts-ignore */}
                    <p className="text-xs text-gray-500 dark:text-gray-400">{req.initiator?.title}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 italic mb-6">
                  "{req.message || 'Would you like to grab a coffee?'}"
                </p>
                <div className="flex space-x-3">
                  <form action={respondToChat} className="flex-1">
                    <input type="hidden" name="chat_id" value={req.id} />
                    <input type="hidden" name="status" value="accepted" />
                    <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                      Accept
                    </button>
                  </form>
                  <form action={respondToChat} className="flex-1">
                    <input type="hidden" name="chat_id" value={req.id} />
                    <input type="hidden" name="status" value="declined" />
                    <button type="submit" className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      Decline
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400">
            You have no pending requests right now.
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Upcoming Coffee Chats
        </h2>
        
        {acceptedChats && acceptedChats.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {acceptedChats.map((chat) => {
              // @ts-ignore
              const isInitiator = chat.initiator.id === user.id
              // @ts-ignore
              const otherPerson = isInitiator ? chat.recipient : chat.initiator

              return (
                <div key={chat.id} className="bg-white dark:bg-gray-800 shadow-md rounded-xl p-6 border border-green-200 dark:border-green-900/50">
                  <div className="flex items-center mb-4">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-green-400 to-teal-400 flex items-center justify-center text-white font-bold">
                      {otherPerson?.name?.charAt(0) || '?'}
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{otherPerson?.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{otherPerson?.title}</p>
                    </div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-md p-3 text-sm text-green-800 dark:text-green-300">
                    <p><strong>Status:</strong> Scheduled ☕️</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Reach out to them to find a good time!
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400">
            No upcoming coffee chats scheduled. Go find someone on the Dashboard!
          </div>
        )}
      </section>
    </div>
  )
}
