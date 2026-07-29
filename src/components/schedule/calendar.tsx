'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WEEKDAY_INITIAL, WEEKDAY_NAMES, utcToZonedParts } from '@/lib/availability'
import { cn } from '@/lib/utils'

/**
 * A month grid.
 *
 * Every date in here is a *calendar* date — a `{year, month, day}` triple, not
 * an instant. That distinction is the whole reason this isn't built on `Date`
 * arithmetic in local time: "July 31st" means the same square on the grid to
 * everyone looking at it, but the instant it starts depends on a timezone the
 * calendar deliberately knows nothing about. The caller combines the date with
 * a time and a zone; see `date-time-picker.tsx`.
 *
 * Days are laid out Sunday-first to match `WEEKDAY_INITIAL` and the
 * availability grid in settings.
 */

export interface CalendarDate {
  year: number
  /** 1-12, not the 0-11 that `Date` uses. */
  month: number
  day: number
}

export function toCalendarDate(instant: Date, zone: string): CalendarDate {
  const parts = utcToZonedParts(instant, zone)
  return { year: parts.year, month: parts.month, day: parts.day }
}

export function calendarDateKey({ year, month, day }: CalendarDate): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function sameCalendarDate(a: CalendarDate | null, b: CalendarDate | null): boolean {
  if (!a || !b) return false
  return a.year === b.year && a.month === b.month && a.day === b.day
}

/** Ordering without building `Date`s: the key sorts lexically as it does chronologically. */
function compareCalendarDates(a: CalendarDate, b: CalendarDate): number {
  return calendarDateKey(a).localeCompare(calendarDateKey(b))
}

const monthLabelFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const fullDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

/**
 * A UTC-midnight `Date` standing in for a calendar date.
 *
 * Only ever passed to formatters pinned to `timeZone: 'UTC'`, so the digits
 * that come out are the same ones that went in. It is not an instant anyone
 * schedules against.
 */
function asUtcDate({ year, month, day }: CalendarDate): Date {
  return new Date(Date.UTC(year, month - 1, day))
}

/** Days in a month, via the day-0-is-last-month's-end trick. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** Which weekday (0-6, Sunday first) the 1st of the month falls on. */
function firstWeekdayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const zeroBased = year * 12 + (month - 1) + delta
  return { year: Math.floor(zeroBased / 12), month: (zeroBased % 12) + 1 }
}

export function Calendar({
  value,
  onSelect,
  min,
  max,
  className,
}: {
  value: CalendarDate | null
  onSelect: (date: CalendarDate) => void
  /** Earliest selectable date, inclusive. */
  min?: CalendarDate
  /** Latest selectable date, inclusive. */
  max?: CalendarDate
  className?: string
}) {
  // Open on the selected month, or on the earliest month you can actually pick.
  const [view, setView] = useState(() => {
    const anchor = value ?? min ?? { year: 2026, month: 1, day: 1 }
    return { year: anchor.year, month: anchor.month }
  })

  const total = daysInMonth(view.year, view.month)
  const leadingBlanks = firstWeekdayOfMonth(view.year, view.month)

  const isOutOfRange = (date: CalendarDate) =>
    (min !== undefined && compareCalendarDates(date, min) < 0) ||
    (max !== undefined && compareCalendarDates(date, max) > 0)

  // Disable a step only when *every* date in that direction is out of range,
  // so you can still page into a month that is only partly selectable.
  const previous = addMonths(view.year, view.month, -1)
  const next = addMonths(view.year, view.month, 1)
  const canGoBack =
    min === undefined ||
    compareCalendarDates(
      { ...previous, day: daysInMonth(previous.year, previous.month) },
      min
    ) >= 0
  const canGoForward =
    max === undefined || compareCalendarDates({ ...next, day: 1 }, max) <= 0

  return (
    <div className={cn('w-[15.5rem] select-none', className)}>
      <div className="flex items-center justify-between gap-1 pb-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Previous month"
          disabled={!canGoBack}
          onClick={() => setView(previous)}
          className="text-muted-foreground"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {/* aria-live so paging announces the new month to a screen reader. */}
        <p aria-live="polite" className="text-[13px] font-medium tracking-tight">
          {monthLabelFormatter.format(asUtcDate({ ...view, day: 1 }))}
        </p>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Next month"
          disabled={!canGoForward}
          onClick={() => setView(next)}
          className="text-muted-foreground"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-0.5" role="grid">
        {WEEKDAY_INITIAL.map((initial, index) => (
          <abbr
            key={index}
            title={WEEKDAY_NAMES[index]}
            className="flex h-6 items-center justify-center font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase no-underline"
          >
            {initial}
          </abbr>
        ))}

        {Array.from({ length: leadingBlanks }, (_, i) => (
          <span key={`blank-${i}`} aria-hidden />
        ))}

        {Array.from({ length: total }, (_, i) => {
          const date: CalendarDate = { year: view.year, month: view.month, day: i + 1 }
          const selected = sameCalendarDate(date, value)
          const disabled = isOutOfRange(date)

          return (
            <button
              key={date.day}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={fullDateFormatter.format(asUtcDate(date))}
              onClick={() => onSelect(date)}
              className={cn(
                'flex h-8 items-center justify-center rounded-md font-mono text-xs tabular transition-colors',
                'disabled:pointer-events-none disabled:text-muted-foreground/40',
                selected
                  ? 'bg-foreground font-semibold text-background'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              {date.day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
