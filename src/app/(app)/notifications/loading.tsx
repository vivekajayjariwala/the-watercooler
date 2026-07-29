/** Mirrors the header, filter rail, and day-grouped activity rows. */
export default function NotificationsLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3 border-b border-border pb-6">
        <div className="h-2.5 w-16 rounded bg-muted" />
        <div className="h-9 w-56 max-w-full rounded bg-muted" />
        <div className="h-4 w-80 max-w-full rounded bg-muted" />
      </div>

      <div className="flex items-center gap-1">
        <div className="h-7 w-12 rounded-md bg-muted" />
        <div className="h-7 w-16 rounded-md bg-muted" />
      </div>

      <div className="relative space-y-6 overflow-hidden">
        <div className="animate-shimmer absolute inset-0" />
        <div className="h-2.5 w-14 rounded bg-muted" />

        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex gap-3 border-l-2 border-transparent py-3 pl-3">
            <div className="size-8 shrink-0 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-56 max-w-full rounded bg-muted" />
              <div className="h-3 w-80 max-w-full rounded bg-muted" />
            </div>
            <div className="h-3 w-12 shrink-0 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
