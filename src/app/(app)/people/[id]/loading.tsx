/** Back link, profile header, prose column, and the match rail. */
export default function PersonLoading() {
  return (
    <div className="space-y-8">
      <div className="h-7 w-24 rounded-lg bg-muted" />

      <div className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="size-24 shrink-0 rounded-full bg-muted" />
          <div className="space-y-2">
            <div className="h-8 w-56 rounded bg-muted" />
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-3 w-28 rounded bg-muted" />
          </div>
        </div>
        <div className="h-9 w-36 rounded-lg bg-muted" />
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="space-y-6">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-2.5 w-24 rounded bg-muted" />
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-4/5 rounded bg-muted" />
            </div>
          ))}
        </div>

        <div className="relative overflow-hidden rounded-xl border border-border p-4">
          <div className="animate-shimmer absolute inset-0" />
          <div className="h-2.5 w-20 rounded bg-muted" />
          <div className="mt-4 h-6 w-28 rounded bg-muted" />
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-3/4 rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  )
}
