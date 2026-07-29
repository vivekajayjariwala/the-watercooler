/**
 * Availability maths — recurring weekly windows, timezones, and mutual slots.
 *
 * This module is deliberately **pure**: no database calls, no `server-only`, no
 * React. It has to be importable from the availability grid (a client
 * component), from Server Actions, and from Server Components alike.
 *
 * ---------------------------------------------------------------------------
 * THE TIMEZONE PROBLEM — read this before changing anything below
 * ---------------------------------------------------------------------------
 *
 * `availability_slots` stores a *recurring weekly* window as three numbers:
 *
 *     weekday       0 = Sunday … 6 = Saturday
 *     start_minute  minutes from midnight
 *     end_minute    minutes from midnight (1..1440, exclusive end)
 *
 * and — this is the part that trips people up — **those numbers are UTC**.
 * The user, however, thinks in their own zone (`profiles.timezone`, an IANA
 * name like `America/Toronto`).
 *
 * Three consequences fall out of that:
 *
 * 1. THE WEEKDAY CAN MOVE. "Monday 9:00–11:00" in `Asia/Tokyo` (UTC+9) is
 *    *Sunday* 00:00–02:00 UTC. "Monday 20:00–22:00" in `America/Los_Angeles`
 *    (UTC-8) is *Tuesday* 04:00–06:00 UTC. Never assume the stored weekday is
 *    the user's weekday.
 *
 * 2. A WINDOW CAN SPLIT. "Monday 18:00–21:00" in `America/New_York` (UTC-4)
 *    straddles UTC midnight: it is Monday 22:00–24:00 *and* Tuesday 00:00–01:00
 *    UTC. Because a row can only carry one weekday and `end_minute <= 1440`,
 *    one local window may need two stored rows. All conversion here works on a
 *    *week-minute ring* (`weekday * 1440 + minute`, 0..10079) precisely so that
 *    wrapping and splitting are a single, boring operation at the end.
 *
 * 3. OFFSETS ARE NOT CONSTANT. DST means `America/Toronto` is UTC-5 in January
 *    and UTC-4 in July, so "Monday 09:00 local" is 14:00 UTC in winter and
 *    13:00 UTC in summer. A single recurring UTC rule therefore *cannot* be
 *    correct all year — the storage format is lossy by construction.
 *
 *    We handle that by always converting against an explicit **reference
 *    instant** (defaulting to "now"), and by computing the offset separately
 *    for each individual weekday occurrence, so a DST transition landing
 *    mid-week is still resolved per-day rather than per-week.
 *
 *    More importantly, anything that produces *concrete* times for the UI
 *    (`findMutualCandidates`) never extrapolates a UTC rule forward. It first
 *    recovers the user's **local** intent ("Mondays, 9–11, my time"), and then
 *    re-materialises that intent against each real calendar date in the
 *    horizon. That is the only way a suggestion made today for a date on the
 *    far side of a DST change lands on the right wall clock.
 *
 * `date-fns` has no timezone support without the optional `@date-fns/tz`
 * package (not installed), so the offset primitives below are built on
 * `Intl.DateTimeFormat`, which is backed by the platform's real IANA database
 * and is correct in both Node and the browser.
 */

import { addDays, startOfDay } from 'date-fns'

/* ==========================================================================
   Constants
   ========================================================================== */

export const MINUTES_PER_HOUR = 60
export const MINUTES_PER_DAY = 1440
export const MINUTES_PER_WEEK = 10_080
export const DAYS_PER_WEEK = 7

/** The editing grid resolution. 48 cells per day. */
export const CELL_MINUTES = 30
export const CELLS_PER_DAY = MINUTES_PER_DAY / CELL_MINUTES
export const CELLS_PER_WEEK = CELLS_PER_DAY * DAYS_PER_WEEK

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export const WEEKDAY_INITIAL = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const

/* ==========================================================================
   Types
   ========================================================================== */

