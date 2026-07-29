'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'
import { createClient } from '@/utils/supabase/server'
import { syncProfileEmbedding } from '@/lib/matching'
import type { ChatPreference } from '@/lib/types'
import type { ProfileActionState } from './form-state'

const CHAT_PREFERENCES: ChatPreference[] = ['virtual', 'in_person', 'either']

function text(formData: FormData, key: string, max = 2000): string {
  return String(formData.get(key) ?? '').trim().slice(0, max)
}

/**
 * Saves the profile and its interests, then refreshes the embedding.
 *
 * The `syncProfileEmbedding` call is the important line: every field written
 * here feeds the vector, so skipping it would leave someone ranked against
 * text they no longer have on their profile. It is deliberately awaited —
 * matching should be correct by the time the page revalidates — but it never
 * throws, so a Hugging Face outage can't block a profile save.
 */
export async function updateProfile(
  _previous: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const session = await getSession()
  if (!session) {
    return { status: 'error', message: 'Your session expired.', fieldErrors: {} }
  }

  const userId = session.user.id
  const fieldErrors: ProfileActionState['fieldErrors'] = {}

  const fullName = text(formData, 'fullName', 120)
  if (!fullName) fieldErrors.fullName = 'People need a name to recognise.'

  const avatarUrl = text(formData, 'avatarUrl', 500)
  if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) {
    fieldErrors.avatarUrl = 'That needs to be a full http(s) URL.'
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: 'error', message: 'Please fix the highlighted fields.', fieldErrors }
  }

  const rawPreference = String(formData.get('chatPreference') ?? 'either') as ChatPreference
  const chatPreference = CHAT_PREFERENCES.includes(rawPreference) ? rawPreference : 'either'

  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      headline: text(formData, 'headline', 120) || null,
      department: text(formData, 'department', 80) || null,
      location: text(formData, 'location', 120) || null,
      pronouns: text(formData, 'pronouns', 40) || null,
      bio: text(formData, 'bio') || null,
      working_on: text(formData, 'workingOn') || null,
      curious_about: text(formData, 'curiousAbout') || null,
      fun_fact: text(formData, 'funFact') || null,
      avatar_url: avatarUrl || null,
      chat_preference: chatPreference,
    })
    .eq('id', userId)

  if (error) {
    console.error('[profile] update failed:', error.message)
    return { status: 'error', message: 'Your profile could not be saved.', fieldErrors: {} }
  }

  // Interests are a full replace: the form always submits the complete set.
  const interestIds = formData
    .getAll('interests')
    .map((value) => String(value))
    .filter(Boolean)

  await supabase.from('user_interests').delete().eq('user_id', userId)

  if (interestIds.length > 0) {
    const { error: interestError } = await supabase
      .from('user_interests')
      .insert(interestIds.map((interest_id) => ({ user_id: userId, interest_id })))

    if (interestError) {
      console.error('[profile] interest write failed:', interestError.message)
      return {
        status: 'error',
        message: 'Your details saved, but interests did not.',
        fieldErrors: {},
      }
    }
  }

  const embedding = await syncProfileEmbedding(userId)

  revalidatePath('/profile')
  revalidatePath('/discover')
  revalidatePath('/', 'layout')

  return {
    status: 'success',
    message:
      embedding.status === 'updated'
        ? 'Saved. Your matches have been recalculated.'
        : 'Saved.',
    fieldErrors: {},
  }
}
