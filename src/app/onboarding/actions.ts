'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getSession } from '@/lib/session'
import { syncProfileEmbedding } from '@/lib/matching'
import type { ChatPreference } from '@/lib/types'

/* ---------------------------------------------------------------------------
 * Action result
 * ------------------------------------------------------------------------- */

export type OnboardingField =
  | 'fullName'
  | 'headline'
  | 'department'
  | 'location'
  | 'pronouns'
  | 'interests'
  | 'bio'
  | 'workingOn'
  | 'curiousAbout'
  | 'funFact'
  | 'chatPreference'

export interface OnboardingActionState {
  status: 'idle' | 'error'
  /** Whole-form failure — a write that didn't land. */
  formError: string | null
  /** Keyed by the wizard's field name, so a step can render its own messages. */
  fieldErrors: Partial<Record<OnboardingField, string>>
  /** 0-based step holding the first error, so the wizard can jump the user there. */
  errorStep: number | null
}

/* ---------------------------------------------------------------------------
 * Rules — mirrored in the client so the UI can nudge before the round trip.
 * The server is the one that decides.
 * ------------------------------------------------------------------------- */

const MIN_INTERESTS = 3
const MIN_PROSE = 40
const MAX_PROSE = 600
const MAX_SHORT = 120

/** Which step each field lives on, for jump-to-error. */
const FIELD_STEP: Record<OnboardingField, number> = {
  fullName: 0,
  headline: 0,
  department: 0,
  location: 0,
  pronouns: 0,
  interests: 1,
  bio: 2,
  workingOn: 2,
  curiousAbout: 2,
  funFact: 2,
  chatPreference: 3,
}

const CHAT_PREFERENCES: ChatPreference[] = ['virtual', 'in_person', 'either']

function readString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function nullIfEmpty(value: string): string | null {
  return value.length > 0 ? value : null
}

function firstErrorStep(fieldErrors: Partial<Record<OnboardingField, string>>): number | null {
  const steps = (Object.keys(fieldErrors) as OnboardingField[]).map((field) => FIELD_STEP[field])
  return steps.length > 0 ? Math.min(...steps) : null
}

/* ---------------------------------------------------------------------------
 * Finish onboarding
 *
 * One write at the end: profile fields, a full replace of the interest join
 * rows, `onboarding_completed`, then the embedding refresh that makes the
 * person discoverable.
 * ------------------------------------------------------------------------- */

export async function completeOnboarding(
  _prevState: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const session = await getSession()
  if (!session) redirect('/login')

  const userId = session.user.id
  const supabase = await createClient()

  const fullName = readString(formData, 'fullName')
  const headline = readString(formData, 'headline')
  const department = readString(formData, 'department')
  const location = readString(formData, 'location')
  const pronouns = readString(formData, 'pronouns')
  const timezone = readString(formData, 'timezone')

  const bio = readString(formData, 'bio')
  const workingOn = readString(formData, 'workingOn')
  const curiousAbout = readString(formData, 'curiousAbout')
  const funFact = readString(formData, 'funFact')

  const chatPreferenceRaw = readString(formData, 'chatPreference')
  const openToMatching = formData.get('openToMatching') === 'true'

  const requestedInterests = formData
    .getAll('interests')
    .filter((value): value is string => typeof value === 'string')

  const fieldErrors: Partial<Record<OnboardingField, string>> = {}

  if (!fullName) fieldErrors.fullName = 'People need a name to recognise.'
  else if (fullName.length > MAX_SHORT) fieldErrors.fullName = 'That’s longer than we can show.'

  if (!headline) fieldErrors.headline = 'A role gives your matches somewhere to start.'
  else if (headline.length > MAX_SHORT) fieldErrors.headline = 'Keep it to one line.'

  if (department.length > MAX_SHORT) fieldErrors.department = 'Keep it to one line.'
  if (location.length > MAX_SHORT) fieldErrors.location = 'Keep it to one line.'
  if (pronouns.length > 40) fieldErrors.pronouns = 'Keep it short.'

  // Trust nothing from the client: only ids that exist in the taxonomy count.
  const { data: validInterests } = await supabase
    .from('interests')
    .select('id')
    .in('id', requestedInterests.length > 0 ? requestedInterests : ['00000000-0000-0000-0000-000000000000'])

  const interestIds = (validInterests ?? []).map((row) => row.id as string)

  if (interestIds.length < MIN_INTERESTS) {
    fieldErrors.interests = `Pick at least ${MIN_INTERESTS} — overlap is what makes a first conversation easy.`
  }

  if (workingOn.length < MIN_PROSE) {
    fieldErrors.workingOn = `A sentence or two, please — ${MIN_PROSE} characters minimum.`
  } else if (workingOn.length > MAX_PROSE) {
    fieldErrors.workingOn = 'That’s longer than we can embed well. Trim it a little.'
  }

  if (curiousAbout.length < MIN_PROSE) {
    fieldErrors.curiousAbout = `A sentence or two, please — ${MIN_PROSE} characters minimum.`
  } else if (curiousAbout.length > MAX_PROSE) {
    fieldErrors.curiousAbout = 'That’s longer than we can embed well. Trim it a little.'
  }

  if (bio.length > MAX_PROSE) fieldErrors.bio = 'That’s longer than we can embed well.'
  if (funFact.length > MAX_SHORT * 2) fieldErrors.funFact = 'Keep it to a line or two.'

  const chatPreference = CHAT_PREFERENCES.includes(chatPreferenceRaw as ChatPreference)
    ? (chatPreferenceRaw as ChatPreference)
    : null

  if (!chatPreference) fieldErrors.chatPreference = 'Pick how you like to meet.'

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: 'error',
      formError: null,
      fieldErrors,
      errorStep: firstErrorStep(fieldErrors),
    }
  }

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: userId,
      full_name: fullName,
      headline,
      department: nullIfEmpty(department),
      location: nullIfEmpty(location),
      pronouns: nullIfEmpty(pronouns),
      timezone: nullIfEmpty(timezone) ?? 'UTC',
      bio: nullIfEmpty(bio),
      working_on: workingOn,
      curious_about: curiousAbout,
      fun_fact: nullIfEmpty(funFact),
      chat_preference: chatPreference,
      open_to_matching: openToMatching,
      onboarding_completed: true,
    },
    { onConflict: 'id' }
  )

  if (profileError) {
    return {
      status: 'error',
      formError: `We couldn’t save your profile: ${profileError.message}`,
      fieldErrors: {},
      errorStep: null,
    }
  }

  // Replace rather than merge — the wizard's selection is the whole truth.
  const { error: clearError } = await supabase
    .from('user_interests')
    .delete()
    .eq('user_id', userId)

  if (!clearError) {
    const { error: insertError } = await supabase
      .from('user_interests')
      .insert(interestIds.map((interestId) => ({ user_id: userId, interest_id: interestId })))

    if (insertError) {
      return {
        status: 'error',
        formError: `We couldn’t save your interests: ${insertError.message}`,
        fieldErrors: {},
        errorStep: 1,
      }
    }
  }

  // Never throws — a briefly stale vector beats a failed save.
  await syncProfileEmbedding(userId)

  revalidatePath('/', 'layout')
  redirect('/discover')
}