/** A recurring weekly window. Frame (UTC vs. a user's local zone) is contextual. */
export interface WeeklyWindow {
  /** 0 = Sunday … 6 = Saturday */
  weekday: number
  /** Minutes from midnight, inclusive. 0..1439 */
  startMinute: number
  /** Minutes from midnight, exclusive. 1..1440 */
  endMinute: number
}

/** The subset of an `availability_slots` row this module cares about. */
export interface StoredSlot {
  weekday: number
  start_minute: number
  end_minute: number
}

/** An absolute time range, epoch milliseconds. `end` is exclusive. */
export interface Interval {
  start: number
  end: number
}

/** Wall-clock components of an instant, as observed in some IANA zone. */
export interface ZonedParts {
  year: number
  month: number // 1-12
  day: number // 1-31
  hour: number // 0-23
  minute: number
  second: number
  /** 0 = Sunday … 6 = Saturday, in the observed zone. */
  weekday: number
  /** Minutes from local midnight. */
  minuteOfDay: number
}

/* ==========================================================================
   Timezone primitives
   ========================================================================== */

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>()

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = partsFormatterCache.get(timeZone)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      // h23 matters: the default `h12` reports midnight as hour 24 in some
      // locales, which silently shifts everything by a day.
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    partsFormatterCache.set(timeZone, fmt)
  }
  return fmt
}

/**
 * Returns `tz` if the runtime recognises it, otherwise a sensible fallback:
 * the caller's own zone when we're in a browser, else UTC.
 *
 * Profiles default `timezone` to `'UTC'` and it is nullable, so every entry
 * point into this module funnels through here rather than trusting the column.
 */
export function resolveTimeZone(tz: string | null | undefined): string {
  if (tz) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz })
      return tz
    } catch {
      /* fall through */
    }
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** The viewer's own IANA zone, for "…and it's X your time" comparisons. */
export function localTimeZone(): string {
  return resolveTimeZone(null)
}

/** Wall-clock components of `instant` as observed in `timeZone`. */
export function utcToZonedParts(instant: Date | number, timeZone: string): ZonedParts {
  const date = typeof instant === 'number' ? new Date(instant) : instant
  const parts = partsFormatter(timeZone).formatToParts(date)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? '0')

  const year = get('year')
  const month = get('month')
  const day = get('day')
  const hour = get('hour') % 24
  const minute = get('minute')
  const second = get('second')

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    // Date.UTC + getUTCDay is pure calendar arithmetic on the *local* Y/M/D,
    // which is exactly the weekday the user sees on their wall.
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
    minuteOfDay: hour * 60 + minute,
  }
}

/**
 * Offset of `timeZone` from UTC at `instant`, in minutes.
 * Positive is east of Greenwich: `Asia/Tokyo` → +540.
 *
 * Trick: format the instant in the target zone, then reinterpret those
 * wall-clock digits *as if they were UTC*. The gap between that and the real
 * instant is the offset.
 */
export function getTimeZoneOffsetMinutes(instant: Date | number, timeZone: string): number {
  const ms = typeof instant === 'number' ? instant : instant.getTime()
  const p = utcToZonedParts(ms, timeZone)
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  // Round to the nearest minute: the reinterpretation drops sub-second digits.
  return Math.round((asIfUtc - Math.floor(ms / 1000) * 1000) / 60_000)
}

/**
 * The inverse: given a wall clock reading in `timeZone`, find the instant.
 *
 * `minuteOfDay` may exceed 1439 (e.g. 1440 for "midnight at the end of this
 * day"); `Date.UTC` rolls it into the following date for us.
 *
 * Two passes are required because we need the offset *at the answer*, not the
 * offset at our first guess — near a DST boundary those differ. A third check
 * is unnecessary: offsets change by at most a couple of hours and the second
 * pass always lands on the correct side.
 *
 * Ambiguity is resolved the way calendars do it:
 *   * spring-forward gap (that wall time never happens) → the instant just
 *     after the jump;
 *   * autumn overlap (that wall time happens twice) → the earlier instant.
 */
