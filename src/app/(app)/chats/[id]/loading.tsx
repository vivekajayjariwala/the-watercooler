/** Thread column plus the schedule rail, at the geometry the real page uses. */
export default function ThreadLoading() {
  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col gap-6 lg:flex-row">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="size-10 shrink-0 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-3 w-28 rounded bg-muted" />
          </div>
        </div>

        <div className="flex-1 space-y-4 py-6">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className={i % 2 === 0 ? 'flex justify-start' : 'flex justify-end'}
            >
              <div
                className="h-12 rounded-xl bg-muted"
                style={{ width: `${45 + ((i * 13) % 30)}%` }}
              />
            </div>
          ))}
        </div>

        <div className="h-20 rounded-xl border border-border bg-muted/40" />
      </div>

      <aside className="w-full shrink-0 lg:w-80">
        <div className="relative overflow-hidden rounded-xl border border-border p-4">
          <div className="animate-shimmer absolute inset-0" />
          <div className="h-2.5 w-24 rounded bg-muted" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-9 w-full rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
