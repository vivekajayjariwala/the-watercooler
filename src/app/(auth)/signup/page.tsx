import type { Metadata } from 'next'
import { SignupForm } from '../auth-form'

export const metadata: Metadata = {
  title: 'Create an account',
  description: 'Create your Watercooler account.',
}

/** Never bounce to an absolute URL — `//evil.com` is protocol-relative. */
function safeNext(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value || !value.startsWith('/')) return '/discover'
  if (value.startsWith('//') || value.startsWith('/\\')) return '/discover'
  return value
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams

  return <SignupForm next={safeNext(params.next)} />
}
