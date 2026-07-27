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

  // Fetch all interests for the filter dropdown
  const { data: interests } = await supabase.from('interests').select('*').order('name')

  // Build the query to fetch coworkers
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
    .neq('id', user.id) // Exclude current user

  // We have to filter manually in JavaScript if we want to filter by nested relationship,
  // or use a more complex PostgREST query. Let's fetch all and filter in JS for simplicity.
  const { data: coworkers } = await query

  let filteredCoworkers = coworkers || []

  if (interest) {
    filteredCoworkers = filteredCoworkers.filter((coworker) => {
      // @ts-ignore - Supabase types can be tricky with nested arrays
      const coworkerInterests = coworker.user_interests?.map((ui: any) => ui.interests.id) || []
      return coworkerInterests.includes(interest)
    })
  }

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Discover Coworkers
        </h1>
        
        <form className="mt-4 md:mt-0 flex items-center space-x-4">
          <label htmlFor="interest-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filter by Interest:
          </label>
          <select
            id="interest-filter"
            name="interest"
            defaultValue={interest || ''}
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            onChange={(e) => {
              // We'll let the native form submission handle this by using a button
            }}
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
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Filter
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCoworkers.map((coworker) => (
          <div
            key={coworker.id}
            className="bg-white dark:bg-gray-800 overflow-hidden shadow-lg rounded-xl flex flex-col transition-transform hover:-translate-y-1 hover:shadow-xl duration-300"
          >
            <div className="p-6 flex-grow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-blue-400 to-teal-400 flex items-center justify-center text-white font-bold text-xl">
                    {coworker.name?.charAt(0) || '?'}
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {coworker.name || 'Anonymous User'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {coworker.title || 'Employee'}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                {coworker.bio || 'No bio provided.'}
              </p>
              
              <div className="mt-4 flex flex-wrap gap-2">
                {/* @ts-ignore */}
                {coworker.user_interests?.map((ui: any) => (
                  <span
                    key={ui.interests.id}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  >
                    {ui.interests.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
              <Link
                href={`/chat/request?to=${coworker.id}`}
                className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors"
              >
                Schedule Coffee Chat ☕️
              </Link>
            </div>
          </div>
        ))}

        {filteredCoworkers.length === 0 && (
          <div className="col-span-full bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No coworkers found</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your filters or wait for more coworkers to join!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
