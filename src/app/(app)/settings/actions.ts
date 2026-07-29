'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'
import { createClient } from '@/utils/supabase/server'
import type { ChatPreference } from '@/lib/types'

export type SettingsState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }

const CHAT_PREFERENCES: ChatPreference[] = ['virtual', 'in_person', 'either']

/** Matching visibility and meeting preference. */
export async function updateMatchingSettings(
  _previous: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const session = await getSession()
  if (!session) return { status: 'error', message: 'Your session expired.' }

  const raw = String(formData.get('chatPreference') ?? 'either') as ChatPreference
  const chatPreference = CHAT_PREFERENCES.includes(raw) ? raw : 'either'

  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({
      open_to_matching: formData.get('openToMatching') === 'on',
      chat_preference: chatPreference,
    })
    .eq('id', session.user.id)

  if (error) {
    console.error('[settings] matching update failed:', error.message)
    return { status: 'error', message: 'Those settings could not be saved.' }
  }

  revalidatePath('/settings')
  revalidatePath('/discover')
  return { status: 'success', message: 'Saved.' }
}

/** Timezone drives every rendered time and the availability overlap maths. */
export async function updateTimezone(
  _previous: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const session = await getSession()
  if (!session) return { status: 'error', message: 'Your session expired.' }

  const timezone = String(formData.get('timezone') ?? '').trim()

  // Validate against the runtime's own zone database rather than a hardcoded
  // list, which would rot the first time the IANA data changes.
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone })
  } catch {
    return { status: 'error', message: 'That is not a recognised timezone.' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ timezone })
    .eq('id', session.user.id)

  if (error) {
    console.error('[settings] timezone update failed:', error.message)
    return { status: 'error', message: 'Your timezone could not be saved.' }
  }

  revalidatePath('/settings')
  return { status: 'success', message: 'Timezone updated.' }
}

/**
 * Account deletion.
 *
 * Removing an `auth.users` row requires the service-role key, which this app
 * deliberately does not hold — shipping one to the server would give every
 * route the ability to bypass RLS. So this fails loudly instead of pretending
 * to work. Wiring it up means adding `SUPABASE_SERVICE_ROLE_KEY` and calling
 * `supabase.auth.admin.deleteUser()`; the cascade is already in the schema.
 */
export async function deleteAccount(
  _previous: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const session = await getSession()
  if (!session) return { status: 'error', message: 'Your session expired.' }

  if (String(formData.get('confirm') ?? '').trim() !== 'delete my account') {
    return { status: 'error', message: 'Type the confirmation phrase exactly to continue.' }
  }

  return {
    status: 'error',
    message:
      'Account deletion is not wired up: it needs a Supabase service-role key, which this app intentionally does not store. Ask an admin to remove your account.',
  }
}
