import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/StatCard"
import { ProfileCard } from "@/components/ProfileCard"
import { EmptyState } from "@/components/EmptyState"
import { Users, Coffee, Sparkles, FilterX } from "lucide-react"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { interest?: string }
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch current user profile for greeting
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const { interest } = await searchParams
  const { data: interests } = await supabase.from('interests').select('*').order('name')

  let query = supabase
    .from('profiles')
    .select(`
      id,
      name,
      title,
      bio,
      avatar_url,
      user_interests (
        interests (
          id,
          name
        )
      )
    `)
    .neq('id', user.id)

  const { data: coworkers } = await query

  let filteredCoworkers = coworkers || []

  if (interest) {
    filteredCoworkers = filteredCoworkers.filter((coworker) => {
      // @ts-ignore
      const coworkerInterests = coworker.user_interests?.map((ui: any) => ui.interests.id) || []
      return coworkerInterests.includes(interest)
    })
  }

  // Calculate simple stats
  const totalCoworkers = coworkers?.length || 0;
  const filteredCount = filteredCoworkers.length;

  return (
    <div className="container mx-auto py-12 px-4 sm:px-8 max-w-7xl">
      
      {/* Top Section */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {profile?.name?.split(' ')[0] || 'there'}.
        </h1>
        <p className="text-xl text-muted-foreground">Ready for another great conversation?</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <StatCard 
          title="New Coworkers" 
          value={totalCoworkers.toString()} 
          icon={Users} 
          colorClass="bg-blue-50 text-blue-600" 
          index={0} 
        />
        <StatCard 
          title="Suggested Matches" 
          value={Math.min(totalCoworkers, 12).toString()} 
          icon={Sparkles} 
          colorClass="bg-purple-50 text-purple-600" 
          index={1} 
        />
        <StatCard 
          title="Coffee Chats Available" 
          value="Unlimited" 
          icon={Coffee} 
          colorClass="bg-emerald-50 text-emerald-600" 
          index={2} 
        />
      </div>

      {/* Discover Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-6">Discover Coworkers</h2>
        
        {/* Chips Filter */}
        <div className="flex flex-wrap gap-2 mb-8 p-1">
          <Link href="/dashboard">
            <Button 
              variant={!interest ? "default" : "outline"} 
              className={`rounded-full px-5 shadow-sm transition-all ${!interest ? 'bg-primary shadow-blue-500/20' : 'bg-white hover:bg-muted'}`}
            >
              All Interests
            </Button>
          </Link>
          {interests?.map((i) => (
            <Link key={i.id} href={`/dashboard?interest=${i.id}`}>
              <Button 
                variant={interest === i.id ? "default" : "outline"} 
                className={`rounded-full px-5 shadow-sm transition-all ${interest === i.id ? 'bg-primary shadow-blue-500/20' : 'bg-white hover:bg-muted'}`}
              >
                {i.name}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* Profile Grid */}
      {filteredCoworkers.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCoworkers.map((coworker, index) => {
            // @ts-ignore
            const cInterests = coworker.user_interests?.map(ui => ui.interests) || [];
            return (
              <ProfileCard 
                key={coworker.id}
                id={coworker.id}
                name={coworker.name || ""}
                title={coworker.title || ""}
                avatarUrl={coworker.avatar_url || ""}
                interests={cInterests}
                index={index}
              />
            )
          })}
        </div>
      ) : (
        <div className="py-12 bg-white rounded-3xl border border-border/50 shadow-sm">
          <EmptyState 
            icon={FilterX}
            title="Looks a little quiet..."
            description="We couldn't find anyone with that exact interest. Try adjusting your filters or invite more teammates."
            primaryAction={{
              label: "Invite teammates",
              onClick: () => {} // In a real app this would open a modal
            }}
            secondaryAction={
              interest ? {
                label: "Clear filters",
                onClick: () => {} // Controlled via Link usually, but for EmptyState it's just visual. 
                // We'll wrap the button in a Link below instead of relying on onClick
              } : undefined
            }
          />
          {interest && (
            <div className="flex justify-center -mt-6">
              <Link href="/dashboard">
                <Button variant="secondary" size="lg" className="rounded-xl relative z-10">
                  Clear filters
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
