import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { respondToChat } from './actions'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { EmptyState } from "@/components/EmptyState"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar, Clock, MessageCircle, Coffee } from "lucide-react"

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
        <div className="flex items-center gap-3 mb-8 pb-4 border-b">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <MessageCircle className="w-5 h-5" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Pending Requests</h2>
        </div>
        
        {pendingRequests && pendingRequests.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {pendingRequests.map((req) => (
              <Card key={req.id} className="overflow-hidden shadow-sm hover:shadow-hover transition-shadow border-none">
                <CardContent className="p-0">
                  <div className="p-6 flex items-start gap-4">
                    <Avatar className="w-14 h-14 ring-2 ring-blue-50">
                      {/* @ts-ignore */}
                      <AvatarImage src={req.initiator?.avatar_url} />
                      <AvatarFallback className="bg-orange-100 text-orange-700 font-medium">
                        {/* @ts-ignore */}
                        {req.initiator?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {/* @ts-ignore */}
                        {req.initiator?.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {/* @ts-ignore */}
                        {req.initiator?.title}
                      </p>
                      <div className="bg-muted/50 p-4 rounded-xl text-sm text-foreground/80 leading-relaxed border border-border/50">
                        <span className="text-xl leading-none text-muted-foreground mr-1">"</span>
                        {req.message || 'Would you like to grab a coffee?'}
                        <span className="text-xl leading-none text-muted-foreground ml-1">"</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 p-6 pt-0">
                    <form action={respondToChat} className="flex-1">
                      <input type="hidden" name="chat_id" value={req.id} />
                      <input type="hidden" name="status" value="accepted" />
                      <Button type="submit" className="w-full rounded-xl font-semibold shadow-sm bg-blue-600 hover:bg-blue-700">
                        Accept
                      </Button>
                    </form>
                    <form action={respondToChat} className="flex-1">
                      <input type="hidden" name="chat_id" value={req.id} />
                      <input type="hidden" name="status" value="declined" />
                      <Button type="submit" variant="outline" className="w-full rounded-xl font-semibold">
                        Decline
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-border/50 shadow-sm p-8">
            <EmptyState 
              icon={Coffee}
              title="Inbox zero"
              description="You have no pending coffee chat requests."
            />
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-3 mb-8 pb-4 border-b">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Timeline</h2>
        </div>
        
        {acceptedChats && acceptedChats.length > 0 ? (
          <div className="relative pl-6 sm:pl-8 py-4 border-l-2 border-muted">
            {acceptedChats.map((chat, index) => {
              // @ts-ignore
              const isInitiator = chat.initiator.id === user.id
              // @ts-ignore
              const otherPerson = isInitiator ? chat.recipient : chat.initiator

              return (
                <div key={chat.id} className="relative mb-12 last:mb-0">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[35px] sm:-left-[43px] top-6 w-6 h-6 bg-white border-4 border-blue-500 rounded-full shadow-sm"></div>
                  
                  <Badge variant="outline" className="mb-4 text-xs font-semibold bg-white uppercase tracking-wider text-muted-foreground rounded-full px-3 py-1">
                    Upcoming
                  </Badge>

                  <Card className="rounded-2xl border-none shadow-sm hover:shadow-hover transition-shadow bg-white overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center p-6 gap-6">
                        <Avatar className="w-20 h-20 ring-4 ring-blue-50/50">
                          <AvatarImage src={otherPerson?.avatar_url} />
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl font-bold">
                            {otherPerson?.name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <h3 className="text-xl font-bold mb-1">{otherPerson?.name}</h3>
                          <p className="text-muted-foreground text-sm mb-4">{otherPerson?.title}</p>
                          
                          <div className="flex flex-wrap gap-4 text-sm font-medium text-foreground/70">
                            <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-lg">
                              <Calendar className="w-4 h-4 text-primary" />
                              <span>To be scheduled</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-lg">
                              <MapPin className="w-4 h-4 text-primary" />
                              <span>Virtual Coffee</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="w-full sm:w-auto flex sm:flex-col gap-3 mt-4 sm:mt-0">
                          <Button className="flex-1 sm:w-full rounded-xl bg-primary hover:bg-primary/90 shadow-sm">
                            Message
                          </Button>
                          <Button variant="outline" className="flex-1 sm:w-full rounded-xl">
                            Reschedule
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-border/50 shadow-sm p-8">
            <EmptyState 
              icon={Calendar}
              title="Nothing on the calendar"
              description="You don't have any upcoming coffee chats scheduled."
            />
          </div>
        )}
      </section>
    </div>
  )
}
