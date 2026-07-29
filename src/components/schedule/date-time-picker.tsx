'use client'

import { useMemo, useState } from 'react'
import { CalendarPlus, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Calendar,
  calendarDateKey,
  toCalendarDate,
  type CalendarDate,
} from './calendar'
import {
  formatMinuteOfDay,
  formatZonedDateTime,
  localTimeZone,
  utcToZonedParts,
  zonedTimeToUtc,
  zoneAbbreviation,
  zoneCityLabel,
} from '@/lib/availability'

/**
 * Pick a date, a time, and the zone the two of them mean.
 *
 * The zone selector is the part that looks optional and isn't. A date and a
 * wall-clock time are not an instant until you say *whose* clock — and the
 * person proposing a coffee is not always sitting in the timezone on their
 * profile. Making the zone explicit turns a silent off-by-some-hours into a
 * visible field, and the preview line underneath shows the instant it resolves
 * to so nobody has to take it on trust.
 */

/** Matches the availability grid in settings: coffee happens during the day. */
const FIRST_HOUR = 7
const LAST_HOUR = 21
const STEP_MINUTES = 15

/** A manual pick can land anywhere in the next season, but not in the past. */
const DAYS_SELECTABLE = 90

const TIME_OPTIONS = Array.from(
  { length: ((LAST_HOUR - FIRST_HOUR) * 60) / STEP_MINUTES + 1 },
  (_, i) => {
    const minuteOfDay = FIRST_HOUR * 60 + i * STEP_MINUTES
    return { value: String(minuteOfDay), label: formatMinuteOfDay(minuteOfDay) }
  }
)

/** Every zone the runtime knows, or a small fallback on older engines. */
function allTimeZones(): string[] {
  const supported = Intl.supportedValuesOf?.('timeZone')
  if (supported && supported.length > 0) return supported

  return [
    'UTC',
    'America/Los_Angeles',
    'America/Denver',
    'America/Chicago',
    'America/New_York',
    'America/Toronto',
    'Europe/London',
    'Europe/Berlin',
    'Asia/Kolkata',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Sydney',
  ]
}

/** Shift a calendar date by whole days without going through a zone. */
function shiftDays(date: CalendarDate, days: number): CalendarDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days))
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  }
}

export function DateTimePicker({
  /** The zone the rest of the panel renders in; the default for new picks. */
  defaultZone,
  /** Zone the other person keeps, offered as a shortcut. */
  theirZone,
  disabled,
  onAdd,
}: {
  defaultZone: string
  theirZone?: string
  disabled?: boolean
  onAdd: (iso: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [zone, setZone] = useState(defaultZone)
  const [date, setDate] = useState<CalendarDate | null>(null)
  const [minuteOfDay, setMinuteOfDay] = useState<string>('')

  const now = new Date()
  const today = toCalendarDate(now, zone)

  // Suggested zones first: yours, theirs, and wherever this browser is. The
  // full list stays underneath — it's ~400 entries, which is a scroll, but
  // Base UI's typeahead makes it reachable by name.
  const zoneGroups = useMemo(() => {
    const suggested = [defaultZone, theirZone, localTimeZone()].filter(
      (value, index, all): value is string =>
        Boolean(value) && all.indexOf(value) === index
    )
    const rest = allTimeZones().filter((value) => !suggested.includes(value))
    return { suggested, rest }
  }, [defaultZone, theirZone])

  // On today, times that have already gone by are not choices. Computed on
  // every render rather than memoised — it's a filter over ~60 strings, and a
  // dependency list can't express "unless the clock rolled past the option".
  const isToday = date !== null && calendarDateKey(date) === calendarDateKey(today)
  const timeOptions = isToday
    ? TIME_OPTIONS.filter(
        (option) => Number(option.value) > utcToZonedParts(now, zone).minuteOfDay
      )
    : TIME_OPTIONS

  const instant =
    date && minuteOfDay !== ''
      ? zonedTimeToUtc(date.year, date.month, date.day, Number(minuteOfDay), zone)
      : null

  const zoneLabel = (value: string) => `${zoneCityLabel(value)} · ${value.replace(/_/g, ' ')}`

  function reset() {
    setDate(null)
    setMinuteOfDay('')
    setZone(defaultZone)
  }

  function confirm() {
    if (!instant) return
    onAdd(instant.toISOString())
    setOpen(false)
    reset()
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" className="w-full" disabled={disabled}>
            <CalendarPlus className="size-3.5" />
            Pick a date and time
          </Button>
        }
      />

      <PopoverContent className="w-auto space-y-3" align="center">
        <Calendar
          value={date}
          onSelect={setDate}
          min={today}
          max={shiftDays(today, DAYS_SELECTABLE)}
        />

        <div className="space-y-2 border-t border-border pt-3">
          <Select
            items={timeOptions}
            value={minuteOfDay}
            onValueChange={(value) => setMinuteOfDay(String(value))}
          >
            <SelectTrigger className="w-full" aria-label="Time">
              <SelectValue placeholder="Time" />
            </SelectTrigger>
            <SelectContent>
              {timeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={zone} onValueChange={(value) => setZone(String(value))}>
            <SelectTrigger className="w-full" aria-label="Timezone">
              <Globe className="size-3.5 text-muted-foreground" aria-hidden />
              <SelectValue placeholder="Timezone" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectGroup>
                <SelectLabel>Suggested</SelectLabel>
                {zoneGroups.suggested.map((value) => (
                  <SelectItem key={value} value={value}>
                    {zoneLabel(value)}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>All timezones</SelectLabel>
                {zoneGroups.rest.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <p className="font-mono text-[11px] tabular text-muted-foreground">
            {instant ? (
              <>
                {formatZonedDateTime(instant, zone)} {zoneAbbreviation(instant, zone)}
                {zone !== defaultZone && (
                  <>
                    <br />
                    {formatZonedDateTime(instant, defaultZone)}{' '}
                    {zoneAbbreviation(instant, defaultZone)} your time
                  </>
                )}
              </>
            ) : (
              'Pick a date and a time.'
            )}
          </p>

          <Button type="button" className="w-full" disabled={!instant} onClick={confirm}>
            Add this time
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