export function zonedTimeToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  minuteOfDay: number,
  timeZone: string
): Date {
  const naive = Date.UTC(year, month - 1, day, 0, minuteOfDay)

  const guessOffset = getTimeZoneOffsetMinutes(naive, timeZone)
  const first = naive - guessOffset * 60_000

  const realOffset = getTimeZoneOffsetMinutes(first, timeZone)
  if (realOffset === guessOffset) return new Date(first)

  return new Date(naive - realOffset * 60_000)
}

/** Calendar-only date shift; no zone involved. Returns 1-based month. */
function shiftCalendarDate(
  year: number,
  month: number,
  day: number,
  byDays: number
): { year: number; month: number; day: number } {
  const d = new Date(Date.UTC(year, month - 1, day + byDays))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

/** The calendar date of the Sunday on-or-before `reference`, as seen in `timeZone`. */
function weekAnchor(reference: Date, timeZone: string) {
  const p = utcToZonedParts(reference, timeZone)
  return shiftCalendarDate(p.year, p.month, p.day, -p.weekday)
}

/* ==========================================================================
   Week-minute ring
   --------------------------------------------------------------------------
   Everything in a week collapses to a single integer axis 0..10079. Wrapping
   past Saturday midnight is a modulo; splitting a window across a day boundary
   is one loop. Doing it any other way means special-casing weekday arithmetic
   in five places and getting one of them wrong.
   ========================================================================== */

function toWeekMinute(weekday: number, minute: number): number {
  const day = ((weekday % DAYS_PER_WEEK) + DAYS_PER_WEEK) % DAYS_PER_WEEK
  return day * MINUTES_PER_DAY + minute
}

function wrapWeekMinute(m: number): number {
  return ((m % MINUTES_PER_WEEK) + MINUTES_PER_WEEK) % MINUTES_PER_WEEK
}

/**
 * Turns a (possibly wrapping, possibly multi-day) week-minute range into the
 * per-weekday windows the database can actually store.
 */
function weekRangeToWindows(startWeekMinute: number, lengthMinutes: number): WeeklyWindow[] {
  const out: WeeklyWindow[] = []
  let cursor = wrapWeekMinute(startWeekMinute)
  let remaining = Math.min(lengthMinutes, MINUTES_PER_WEEK)

  while (remaining > 0) {
    const weekday = Math.floor(cursor / MINUTES_PER_DAY)
    const startMinute = cursor % MINUTES_PER_DAY
    const room = MINUTES_PER_DAY - startMinute
    const take = Math.min(room, remaining)

    out.push({ weekday, startMinute, endMinute: startMinute + take })

    remaining -= take
    cursor = wrapWeekMinute(cursor + take)
  }

  return out
}

/** Sorts, clamps, and coalesces touching/overlapping windows (wrap-aware). */
export function mergeWindows(windows: WeeklyWindow[]): WeeklyWindow[] {
  const ranges = windows
    .map((w) => ({
      start: toWeekMinute(w.weekday, Math.max(0, Math.min(MINUTES_PER_DAY, w.startMinute))),
      end: toWeekMinute(w.weekday, Math.max(0, Math.min(MINUTES_PER_DAY, w.endMinute))),
    }))
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start)

  if (ranges.length === 0) return []

  const merged: Interval[] = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && r.start <= last.end) {
      last.end = Math.max(last.end, r.end)
    } else {
      merged.push({ ...r })
    }
  }

  // Note: we deliberately do NOT join across the Saturday-24:00 / Sunday-00:00
  // seam. A row can only carry one weekday, so joining and re-splitting would
  // produce the exact same two rows in a less obvious order.
  return merged
    .flatMap((r) => weekRangeToWindows(r.start, r.end - r.start))
    .sort((a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute)
}

/* ==========================================================================
   Stored (UTC) ⇄ local weekly windows
   ========================================================================== */

