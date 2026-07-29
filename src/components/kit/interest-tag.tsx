import { cn } from '@/lib/utils'

/**
 * An interest chip. `shared` marks interests you have in common with the person
 * being viewed — the only place discovery UI is allowed to use the accent, so
 * the eye goes straight to the overlap.
 */
export function InterestTag({
  name,
  emoji,
  shared = false,
  className,
}: {
  name: string
  emoji?: string | null
  shared?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        shared
          ? 'border-brand-border bg-brand-subtle text-brand'
          : 'border-border bg-muted text-muted-foreground',
        className
      )}
    >
      {emoji && (
        <span aria-hidden className="text-[11px] leading-none">
          {emoji}
        </span>
      )}
      {name}
    </span>
  )
}
