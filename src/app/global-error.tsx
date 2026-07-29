'use client'

import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import './globals.css'

/**
 * Last resort: this replaces the root layout, so it has to supply its own
 * `<html>`/`<body>`. No theme provider is available here — the root layout is
 * exactly what failed — so it leans on the CSS tokens' own light/dark defaults
 * rather than a class the provider would normally set.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh bg-background text-foreground">
        <main
          role="alert"
          className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center"
        >
          <p className="label-mono">Watercooler</p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">
            The app failed to start
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            Something broke before the page could render. Reloading usually clears it.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-2 inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Reload
          </button>
          {error.digest && (
            <p className="mt-4 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
              Ref {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  )
}
