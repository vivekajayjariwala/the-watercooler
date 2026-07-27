import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

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
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 pb-6 border-b border-thin">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            Discover Coworkers
          </h1>
          <p className="mt-2 text-foreground/70">Find colleagues with shared interests and schedule a chat.</p>
        </div>
        
        <form className="mt-6 md:mt-0 flex items-center space-x-4">
          <label htmlFor="interest-filter" className="sr-only">
            Filter by Interest
          </label>
          <select
            id="interest-filter"
            name="interest"
            defaultValue={interest || ''}
            className="block w-48 rounded-sm border-thin bg-background py-2 pl-3 pr-10 text-sm focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
          >
            <option value="">All Interests</option>
            {interests?.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border-thin rounded-sm text-sm font-medium text-foreground bg-muted/30 hover:bg-muted/50 focus:outline-none transition-colors"
          >
            Filter
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCoworkers.map((coworker) => (
          <div
            key={coworker.id}
            className="bg-background border-thin rounded-md flex flex-col group hover:border-foreground transition-colors duration-200"
          >
            <div className="p-6 flex-grow">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium text-foreground">
                    {coworker.name || 'Anonymous User'}
                  </h3>
                  <p className="text-sm text-foreground/60 mb-4">
                    {coworker.title || 'Employee'}
                  </p>
                </div>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3 mb-6">
                {coworker.bio || 'No bio provided.'}
              </p>
              
              <div className="flex flex-wrap gap-2">
                {/* @ts-ignore */}
                {coworker.user_interests?.map((ui: any) => (
                  <span
                    key={ui.interests.id}
                    className="inline-flex items-center px-2 py-1 rounded-sm text-xs border-thin bg-muted/20 text-foreground"
                  >
                    {ui.interests.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="border-t border-thin p-4 flex justify-end">
              <Link
                href={`/chat/request?to=${coworker.id}`}
                className="text-sm font-medium text-foreground hover:underline inline-flex items-center"
              >
                Schedule Chat &rarr;
              </Link>
            </div>
          </div>
        ))}

        {filteredCoworkers.length === 0 && (
          <div className="col-span-full border-thin border-dashed rounded-md p-12 text-center">
            <h3 className="text-lg font-medium text-foreground">No coworkers found</h3>
            <p className="mt-2 text-sm text-foreground/60">
              Try adjusting your filters or wait for more coworkers to join.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