/** Normalises raw `availability_slots` rows into merged UTC windows. */
export function storedToUtcWindows(slots: StoredSlot[]): WeeklyWindow[] {
  return mergeWindows(
    slots.map((s) => ({
      weekday: s.weekday,
      startMinute: s.start_minute,
      endMinute: s.end_minute,
    }))
  )
}

/** Serialises windows back into insertable `availability_slots` rows. */
export function windowsToStoredSlots(
  windows: WeeklyWindow[],
  userId: string
): Array<StoredSlot & { user_id: string }> {
  return mergeWindows(windows).map((w) => ({
    user_id: userId,
    weekday: w.weekday,
    start_minute: w.startMinute,
    end_minute: w.endMinute,
  }))
}

/**
 * UTC windows → the user's local weekly grid.
 *
 * Each window is anchored to its real occurrence in the week containing
 * `reference`, so the offset used is the one actually in force on that day
 * (not a week-wide average). The endpoints are converted independently, which
 * means a window containing a DST transition keeps its true duration.
 */
export function utcWindowsToLocal(
  windows: WeeklyWindow[],
  timeZone: string,
  reference: Date = new Date()
): WeeklyWindow[] {
  const zone = resolveTimeZone(timeZone)
  const anchor = weekAnchor(reference, 'UTC')
  const out: WeeklyWindow[] = []

  for (const w of windows) {
    const date = shiftCalendarDate(anchor.year, anchor.month, anchor.day, w.weekday)
    const startMs = Date.UTC(date.year, date.month - 1, date.day, 0, w.startMinute)
    const endMs = Date.UTC(date.year, date.month - 1, date.day, 0, w.endMinute)

    const localStart = utcToZonedParts(startMs, zone)

    // The stored window is a fixed span of real time, so its length is the same
    // in every frame — no need to diff the local endpoints (which would go
    // wrong across a DST jump anyway).
    const length = (endMs - startMs) / 60_000
    if (length <= 0) continue

    out.push(
      ...weekRangeToWindows(toWeekMinute(localStart.weekday, localStart.minuteOfDay), length)
    )
  }

  return mergeWindows(out)
}

/**
 * The user's local weekly grid → UTC windows ready for storage.
 *
 * Mirror image of `utcWindowsToLocal`. This is where "Monday 9am" becomes a
 * Sunday or a Tuesday row, and where one painted block can become two rows.
 */
export function localWindowsToUtc(
  windows: WeeklyWindow[],
  timeZone: string,
  reference: Date = new Date()
): WeeklyWindow[] {
  const zone = resolveTimeZone(timeZone)
  const anchor = weekAnchor(reference, zone)
  const out: WeeklyWindow[] = []

  for (const w of windows) {
    const date = shiftCalendarDate(anchor.year, anchor.month, anchor.day, w.weekday)

    const startInstant = zonedTimeToUtc(date.year, date.month, date.day, w.startMinute, zone)
    const endInstant = zonedTimeToUtc(date.year, date.month, date.day, w.endMinute, zone)

    const startParts = utcToZonedParts(startInstant, 'UTC')
    const length = (endInstant.getTime() - startInstant.getTime()) / 60_000
    if (length <= 0) continue

    out.push(
      ...weekRangeToWindows(toWeekMinute(startParts.weekday, startParts.minuteOfDay), length)
    )
  }

  return mergeWindows(out)
}

/* ==========================================================================
   Overlap
   ========================================================================== */

function windowsToWeekIntervals(windows: WeeklyWindow[]): Interval[] {
  return mergeWindows(windows)
    .map((w) => ({
      start: toWeekMinute(w.weekday, w.startMinute),
      end: toWeekMinute(w.weekday, w.endMinute),
    }))
    .sort((a, b) => a.start - b.start)
}

/**
 * Intersection of two sorted, non-overlapping interval lists. Used for both the
 * weekly ring (minutes) and the absolute axis (epoch ms) — the maths is
 * identical, only the units differ.
 */
