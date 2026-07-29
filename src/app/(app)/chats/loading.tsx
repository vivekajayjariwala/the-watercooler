/** Mirrors the header + tab strip + two-column request grid on `/chats`. */
export default function ChatsLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3 border-b border-border pb-6">
        <div className="h-2.5 w-16 rounded bg-muted" />
        <div className="h-9 w-64 max-w-full rounded bg-muted" />
        <div className="h-4 w-96 max-w-full rounded bg-muted" />
      </div>

      <div className="flex items-center gap-4 border-b border-border pb-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-4 w-20 rounded bg-muted" />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-xl border border-border p-4"
          >
            <div className="animate-shimmer absolute inset-0" />
            <div className="flex items-start gap-3">
              <div className="size-11 shrink-0 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-muted" />
                <div className="h-3 w-24 rounded bg-muted" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-4/5 rounded bg-muted" />
            </div>
            <div className="mt-4 flex gap-2">
              <div className="h-9 w-24 rounded-lg bg-muted" />
              <div className="h-9 w-24 rounded-lg bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
