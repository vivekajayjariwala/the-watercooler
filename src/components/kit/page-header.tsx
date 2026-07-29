import { cn } from '@/lib/utils'

/**
 * The standard page opener: mono eyebrow, tight title, muted lede, optional
 * action rail. Every top-level page uses this so headings line up across routes.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between',
        className
      )}
    >
      <div className="space-y-2">
        {eyebrow && <p className="label-mono">{eyebrow}</p>}
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  )
}