export function intersectIntervals(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = []
  let i = 0
  let j = 0

  while (i < a.length && j < b.length) {
    const start = Math.max(a[i].start, b[j].start)
    const end = Math.min(a[i].end, b[j].end)
    if (end > start) out.push({ start, end })
    if (a[i].end < b[j].end) i++
    else j++
  }

  return out
}

/**
 * The weekly windows two people have in common, in the **UTC** frame.
 *
 * Both inputs must already be UTC (which is how they come out of the database).
 * Use `utcWindowsToLocal` afterwards if you need to draw the result on someone's
 * local grid.
 */
export function overlapWindows(a: WeeklyWindow[], b: WeeklyWindow[]): WeeklyWindow[] {
  const overlaps = intersectIntervals(windowsToWeekIntervals(a), windowsToWeekIntervals(b))
  return mergeWindows(overlaps.flatMap((r) => weekRangeToWindows(r.start, r.end - r.start)))
}

/** Convenience wrapper over two raw slot sets. */
export function overlapStoredSlots(a: StoredSlot[], b: StoredSlot[]): WeeklyWindow[] {
  return overlapWindows(storedToUtcWindows(a), storedToUtcWindows(b))
}

/** Total minutes covered by a window set — used for "6h/week" style summaries. */
export function totalWindowMinutes(windows: WeeklyWindow[]): number {
  return mergeWindows(windows).reduce((sum, w) => sum + (w.endMinute - w.startMinute), 0)
}

/* ==========================================================================
   Materialising concrete times
   ========================================================================== */

/**
 * Projects *local* weekly windows onto real calendar dates, producing absolute
 * intervals.
 *
 * This is the DST-correct path: rather than sliding a fixed UTC rule forward,
 * every date in the horizon is resolved through `zonedTimeToUtc` against that
 * date's own offset. A "Monday 09:00" window therefore stays at 09:00 local on
 * both sides of a clock change — which is what the user meant.
 *
 * The horizon is padded by a day on each end so windows that spill across
 * midnight in either direction are not clipped.
 */
export function localWindowsToIntervals(
  windows: WeeklyWindow[],
  timeZone: string,
  from: Date,
  days: number
): Interval[] {
  const zone = resolveTimeZone(timeZone)
  const merged = mergeWindows(windows)
  if (merged.length === 0) return []

  const byWeekday = new Map<number, WeeklyWindow[]>()
  for (const w of merged) {
    const list = byWeekday.get(w.weekday)
    if (list) list.push(w)
    else byWeekday.set(w.weekday, [w])
  }

  const startParts = utcToZonedParts(from, zone)
  const raw: Interval[] = []

  for (let offset = -1; offset <= days + 1; offset++) {
    const date = shiftCalendarDate(startParts.year, startParts.month, startParts.day, offset)
    const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay()

    for (const w of byWeekday.get(weekday) ?? []) {
      const start = zonedTimeToUtc(date.year, date.month, date.day, w.startMinute, zone).getTime()
      const end = zonedTimeToUtc(date.year, date.month, date.day, w.endMinute, zone).getTime()
      if (end > start) raw.push({ start, end })
    }
  }

  raw.sort((a, b) => a.start - b.start)

  const out: Interval[] = []
  for (const r of raw) {
    const last = out[out.length - 1]
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end)
    else out.push({ ...r })
  }
  return out
}

export interface CandidateOptions {
  /** Start of the horizon. Defaults to now. */
  from?: Date
  /** How many days ahead to look. Default 14. */
  days?: number
  /** Grid the suggestions snap to. Default 30 minutes. */
  stepMinutes?: number
  /** The meeting length that has to fit inside the window. Default 30. */
  durationMinutes?: number
  /** Don't suggest anything sooner than this. Default 60 minutes. */
  minLeadMinutes?: number
  /** Cap on returned suggestions. Default 12. */
  limit?: number
  /** At most this many suggestions per calendar day (UTC). Default 2. */
  maxPerDay?: number
}

