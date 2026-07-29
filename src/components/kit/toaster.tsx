'use client'

import { Toaster as Sonner } from 'sonner'
import { useTheme } from 'next-themes'

/** Toasts inherit the design tokens so they never look like a third-party widget. */
export function Toaster() {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            'group rounded-xl border border-border bg-popover text-popover-foreground shadow-lg font-sans text-sm',
          description: 'text-muted-foreground',
          actionButton: 'rounded-md bg-primary text-primary-foreground text-xs font-medium',
          cancelButton: 'rounded-md bg-muted text-muted-foreground text-xs font-medium',
        },
      }}
    />
  )
}
