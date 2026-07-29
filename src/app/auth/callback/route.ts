import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * Where Supabase sends people after they click an email confirmation or magic
 * link. Exchanges the one-time code for a session cookie, then routes them by
 * whether they've finished onboarding.
 */

/** Never bounce to an absolute URL — `//evil.com` is protocol-relative. */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/')) return '/discover'
  if (value.startsWith('//') || value.startsWith('/\\')) return '/discover'
  return value
}

/**
 * Behind a proxy, `request.url` is the internal origin. Prefer the forwarded
 * host so the redirect lands on the domain the person actually typed.
 */
function publicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  if (!forwardedHost) return new URL(request.url).origin

  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  return `${proto}://${forwardedHost}`
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const origin = publicOrigin(request)
  const next = safeNext(url.searchParams.get('next'))

  const code = url.searchParams.get('code')
  const providerError = url.searchParams.get('error_description') ?? url.searchParams.get('error')

  if (providerError) {
    const reason = /expired|invalid/i.test(providerError) ? 'expired_link' : 'exchange_failed'
    return NextResponse.redirect(`${origin}/login?error=${reason}`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`)
  }

  // The `handle_new_user` trigger creates the row, so a missing profile and an
  // unfinished one both mean the same thing: send them to the wizard.
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', data.user.id)
    .maybeSingle()

  const destination = profile?.onboarding_completed ? next : '/onboarding'

  return NextResponse.redirect(`${origin}${destination}`)
}
