import 'server-only'

import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createClient } from '@/utils/supabase/server'
import type { Profile } from '@/lib/types'

/**
 * The signed-in user and their profile row.
 *
 * Wrapped in `cache` so a layout and the page it renders share one round trip
 * per request instead of each hitting Supabase.
 */
export const getSession = cache(async () => {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { user, profile: (profile ?? null) as Profile | null }
})

/**
 * Guards an authenticated route. Sends users who haven't finished onboarding
 * back to the wizard — every app page assumes a complete profile.
 */
export async function requireProfile() {
  const session = await getSession()

  if (!session) redirect('/login')
  if (!session.profile) redirect('/onboarding')
  if (!session.profile.onboarding_completed) redirect('/onboarding')

  return { user: session.user, profile: session.profile }
}

/** Like `requireProfile`, but tolerates an incomplete profile (for onboarding itself). */
export async function requireUser() {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}

/** Count of unread notifications, for the nav badge. */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = await createClient()

  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)

  return count ?? 0
}
