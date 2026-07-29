'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button, ButtonLink } from '@/components/ui/button'

/**
 * Shared body for every `error.tsx` boundary.
 *
 * Solid border, not the dashed one `EmptyState` uses — dashed reads as "this
 * can be filled in", which is the wrong message for something that broke. The
 * digest is surfaced in mono because it is the only handle anyone has when
 * asking about a production failure.
 */
export function ErrorState({
  error,
  reset,
  title = 'Something went wrong',
  description = 'That page failed to load. Trying again usually clears it.',
  homeHref,
  homeLabel,
}: {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
  description?: string
  homeHref?: string
  homeLabel?: string
}) {
  useEffect(() => {
    console.error('[boundary]', error)
  }, [error])

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-xl border border-border px-6 py-16 text-center"
    >
      <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground [&_svg]:size-[18px]">
        <AlertTriangle />
      </div>

      <p className="text-sm font-medium tracking-tight">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">
        {description}
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button size="lg" onClick={reset}>
          Try again
        </Button>
        {homeHref && (
          <ButtonLink variant="outline" size="lg" href={homeHref}>
            {homeLabel ?? 'Go back'}
          </ButtonLink>
        )}
      </div>

      {error.digest && (
        <p className="mt-6 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
          Ref {error.digest}
        </p>
      )}
    </div>
  )
}
