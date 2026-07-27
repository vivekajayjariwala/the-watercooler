import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { updateProfile } from './actions'

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch all available interests
  const { data: interests } = await supabase.from('interests').select('*').order('name')

  // Fetch user's current interests
  const { data: userInterests } = await supabase
    .from('user_interests')
    .select('interest_id')
    .eq('user_id', user.id)

  const userInterestIds = userInterests?.map((ui) => ui.interest_id) || []

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Your Profile
        </h1>

        <form action={updateProfile} className="space-y-6">
          <input type="hidden" name="user_id" value={user.id} />

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                defaultValue={profile?.name || ''}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-transparent focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Job Title
              </label>
              <input
                type="text"
                name="title"
                id="title"
                defaultValue={profile?.title || ''}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-transparent focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Bio
              </label>
              <textarea
                name="bio"
                id="bio"
                rows={3}
                defaultValue={profile?.bio || ''}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-transparent focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="pt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Interests</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {interests?.map((interest) => (
                <div key={interest.id} className="relative flex items-start">
                  <div className="flex h-5 items-center">
                    <input
                      id={`interest-${interest.id}`}
                      name="interests"
                      value={interest.id}
                      type="checkbox"
                      defaultChecked={userInterestIds.includes(interest.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor={`interest-${interest.id}`} className="font-medium text-gray-700 dark:text-gray-300">
                      {interest.name}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 flex justify-end">
            <button
              type="submit"
              className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