/** Walks a set of absolute intervals and emits meeting start times on a grid. */
export function gridCandidates(intervals: Interval[], options: CandidateOptions = {}): Date[] {
  const {
    from = new Date(),
    stepMinutes = CELL_MINUTES,
    durationMinutes = 30,
    minLeadMinutes = 60,
    limit = 12,
    maxPerDay = 2,
  } = options

  const step = stepMinutes * 60_000
  const duration = durationMinutes * 60_000
  const earliest = from.getTime() + minLeadMinutes * 60_000

  const perDay = new Map<string, number>()
  const out: Date[] = []

  for (const interval of intervals) {
    // Snap up to the next grid mark. The grid is anchored to the UTC epoch, so
    // it lands on :00/:30 in every zone whose offset is a whole half-hour —
    // which is all of them except Nepal, the Chathams, and a couple of others,
    // where honest :45 times beat silently wrong :00 ones.
    let cursor = Math.max(interval.start, earliest)
    cursor = Math.ceil(cursor / step) * step

    while (cursor + duration <= interval.end) {
      const day = new Date(cursor).toISOString().slice(0, 10)
      const used = perDay.get(day) ?? 0

      if (used < maxPerDay) {
        perDay.set(day, used + 1)
        out.push(new Date(cursor))
        if (out.length >= limit) return out
      }

      cursor += step
    }
  }

  return out
}

export interface CandidateParticipant {
  slots: StoredSlot[]
  timezone: string | null | undefined
}

/**
 * The headline function: concrete times that work for **both** people.
 *
 * Pipeline, and why each step exists:
 *
 *   1. Stored UTC rows → each person's *local* weekly intent. Without this we
 *      would be extrapolating a UTC rule that was only ever valid for the week
 *      it was written in.
 *   2. Local intent → absolute intervals, resolved date by date so DST is
 *      applied per-occurrence.
 *   3. Intersect the two absolute interval lists.
 *   4. Walk the intersection on a 30-minute grid, dropping anything already
 *      past (plus a lead time) and anything too short for the meeting.
 *
 * Returns `Date`s — absolute instants. Render them in whichever zone the
 * viewer cares about.
 */
export function findMutualCandidates(
  a: CandidateParticipant,
  b: CandidateParticipant,
  options: CandidateOptions = {}
): Date[] {
  const { from = new Date(), days = 14 } = options

  const aZone = resolveTimeZone(a.timezone)
  const bZone = resolveTimeZone(b.timezone)

  const aLocal = utcWindowsToLocal(storedToUtcWindows(a.slots), aZone, from)
  const bLocal = utcWindowsToLocal(storedToUtcWindows(b.slots), bZone, from)

  if (aLocal.length === 0 || bLocal.length === 0) return []

  const aIntervals = localWindowsToIntervals(aLocal, aZone, from, days)
  const bIntervals = localWindowsToIntervals(bLocal, bZone, from, days)

  const horizonEnd = addDays(startOfDay(from), days + 1).getTime()
  const mutual = intersectIntervals(aIntervals, bIntervals).filter((i) => i.start < horizonEnd)

  return gridCandidates(mutual, { ...options, from, days })
}

/** Single-person version, for "when am I free?" suggestions with no partner. */
export function findOwnCandidates(
  participant: CandidateParticipant,
  options: CandidateOptions = {}
): Date[] {
  const { from = new Date(), days = 14 } = options
  const zone = resolveTimeZone(participant.timezone)
  const local = utcWindowsToLocal(storedToUtcWindows(participant.slots), zone, from)
  if (local.length === 0) return []
  return gridCandidates(localWindowsToIntervals(local, zone, from, days), { ...options, from, days })
}

/* ==========================================================================
   Half-hour cell grid (the painting surface)
   ========================================================================== */

/** `weekday * 48 + halfHourIndex`, 0..335. */
export function cellIndex(weekday: number, minute: number): number {
  return weekday * CELLS_PER_DAY + Math.floor(minute / CELL_MINUTES)
}

export function cellWeekday(cell: number): number {
  return Math.floor(cell / CELLS_PER_DAY)
}

export function cellMinute(cell: number): number {
  return (cell % CELLS_PER_DAY) * CELL_MINUTES
}

