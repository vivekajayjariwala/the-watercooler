'use client'

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { SubmitButton } from '@/components/kit/submit-button'
import { Button } from '@/components/ui/button'
import { saveAvailability, type ScheduleState } from './actions'
import {
  AVAILABILITY_PRESETS,
  CELLS_PER_DAY,
  CELL_MINUTES,
  DAYS_PER_WEEK,
  WEEKDAY_SHORT,
  cellIndex,
  cellsToWindows,
  formatMinuteOfDay,
  localWindowsToUtc,
  presetCells,
  resolveTimeZone,
  storedToUtcWindows,
  utcWindowsToLocal,
  windowsToCells,
  zoneCityLabel,
  type PresetId,
} from '@/lib/availability'
import { cn } from '@/lib/utils'
import type { AvailabilitySlot } from '@/lib/types'

const IDLE: ScheduleState = { status: 'idle' }

/** Coffee happens during the day; hiding the small hours halves the grid. */
const FIRST_HOUR = 7
const LAST_HOUR = 21
const ROW_COUNT = ((LAST_HOUR - FIRST_HOUR) * 60) / CELL_MINUTES

/**
 * Weekly availability grid.
 *
 * The grid is painted in the user's **local** week, then converted to UTC on
 * save — a local Monday 9am can be a Sunday or Tuesday row in the database, and
 * one painted block can split into two rows. Doing that conversion here (rather
 * than storing local time) keeps overlap maths correct between people in
 * different zones.
 */
export function AvailabilityEditor({
  userId,
  timezone,
  slots,
}: {
  userId: string
  timezone: string
  slots: AvailabilitySlot[]
}) {
  const zone = resolveTimeZone(timezone)

  const initialCells = useMemo(
    () => windowsToCells(utcWindowsToLocal(storedToUtcWindows(slots), zone)),
    [slots, zone]
  )

  const [cells, setCells] = useState<Set<number>>(initialCells)
  const [state, formAction] = useActionState(saveAvailability, IDLE)

  // Drag paints in one mode for the whole gesture, so dragging across a mixed
  // selection doesn't flicker between adding and removing.
  const painting = useRef<'add' | 'remove' | null>(null)

  useEffect(() => setCells(initialCells), [initialCells])

  useEffect(() => {
    if (state.status === 'success') toast.success(state.message)
    if (state.status === 'error') toast.error(state.message)
  }, [state])

  useEffect(() => {
    const stop = () => {
      painting.current = null
    }
    window.addEventListener('pointerup', stop)
    return () => window.removeEventListener('pointerup', stop)
  }, [])

  const apply = useCallback((cell: number, mode: 'add' | 'remove') => {
    setCells((current) => {
      const has = current.has(cell)
      if (mode === 'add' ? has : !has) return current
      const next = new Set(current)
      if (mode === 'add') next.add(cell)
      else next.delete(cell)
      return next
    })
  }, [])

  const dirty = useMemo(() => {
    if (cells.size !== initialCells.size) return true
    for (const cell of cells) if (!initialCells.has(cell)) return true
    return false
  }, [cells, initialCells])

  // Serialised at render time so the hidden input always matches the grid.
  const payload = useMemo(() => {
    const localWindows = cellsToWindows(cells)
    const utcWindows = localWindowsToUtc(localWindows, zone)
    return JSON.stringify(
      utcWindows.map((w) => ({
        weekday: w.weekday,
        start_minute: w.startMinute,
        end_minute: w.endMinute,
      }))
    )
  }, [cells, zone])

  const totalHours = (cells.size * CELL_MINUTES) / 60

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="windows" value={payload} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Painted in your local time ({zoneCityLabel(zone)}).{' '}
          <span className="font-mono tabular">{totalHours.toFixed(1)}h</span> selected.
        </p>

        <div className="flex flex-wrap gap-1">
          {AVAILABILITY_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              variant="ghost"
              size="xs"
              title={preset.hint}
              onClick={() => setCells(applyPreset(preset.id))}
              className="text-muted-foreground"
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[28rem] select-none">
          <div className="mb-1 grid grid-cols-[3rem_repeat(7,1fr)] gap-px">
            <span />
            {WEEKDAY_SHORT.map((day, index) => (
              <span key={index} className="label-mono text-center">
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-[3rem_repeat(7,1fr)] gap-px">
            {Array.from({ length: ROW_COUNT }, (_, row) => {
              const minute = FIRST_HOUR * 60 + row * CELL_MINUTES
              const onHour = minute % 60 === 0

              return (
                <div key={row} className="contents">
                  <span
                    className={cn(
                      'pr-2 text-right font-mono text-[10px] tabular leading-4 text-muted-foreground',
                      !onHour && 'invisible'
                    )}
                  >
                    {formatMinuteOfDay(minute, { compact: true })}
                  </span>

                  {Array.from({ length: DAYS_PER_WEEK }, (_, weekday) => {
                    const cell = cellIndex(weekday, minute)
                    const on = cells.has(cell)

                    return (
                      <button
                        key={weekday}
                        type="button"
                        aria-pressed={on}
                        aria-label={`${WEEKDAY_SHORT[weekday]} ${formatMinuteOfDay(minute)}`}
                        onPointerDown={(event) => {
                          event.preventDefault()
                          painting.current = on ? 'remove' : 'add'
                          apply(cell, painting.current)
                        }}
                        onPointerEnter={() => {
                          if (painting.current) apply(cell, painting.current)
                        }}
                        className={cn(
                          'h-4 border-t transition-colors',
                          onHour ? 'border-t-border' : 'border-t-transparent',
                          on
                            ? 'bg-foreground hover:bg-foreground/80'
                            : 'bg-muted hover:bg-border-strong'
                        )}
                      />
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <SubmitButton size="lg" disabled={!dirty} pendingText="Saving…">
          Save availability
        </SubmitButton>
        {dirty && (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="text-muted-foreground"
            onClick={() => setCells(initialCells)}
          >
            Reset
          </Button>
        )}
      </div>
    </form>
  )
}

function applyPreset(id: PresetId): Set<number> {
  return id === 'clear' ? new Set<number>() : presetCells(id)
}
