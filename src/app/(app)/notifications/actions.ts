'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'
import { createClient } from '@/utils/supabase/server'

/**
 * Notifications are written by database triggers, so the only mutations here
 * are read-state changes. RLS already scopes both to the owner; the explicit
 * `user_id` filter is belt and braces.
 */

export async function markAllNotificationsRead(): Promise<void> {
  const session = await getSession()
  if (!session) return

  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', session.user.id)
    .is('read_at', null)

  if (error) console.error('[notifications] markAllRead failed:', error.message)

  revalidatePath('/notifications')
  revalidatePath('/', 'layout')
}

export async function markNotificationRead(id: string): Promise<void> {
  const session = await getSession()
  if (!session) return

  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', session.user.id)
    .is('read_at', null)

  if (error) console.error('[notifications] markRead failed:', error.message)

  revalidatePath('/notifications')
  revalidatePath('/', 'layout')
}
