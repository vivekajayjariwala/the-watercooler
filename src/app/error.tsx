'use client'

import { ErrorState } from '@/components/kit/error-state'

/** Catches anything outside the `(app)` group — the landing page, auth, onboarding. */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-24 sm:px-6">
      <ErrorState error={error} reset={reset} homeHref="/" homeLabel="Home" />
    </div>
  )
}
