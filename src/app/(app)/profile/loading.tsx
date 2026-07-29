/** Mirrors the two-column editor + preview layout on `/profile`. */
export default function ProfileLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3 border-b border-border pb-6">
        <div className="h-2.5 w-20 rounded bg-muted" />
        <div className="h-9 w-40 rounded bg-muted" />
        <div className="h-4 w-96 max-w-full rounded bg-muted" />
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="relative space-y-10 overflow-hidden">
          <div className="animate-shimmer absolute inset-0" />

          <section className="space-y-4">
            <div className="h-2.5 w-12 rounded bg-muted" />
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-full bg-muted" />
              <div className="h-8 w-28 rounded-lg bg-muted" />
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-8">
            <div className="h-2.5 w-14 rounded bg-muted" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-4 w-20 rounded bg-muted" />
                  <div className="h-8 w-full rounded-lg bg-muted" />
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-8">
            <div className="h-2.5 w-24 rounded bg-muted" />
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-16 w-full rounded-lg bg-muted" />
              </div>
            ))}
          </section>

          <section className="space-y-3 border-t border-border pt-8">
            <div className="h-2.5 w-16 rounded bg-muted" />
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="h-6 w-20 rounded-md bg-muted" />
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="h-2.5 w-28 rounded bg-muted" />
          <div className="relative overflow-hidden rounded-xl border border-border p-4">
            <div className="animate-shimmer absolute inset-0" />
            <div className="flex items-center gap-3">
              <div className="size-12 shrink-0 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 rounded bg-muted" />
                <div className="h-3 w-36 rounded bg-muted" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-4/5 rounded bg-muted" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
