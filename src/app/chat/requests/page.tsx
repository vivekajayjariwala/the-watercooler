import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { respondToChat } from './actions'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

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
    <div className="container mx-auto py-12 px-4 sm:px-8 max-w-5xl space-y-16">
      
      <section>
        <h2 className="text-3xl font-bold tracking-tight mb-8 pb-4 border-b">
          Pending Requests
        </h2>
        
        {pendingRequests && pendingRequests.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {pendingRequests.map((req) => (
              <Card key={req.id} className="rounded-none flex flex-col">
                <CardHeader>
                  <CardTitle className="text-xl">
                    {/* @ts-ignore */}
                    {req.initiator?.name}
                  </CardTitle>
                  <CardDescription>
                    {/* @ts-ignore */}
                    {req.initiator?.title}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="bg-muted/50 p-4 border text-sm text-foreground/80 italic">
                    "{req.message || 'Would you like to grab a coffee?'}"
                  </div>
                </CardContent>
                <CardFooter className="flex gap-4 border-t pt-4">
                  <form action={respondToChat} className="flex-1">
                    <input type="hidden" name="chat_id" value={req.id} />
                    <input type="hidden" name="status" value="accepted" />
                    <Button type="submit" className="w-full rounded-none font-semibold">
                      Accept
                    </Button>
                  </form>
                  <form action={respondToChat} className="flex-1">
                    <input type="hidden" name="chat_id" value={req.id} />
                    <input type="hidden" name="status" value="declined" />
                    <Button type="submit" variant="outline" className="w-full rounded-none font-semibold">
                      Decline
                    </Button>
                  </form>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="border border-dashed p-16 text-center text-muted-foreground flex flex-col items-center justify-center">
            <h3 className="text-xl font-semibold text-foreground mb-2">No pending requests</h3>
            <p>You're all caught up for now.</p>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-3xl font-bold tracking-tight mb-8 pb-4 border-b">
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
                <Card key={chat.id} className="rounded-none flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-xl">{otherPerson?.name}</CardTitle>
                    <CardDescription>{otherPerson?.title}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="bg-foreground text-background border p-4 text-sm flex flex-col gap-2">
                      <p className="font-semibold flex items-center gap-2 uppercase tracking-widest text-xs">
                        <span className="w-2 h-2 rounded-full bg-background inline-block animate-pulse"></span>
                        Scheduled
                      </p>
                      <p className="text-background/80">
                        Reach out to them to find a good time to chat!
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="border border-dashed p-16 text-center text-muted-foreground flex flex-col items-center justify-center">
            <h3 className="text-xl font-semibold text-foreground mb-2">No upcoming chats</h3>
            <p>Go find someone on the Dashboard!</p>
          </div>
        )}
      </section>
    </div>
  )
}
