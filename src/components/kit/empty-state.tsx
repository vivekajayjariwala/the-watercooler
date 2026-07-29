import { cn } from '@/lib/utils'

/**
 * Empty states are dashed, not solid — a dashed edge reads as "this can be
 * filled", where a solid card reads as a thing that failed to load.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong px-6 py-16 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground [&_svg]:size-[18px]">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium tracking-tight">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
