/**
 * Onboarding renders its own header instead of the `(app)` shell, so the
 * skeleton has to draw that bar too — otherwise the chrome pops in late.
 */
export default function OnboardingLoading() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <div className="h-5 w-28 rounded bg-muted" />
          <div className="flex items-center gap-1">
            <div className="size-7 rounded-md bg-muted" />
            <div className="h-7 w-20 rounded-md bg-muted" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="relative space-y-8 overflow-hidden">
          <div className="animate-shimmer absolute inset-0" />

          <div className="flex items-center gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-1 flex-1 rounded-full bg-muted" />
            ))}
          </div>

          <div className="space-y-3">
            <div className="h-2.5 w-24 rounded bg-muted" />
            <div className="h-8 w-80 max-w-full rounded bg-muted" />
            <div className="h-4 w-96 max-w-full rounded bg-muted" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-9 w-full rounded-lg bg-muted" />
              </div>
            ))}
          </div>

          <div className="flex justify-between border-t border-border pt-6">
            <div className="h-9 w-24 rounded-lg bg-muted" />
            <div className="h-9 w-28 rounded-lg bg-muted" />
          </div>
        </div>
      </main>
    </div>
  )
}
