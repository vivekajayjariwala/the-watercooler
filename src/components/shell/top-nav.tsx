'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Logo } from './logo'
import { ThemeToggle } from './theme-toggle'
import { PersonAvatar } from '@/components/kit/person-avatar'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/discover', label: 'Discover' },
  { href: '/chats', label: 'Chats' },
  { href: '/profile', label: 'Profile' },
] as const

export function TopNav({
  userId,
  name,
  avatarUrl,
  unreadCount,
}: {
  userId: string
  name: string | null
  avatarUrl: string | null
  unreadCount: number
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-1">
          <Logo href="/discover" />

          {/* Slash separator, the Vercel breadcrumb tic */}
          <span className="mx-2 hidden text-border-strong select-none sm:inline" aria-hidden>
            /
          </span>

          <nav className="hidden items-center gap-0.5 sm:flex">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-md px-2.5 py-1.5 text-sm transition-colors',
                  isActive(link.href)
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <NotificationBell userId={userId} initialUnread={unreadCount} />
          <ThemeToggle />

          <Link
            href="/settings"
            className="ml-1 rounded-full ring-offset-2 ring-offset-background transition-shadow hover:ring-2 hover:ring-border-strong"
            aria-label="Settings"
          >
            <PersonAvatar name={name} src={avatarUrl} size="sm" />
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border bg-background px-4 py-2 sm:hidden">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                'block rounded-md px-2 py-2 text-sm transition-colors',
                isActive(link.href)
                  ? 'bg-muted font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
