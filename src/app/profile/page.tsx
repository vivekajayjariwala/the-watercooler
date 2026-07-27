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

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: interests } = await supabase.from('interests').select('*').order('name')

  const { data: userInterests } = await supabase
    .from('user_interests')
    .select('interest_id')
    .eq('user_id', user.id)

  const userInterestIds = userInterests?.map((ui) => ui.interest_id) || []

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8 w-full">
      <div className="bg-background border-thin rounded-md p-8 sm:p-12 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-8">
          Your Profile
        </h1>

        <form action={updateProfile} className="space-y-8">
          <input type="hidden" name="user_id" value={user.id} />

          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                defaultValue={profile?.name || ''}
                className="block w-full rounded-sm border-thin bg-transparent px-4 py-2.5 text-foreground focus:border-foreground focus:ring-1 focus:ring-foreground sm:text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
                Job Title
              </label>
              <input
                type="text"
                name="title"
                id="title"
                defaultValue={profile?.title || ''}
                className="block w-full rounded-sm border-thin bg-transparent px-4 py-2.5 text-foreground focus:border-foreground focus:ring-1 focus:ring-foreground sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-foreground mb-2">
                Bio
              </label>
              <textarea
                name="bio"
                id="bio"
                rows={4}
                defaultValue={profile?.bio || ''}
                className="block w-full rounded-sm border-thin bg-transparent px-4 py-2.5 text-foreground focus:border-foreground focus:ring-1 focus:ring-foreground sm:text-sm resize-none"
              />
            </div>
          </div>

          <div className="pt-8 border-t border-thin mt-8">
            <h3 className="text-lg font-medium text-foreground mb-6">Interests</h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 sm:grid-cols-3">
              {interests?.map((interest) => (
                <div key={interest.id} className="relative flex items-center">
                  <div className="flex h-5 items-center">
                    <input
                      id={`interest-${interest.id}`}
                      name="interests"
                      value={interest.id}
                      type="checkbox"
                      defaultChecked={userInterestIds.includes(interest.id)}
                      className="h-4 w-4 rounded-sm border-thin text-accent-foreground focus:ring-foreground accent-foreground"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor={`interest-${interest.id}`} className="font-medium text-foreground/80 cursor-pointer">
                      {interest.name}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-8 border-t border-thin mt-8 flex justify-end">
            <button
              type="submit"
              className="inline-flex justify-center rounded-sm border-thin bg-accent px-6 py-2.5 text-sm font-medium text-accent-foreground shadow-sm hover:bg-accent/80 focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2 transition-colors"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
