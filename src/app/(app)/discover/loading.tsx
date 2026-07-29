/**
 * Skeletons mirror the real card geometry so the page doesn't jump when data
 * lands. Shimmer rather than a spinner — a spinner says "waiting", a skeleton
 * says "here is the shape of what's coming".
 */
export default function DiscoverLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3 border-b border-border pb-6">
        <div className="h-2.5 w-20 rounded bg-muted" />
        <div className="h-9 w-72 max-w-full rounded bg-muted" />
        <div className="h-4 w-96 max-w-full rounded bg-muted" />
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="h-8 w-full max-w-xs rounded-lg bg-muted" />
        <div className="h-8 w-20 rounded-lg bg-muted" />
      </div>

      <div className="relative overflow-hidden rounded-xl border border-border p-6">
        <div className="animate-shimmer absolute inset-0" />
        <div className="flex gap-6">
          <div className="size-20 shrink-0 rounded-full bg-muted" />
          <div className="flex-1 space-y-3">
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="h-5 w-48 rounded bg-muted" />
            <div className="h-4 w-full max-w-lg rounded bg-muted" />
            <div className="h-4 w-3/4 max-w-md rounded bg-muted" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-xl border border-border p-4"
          >
            <div className="animate-shimmer absolute inset-0" />
            <div className="flex items-start justify-between">
              <div className="size-14 rounded-full bg-muted" />
              <div className="h-4 w-14 rounded bg-muted" />
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
            </div>
            <div className="mt-4 h-9 w-full rounded-lg bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
