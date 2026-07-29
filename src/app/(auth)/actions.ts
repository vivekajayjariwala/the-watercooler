'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

/* ---------------------------------------------------------------------------
 * Action result
 *
 * Errors travel back through `useActionState`, never through
 * `redirect('?message=…')` — a redirect throws away everything the person
 * typed and puts the failure in the URL, where it survives a refresh and gets
 * shared by accident.
 * ------------------------------------------------------------------------- */

export type AuthField = 'fullName' | 'email' | 'password'

export interface AuthActionState {
  /** `check_email` is the confirmation-required branch of signup. */
  status: 'idle' | 'error' | 'check_email'
  /** Whole-form failure — bad credentials, provider outage. */
  formError: string | null
  /** Keyed by the input's `name`, so the field can own its own message. */
  fieldErrors: Partial<Record<AuthField, string>>
  /**
   * Echoed back for the `check_email` screen, which has to name the address
   * after the form itself has unmounted. Repopulating a failed submit is the
   * client's job — the inputs are controlled.
   */
  values: { fullName: string; email: string }
}

/* ---------------------------------------------------------------------------
 * Helpers
 *
 * A `'use server'` module may only export async functions, so the initial state
 * and the password floor live in `./auth-form` next to the UI that uses them.
 * ------------------------------------------------------------------------- */

const MIN_PASSWORD_LENGTH = 8

/**
 * Only ever redirect to somewhere inside this app.
 *
 * `//evil.com` and `/\evil.com` are both read as protocol-relative URLs by
 * browsers, so "starts with a slash" alone is not enough of a check.
 */
function safeNext(raw: FormDataEntryValue | string | null): string {
  const value = typeof raw === 'string' ? raw : null
  if (!value) return '/discover'
  if (!value.startsWith('/')) return '/discover'
  if (value.startsWith('//') || value.startsWith('/\\')) return '/discover'
  return value
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

/** Deliberately permissive — the provider is the real authority on deliverability. */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function fail(
  values: AuthActionState['values'],
  fieldErrors: AuthActionState['fieldErrors'],
  formError: string | null = null
): AuthActionState {
  return { status: 'error', formError, fieldErrors, values }
}

/** Where a freshly-authenticated user should land. */
async function destinationFor(userId: string, next: string): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', userId)
    .maybeSingle()

  return data?.onboarding_completed ? next : '/onboarding'
}

/** Absolute origin for email confirmation links, proxy headers included. */
async function requestOrigin(): Promise<string> {
  const headerList = await headers()
  const forwardedHost = headerList.get('x-forwarded-host')
  const host = forwardedHost ?? headerList.get('host')
  const proto = headerList.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https')
  return host ? `${proto}://${host}` : ''
}

/* ---------------------------------------------------------------------------
 * Sign in
 * ------------------------------------------------------------------------- */

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = readString(formData, 'email')
  const password = String(formData.get('password') ?? '')
  const next = safeNext(formData.get('next'))
  const values = { fullName: '', email }

  const fieldErrors: AuthActionState['fieldErrors'] = {}
  if (!email) fieldErrors.email = 'Enter the email you signed up with.'
  else if (!looksLikeEmail(email)) fieldErrors.email = 'That doesn’t look like an email address.'
  if (!password) fieldErrors.password = 'Enter your password.'

  if (Object.keys(fieldErrors).length > 0) return fail(values, fieldErrors)

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    const message = error?.message ?? 'Sign in failed.'

    if (/email not confirmed/i.test(message)) {
      return fail(values, {}, 'Confirm your email first — the link is in your inbox.')
    }
    if (/invalid login credentials/i.test(message)) {
      return fail(values, {}, 'That email and password don’t match an account.')
    }
    if (/rate limit|too many/i.test(message)) {
      return fail(values, {}, 'Too many attempts. Wait a minute and try again.')
    }
    return fail(values, {}, message)
  }

  const destination = await destinationFor(data.user.id, next)

  revalidatePath('/', 'layout')
  redirect(destination)
}

/* ---------------------------------------------------------------------------
 * Sign up
 * ------------------------------------------------------------------------- */

export async function signUp(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const fullName = readString(formData, 'fullName')
  const email = readString(formData, 'email')
  const password = String(formData.get('password') ?? '')
  const next = safeNext(formData.get('next'))
  const values = { fullName, email }

  const fieldErrors: AuthActionState['fieldErrors'] = {}
  if (!fullName) fieldErrors.fullName = 'We show this to the people you match with.'
  else if (fullName.length > 80) fieldErrors.fullName = 'Keep it under 80 characters.'

  if (!email) fieldErrors.email = 'Use your work email so coworkers recognise you.'
  else if (!looksLikeEmail(email)) fieldErrors.email = 'That doesn’t look like an email address.'

  if (!password) fieldErrors.password = 'Choose a password.'
  else if (password.length < MIN_PASSWORD_LENGTH) {
    fieldErrors.password = `At least ${MIN_PASSWORD_LENGTH} characters — you have ${password.length}.`
  }

  if (Object.keys(fieldErrors).length > 0) return fail(values, fieldErrors)

  const supabase = await createClient()
  const origin = await requestOrigin()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Read by the `handle_new_user` trigger to seed the profile row.
      data: { full_name: fullName },
      emailRedirectTo: origin
        ? `${origin}/auth/callback?next=${encodeURIComponent(next)}`
        : undefined,
    },
  })

  if (error) {
    if (/already registered|already exists/i.test(error.message)) {
      return fail(values, { email: 'There’s already an account on this email. Sign in instead.' })
    }
    if (/password/i.test(error.message)) {
      return fail(values, { password: error.message })
    }
    return fail(values, {}, error.message)
  }

  /**
   * The signup that isn't one.
   *
   * When the address already belongs to a *confirmed* account, Supabase will
   * not say so — telling an anonymous caller which emails are registered is a
   * user-enumeration oracle. It returns 200, no error, a decoy user, and sends
   * no email. The only tell is an empty `identities` array.
   *
   * Without this check the person is sent to "check your inbox" to wait for a
   * message that was never sent. We are not leaking anything by being honest:
   * they just proved they can authenticate as this address, or they can't, and
   * either way the sign-in page is where they need to be.
   *
   * An existing *unconfirmed* account is a different case — Supabase resends
   * the confirmation there and returns real identities, so it falls through to
   * the `check_email` branch below, which is correct.
   */
  if (data.user && data.user.identities?.length === 0) {
    return fail(values, { email: 'There’s already an account on this email. Sign in instead.' })
  }

  // Email confirmation is on: there is a user but no session yet.
  if (!data.session) {
    return { status: 'check_email', formError: null, fieldErrors: {}, values }
  }

  revalidatePath('/', 'layout')
  redirect('/onboarding')
}
