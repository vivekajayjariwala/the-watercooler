import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * The droplet path from `public/water.svg`.
 *
 * Inlined rather than loaded through `<img src="/water.svg">` because the file
 * hardcodes `fill="#000000"`, which is invisible on the dark theme and against
 * the token rule in `docs/DESIGN.md`. As markup it inherits `currentColor` and
 * inverts with everything else. `public/water.svg` stays the source of truth
 * for the shape — if it changes, re-copy the `d` below.
 */
const DROPLET_VIEWBOX = '0 0 514.952 514.952'
const DROPLET_PATH =
  'M316.099,85.846c-24.586-35.32-45.821-65.827-50.974-80.433c-1.139-3.215-4.145-5.372-7.554-5.414' +
  'c-3.15,0.096-6.476,2.044-7.68,5.227c-5.244,13.812-25.405,42.765-48.752,76.314' +
  'C147.671,158.326,74.447,263.494,74.447,331.917c0,100.926,82.103,183.034,183.029,183.034' +
  's183.029-82.108,183.029-183.034C440.505,264.6,368.599,161.285,316.099,85.846z'

/** Wordmark: the droplet plus the name. */
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
        viewBox={DROPLET_VIEWBOX}
        fill="currentColor"
        className="size-[17px] shrink-0"
        aria-hidden
      >
        <path d={DROPLET_PATH} />
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
