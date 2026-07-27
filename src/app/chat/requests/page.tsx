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
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8 w-full space-y-16">
      
      <section>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground mb-8 pb-4 border-b border-thin">
          Pending Requests
        </h2>
        
        {pendingRequests && pendingRequests.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            {pendingRequests.map((req) => (
              <div key={req.id} className="bg-background border-thin rounded-md p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    {/* @ts-ignore */}
                    <h3 className="text-lg font-medium text-foreground">{req.initiator?.name}</h3>
                    {/* @ts-ignore */}
                    <p className="text-sm text-foreground/60">{req.initiator?.title}</p>
                  </div>
                </div>
                <div className="bg-muted/20 p-4 rounded-sm border-thin mb-6 flex-grow">
                  <p className="text-sm text-foreground/80 italic">
                    "{req.message || 'Would you like to grab a coffee?'}"
                  </p>
                </div>
                <div className="flex space-x-4">
                  <form action={respondToChat} className="flex-1">
                    <input type="hidden" name="chat_id" value={req.id} />
                    <input type="hidden" name="status" value="accepted" />
                    <button type="submit" className="w-full flex justify-center py-2.5 px-4 border-thin rounded-sm text-sm font-medium text-background bg-foreground hover:bg-foreground/90 transition-colors">
                      Accept
                    </button>
                  </form>
                  <form action={respondToChat} className="flex-1">
                    <input type="hidden" name="chat_id" value={req.id} />
                    <input type="hidden" name="status" value="declined" />
                    <button type="submit" className="w-full flex justify-center py-2.5 px-4 border-thin rounded-sm text-sm font-medium text-foreground bg-transparent hover:bg-muted/50 transition-colors">
                      Decline
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-thin border-dashed rounded-md p-10 text-center text-foreground/60">
            You have no pending requests right now.
          </div>
        )}
      </section>

      <section>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground mb-8 pb-4 border-b border-thin">
          Upcoming Coffee Chats
        </h2>
        
        {acceptedChats && acceptedChats.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            {acceptedChats.map((chat) => {
              // @ts-ignore
              const isInitiator = chat.initiator.id === user.id
              // @ts-ignore
              const otherPerson = isInitiator ? chat.recipient : chat.initiator

              return (
                <div key={chat.id} className="bg-background border-thin rounded-md p-6 flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-lg font-medium text-foreground">{otherPerson?.name}</h3>
                      <p className="text-sm text-foreground/60">{otherPerson?.title}</p>
                    </div>
                  </div>
                  <div className="bg-accent/20 border-thin rounded-sm p-4 text-sm text-foreground/80 flex-grow">
                    <p className="font-medium mb-1 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                      Scheduled
                    </p>
                    <p className="text-foreground/70">
                      Reach out to them to find a good time to chat!
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="border-thin border-dashed rounded-md p-10 text-center text-foreground/60">
            No upcoming coffee chats scheduled. Go find someone on the Dashboard!
          </div>
        )}
      </section>
    </div>
  )
}