/** Windows → the set of half-hour cells they cover. Partial cells count. */
export function windowsToCells(windows: WeeklyWindow[]): Set<number> {
  const cells = new Set<number>()
  for (const w of mergeWindows(windows)) {
    const first = Math.floor(w.startMinute / CELL_MINUTES)
    const last = Math.ceil(w.endMinute / CELL_MINUTES)
    for (let c = first; c < last; c++) cells.add(w.weekday * CELLS_PER_DAY + c)
  }
  return cells
}

/** Cells → merged windows. Runs of adjacent cells become one window. */
export function cellsToWindows(cells: Iterable<number>): WeeklyWindow[] {
  const sorted = [...new Set(cells)].filter((c) => c >= 0 && c < CELLS_PER_WEEK).sort((a, b) => a - b)
  const windows: WeeklyWindow[] = []

  for (const cell of sorted) {
    const weekday = cellWeekday(cell)
    const startMinute = cellMinute(cell)
    const last = windows[windows.length - 1]

    if (last && last.weekday === weekday && last.endMinute === startMinute) {
      last.endMinute = startMinute + CELL_MINUTES
    } else {
      windows.push({ weekday, startMinute, endMinute: startMinute + CELL_MINUTES })
    }
  }

  return windows
}

/* ==========================================================================
   Presets
   ========================================================================== */

export type PresetId = 'weekday-mornings' | 'lunch-hours' | 'weekday-afternoons' | 'clear'

export const AVAILABILITY_PRESETS: Array<{ id: PresetId; label: string; hint: string }> = [
  { id: 'weekday-mornings', label: 'Weekday mornings', hint: 'Mon–Fri, 9–11 AM' },
  { id: 'lunch-hours', label: 'Lunch hours', hint: 'Mon–Fri, 12–1 PM' },
  { id: 'weekday-afternoons', label: 'Weekday afternoons', hint: 'Mon–Fri, 2–4 PM' },
  { id: 'clear', label: 'Clear all', hint: 'Start over' },
]

/** Preset cell sets, expressed in the user's **local** frame. */
export function presetCells(preset: PresetId): Set<number> {
  const cells = new Set<number>()
  const paint = (weekday: number, from: number, to: number) => {
    for (let m = from; m < to; m += CELL_MINUTES) cells.add(cellIndex(weekday, m))
  }

  if (preset === 'clear') return cells

  for (let weekday = 1; weekday <= 5; weekday++) {
    if (preset === 'weekday-mornings') paint(weekday, 9 * 60, 11 * 60)
    if (preset === 'lunch-hours') paint(weekday, 12 * 60, 13 * 60)
    if (preset === 'weekday-afternoons') paint(weekday, 14 * 60, 16 * 60)
  }

  return cells
}

/* ==========================================================================
   Formatting
   ========================================================================== */

