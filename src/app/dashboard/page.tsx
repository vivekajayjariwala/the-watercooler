import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

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

  return (
    <div className="container mx-auto py-12 px-4 sm:px-8 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 pb-8 border-b">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            Discover Coworkers
          </h1>
          <p className="text-muted-foreground text-lg">
            Find colleagues with shared interests and schedule a chat.
          </p>
        </div>
        
        <form className="mt-8 md:mt-0 flex items-end space-x-4">
          <div className="space-y-2">
            <Label htmlFor="interest-filter">Filter by Interest</Label>
            <select
              id="interest-filter"
              name="interest"
              defaultValue={interest || ''}
              className="flex h-10 w-full items-center justify-between rounded-none border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">All Interests</option>
              {interests?.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="secondary" className="rounded-none">
            Filter
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCoworkers.map((coworker) => (
          <Card key={coworker.id} className="rounded-none flex flex-col hover:border-foreground transition-colors duration-200">
            <CardHeader>
              <CardTitle className="text-xl">{coworker.name || 'Anonymous User'}</CardTitle>
              <CardDescription>{coworker.title || 'Employee'}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">
                {coworker.bio || 'No bio provided.'}
              </p>
              <div className="flex flex-wrap gap-2">
                {/* @ts-ignore */}
                {coworker.user_interests?.map((ui: any) => (
                  <span
                    key={ui.interests.id}
                    className="inline-flex items-center px-2 py-0.5 border text-xs font-medium bg-muted/50 text-foreground"
                  >
                    {ui.interests.name}
                  </span>
                ))}
              </div>
            </CardContent>
            <CardFooter className="pt-4 border-t">
              <Button asChild variant="outline" className="w-full rounded-none">
                <Link href={`/chat/request?to=${coworker.id}`}>
                  Schedule Chat
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}

        {filteredCoworkers.length === 0 && (
          <div className="col-span-full border border-dashed p-16 flex flex-col items-center justify-center text-center space-y-3">
            <h3 className="text-xl font-semibold">No coworkers found</h3>
            <p className="text-muted-foreground">
              Try adjusting your filters or wait for more coworkers to join.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
