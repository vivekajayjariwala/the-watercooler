'use client'

import { ErrorState } from '@/components/kit/error-state'

/**
 * One boundary for every signed-in page. Errors bubble to the nearest
 * `error.tsx`, so nested segments inherit this rather than repeating it — the
 * nav and chrome from `(app)/layout.tsx` stay mounted around it.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorState error={error} reset={reset} homeHref="/discover" homeLabel="Discover" />
}