/** 570 → "9:30 AM". 0 → "12:00 AM". 1440 → "12:00 AM" (next midnight). */
export function formatMinuteOfDay(minute: number, options: { compact?: boolean } = {}): string {
  const normalised = ((Math.round(minute) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const hour24 = Math.floor(normalised / 60)
  const mins = normalised % 60
  const suffix = hour24 < 12 ? 'AM' : 'PM'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12

  if (options.compact && mins === 0) return `${hour12} ${suffix}`
  return `${hour12}:${String(mins).padStart(2, '0')} ${suffix}`
}

/** "09:30" or "9:30 AM" → 570. Returns null when unparseable. */
export function parseMinuteOfDay(value: string): number | null {
  const match = /^\s*(\d{1,2})[:.]?(\d{2})?\s*(am|pm)?\s*$/i.exec(value)
  if (!match) return null

  let hour = Number(match[1])
  const mins = Number(match[2] ?? '0')
  const meridiem = match[3]?.toLowerCase()

  if (Number.isNaN(hour) || Number.isNaN(mins) || mins > 59) return null

  if (meridiem === 'am') hour = hour === 12 ? 0 : hour
  if (meridiem === 'pm') hour = hour === 12 ? 12 : hour + 12
  if (hour > 24) return null

  const total = hour * 60 + mins
  return total > MINUTES_PER_DAY ? null : total
}

export function weekdayName(weekday: number): string {
  return WEEKDAY_NAMES[((weekday % 7) + 7) % 7]
}

export function weekdayShort(weekday: number): string {
  return WEEKDAY_SHORT[((weekday % 7) + 7) % 7]
}

/** "Mon · 9:00 AM – 11:00 AM" */
export function formatWindow(window: WeeklyWindow): string {
  return `${weekdayShort(window.weekday)} · ${formatMinuteOfDay(window.startMinute)} – ${formatMinuteOfDay(window.endMinute)}`
}

const zonedFormatterCache = new Map<string, Intl.DateTimeFormat>()

function zonedFormatter(timeZone: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${timeZone}|${JSON.stringify(options)}`
  let fmt = zonedFormatterCache.get(key)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', { ...options, timeZone })
    zonedFormatterCache.set(key, fmt)
  }
  return fmt
}

/**
 * Formats an instant in an explicit zone.
 *
 * `date-fns`' `format` always uses the runtime's zone, which is exactly the bug
 * this whole file exists to avoid — so anything that has to be rendered in
 * *someone else's* zone goes through here instead.
 */
export function formatInTimeZone(
  instant: Date | number,
  timeZone: string,
  options: Intl.DateTimeFormatOptions
): string {
  return zonedFormatter(resolveTimeZone(timeZone), options).format(
    typeof instant === 'number' ? new Date(instant) : instant
  )
}

/** "Thu, Aug 6" */
export function formatZonedDate(instant: Date | number, timeZone: string): string {
  return formatInTimeZone(instant, timeZone, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** "9:30 AM" */
export function formatZonedTime(instant: Date | number, timeZone: string): string {
  return formatInTimeZone(instant, timeZone, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/** "Thu, Aug 6 · 9:30 AM" */
export function formatZonedDateTime(instant: Date | number, timeZone: string): string {
  return `${formatZonedDate(instant, timeZone)} · ${formatZonedTime(instant, timeZone)}`
}

/** Short zone label for the instant — "EDT", "GMT+5:30". */
export function zoneAbbreviation(instant: Date | number, timeZone: string): string {
  const zone = resolveTimeZone(timeZone)
  const parts = zonedFormatter(zone, {
    hour: 'numeric',
    timeZoneName: 'short',
  }).formatToParts(typeof instant === 'number' ? new Date(instant) : instant)

  return parts.find((p) => p.type === 'timeZoneName')?.value ?? zone
}

/** "Toronto" out of "America/Toronto" — friendlier than the full IANA id. */
export function zoneCityLabel(timeZone: string): string {
  const zone = resolveTimeZone(timeZone)
  const tail = zone.split('/').pop() ?? zone
  return tail.replace(/_/g, ' ')
}

/** True when the two zones show the same wall clock at `instant`. */
export function sameWallClock(instant: Date | number, a: string, b: string): boolean {
  return (
    getTimeZoneOffsetMinutes(instant, resolveTimeZone(a)) ===
    getTimeZoneOffsetMinutes(instant, resolveTimeZone(b))
  )
}

/** "+3h" / "-1h30" — how far ahead `other` is of `base` at `instant`. */
export function zoneDeltaLabel(instant: Date | number, base: string, other: string): string {
  const delta =
    getTimeZoneOffsetMinutes(instant, resolveTimeZone(other)) -
    getTimeZoneOffsetMinutes(instant, resolveTimeZone(base))

  if (delta === 0) return 'same time'

  const sign = delta > 0 ? '+' : '−'
  const abs = Math.abs(delta)
  const hours = Math.floor(abs / 60)
  const mins = abs % 60

  return `${sign}${hours}${mins ? `h${String(mins).padStart(2, '0')}` : 'h'}`
}
