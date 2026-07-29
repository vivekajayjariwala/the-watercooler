import { cn } from '@/lib/utils'

/**
 * Match strength. Mono numerals + a segmented meter — the number is the point,
 * so it gets the weight, and the bar just makes it scannable in a grid.
 */
export function ScoreBadge({
  score,
  showBar = true,
  className,
}: {
  /** 0..1 */
  score: number
  showBar?: boolean
  className?: string
}) {
  const percent = Math.round(Math.max(0, Math.min(1, score)) * 100)
  const filled = Math.round((percent / 100) * 5)

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {showBar && (
        <span className="flex gap-[3px]" aria-hidden>
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={i}
              className={cn(
                'h-3 w-[3px] rounded-full',
                i < filled ? 'bg-foreground' : 'bg-border-strong'
              )}
            />
          ))}
        </span>
      )}
      <span className="font-mono text-xs font-medium tabular tracking-tight">
        {percent}%
      </span>
      <span className="sr-only">match strength {percent} percent</span>
    </span>
  )
}
