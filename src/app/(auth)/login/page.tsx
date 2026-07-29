import type { Metadata } from 'next'
import { LoginForm } from '../auth-form'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to Watercooler.',
}

/** Messages the auth callback can hand back. Never render a raw provider string. */
const NOTICES: Record<string, string> = {
  expired_link: 'That link has expired. Sign in with your password, or request a new one.',
  missing_code: 'That sign-in link was incomplete. Try signing in below.',
  exchange_failed: 'We couldn’t finish signing you in. Give it another go.',
  signed_out: 'You’re signed out. See you soon.',
}

/** Never bounce to an absolute URL — `//evil.com` is protocol-relative. */
function safeNext(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value || !value.startsWith('/')) return '/discover'
  if (value.startsWith('//') || value.startsWith('/\\')) return '/discover'
  return value
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const errorCode = Array.isArray(params.error) ? params.error[0] : params.error

  return (
    <LoginForm
      next={safeNext(params.next)}
      notice={errorCode ? (NOTICES[errorCode] ?? NOTICES.exchange_failed) : undefined}
    />
  )
}
