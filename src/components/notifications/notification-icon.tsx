import { CalendarCheck, CalendarClock, Coffee, MessageSquare, X } from 'lucide-react'
import type { NotificationType } from '@/lib/types'

/**
 * Monochrome glyph per notification kind. Shape carries the meaning here —
 * colour-coding notification types would spend the accent on decoration.
 */
export function NotificationIcon({ type }: { type: NotificationType }) {
  const className = 'size-3.5 text-muted-foreground'

  switch (type) {
    case 'chat_request':
      return <Coffee className={className} aria-hidden />
    case 'chat_accepted':
      return <CalendarCheck className={className} aria-hidden />
    case 'chat_declined':
      return <X className={className} aria-hidden />
    case 'new_message':
      return <MessageSquare className={className} aria-hidden />
    case 'time_proposed':
      return <CalendarClock className={className} aria-hidden />
    case 'time_confirmed':
      return <CalendarCheck className={className} aria-hidden />
  }
}
