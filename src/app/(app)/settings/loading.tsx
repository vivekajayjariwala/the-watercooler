/** Mirrors the single-column stack of bordered sections on `/settings`. */
export default function SettingsLoading() {
  return (
    <div className="max-w-2xl space-y-10">
      <div className="space-y-2 border-b border-border pb-6">
        <div className="h-2.5 w-16 rounded bg-muted" />
        <div className="h-9 w-40 rounded bg-muted" />
      </div>

      <div className="relative space-y-10 overflow-hidden">
        <div className="animate-shimmer absolute inset-0" />

        {[
          { rows: 2, tall: false },
          { rows: 2, tall: false },
          { rows: 1, tall: true },
          { rows: 1, tall: false },
          { rows: 1, tall: false },
          { rows: 1, tall: false },
        ].map((section, i) => (
          <section
            key={i}
            className="space-y-4 border-t border-border pt-8 first:border-t-0 first:pt-0"
          >
            <div className="h-2.5 w-20 rounded bg-muted" />
            {section.tall ? (
              <div className="h-56 w-full rounded-xl bg-muted" />
            ) : (
              Array.from({ length: section.rows }, (_, row) => (
                <div key={row} className="h-9 w-full max-w-sm rounded-lg bg-muted" />
              ))
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
