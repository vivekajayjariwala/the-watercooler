import { cn } from '@/lib/utils'

const SIZES = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-base',
  xl: 'size-20 text-xl',
  '2xl': 'size-28 text-3xl',
} as const

export type AvatarSize = keyof typeof SIZES

function initials(name: string | null | undefined): string {
  if (!name?.trim()) return '?'
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

/**
 * Monochrome avatar. No colour-coded fallbacks — a grey initial reads as
 * intentional, a random pastel reads as a placeholder nobody finished.
 */
export function PersonAvatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string | null | undefined
  src?: string | null
  size?: AvatarSize
  className?: string
}) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        'border border-border bg-muted font-medium text-muted-foreground select-none',
        SIZES[size],
        className
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name ?? 'Avatar'}
          className="size-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className="font-mono tracking-tight">{initials(name)}</span>
      )}
    </span>
  )
}
