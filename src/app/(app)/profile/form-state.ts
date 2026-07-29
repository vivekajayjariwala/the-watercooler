/**
 * Form state for the profile editor.
 *
 * This lives outside `actions.ts` on purpose: a `'use server'` module may only
 * export async functions, so any value exported from there reaches the client
 * as a server-reference proxy rather than the object itself — which is how
 * `useActionState`'s initial state ends up without its `fieldErrors`.
 */

export type ProfileField =
  | 'fullName'
  | 'headline'
  | 'department'
  | 'location'
  | 'pronouns'
  | 'bio'
  | 'workingOn'
  | 'curiousAbout'
  | 'funFact'
  | 'avatarUrl'

export interface ProfileActionState {
  status: 'idle' | 'success' | 'error'
  message: string | null
  fieldErrors: Partial<Record<ProfileField, string>>
}

export const PROFILE_IDLE: ProfileActionState = {
  status: 'idle',
  message: null,
  fieldErrors: {},
}
