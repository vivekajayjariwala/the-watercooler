import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Wordmark. The mark is two offset rings — the ripple a drop makes — drawn in
 * currentColor so it inverts cleanly with the theme.
 */
export function Logo({
  href = '/',
  showWord = true,
  className,
}: {
  href?: string
  showWord?: boolean
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex items-center gap-2 text-foreground transition-opacity hover:opacity-70',
        className
      )}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="size-[18px] shrink-0"
        aria-hidden
      >
        <circle cx="10" cy="10" r="2.5" fill="currentColor" />
        <circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="1.25" opacity="0.5" />
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.25" opacity="0.2" />
      </svg>
      {showWord && (
        <span className="text-[15px] font-semibold tracking-[-0.03em]">
          watercooler
        </span>
      )}
      <span className="sr-only">Watercooler home</span>
    </Link>
  )
}
