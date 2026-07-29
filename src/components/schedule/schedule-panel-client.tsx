'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CalendarPlus, Check, Clock, Download, MapPin, Video, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/kit/submit-button'
import {
  acceptProposal,
  declineProposal,
  proposeTimes,
  unscheduleChat,
  type ScheduleState,
} from './actions'
import { buildIcs, downloadIcs } from './ics'
import { formatZonedDateTime, zoneCityLabel, sameWallClock } from '@/lib/availability'
import { cn } from '@/lib/utils'
import type { ChatTimeProposal, LocationKind } from '@/lib/types'

const IDLE: ScheduleState = { status: 'idle' }
const DURATIONS = [15, 30, 45] as const

export function SchedulePanelClient({
  chatId,
  currentUserId,
  otherUserName,
  myZone,
  theirZone,
  scheduledAt,
  durationMinutes,
  locationKind,
  locationDetail,
  proposals,
  suggestions,
  hasMutualAvailability,
  hasOwnAvailability,
}: {
  chatId: string
  currentUserId: string
  otherUserName: string | null
  myZone: string
  theirZone: string
  scheduledAt: string | null
  durationMinutes: number
  locationKind: LocationKind
  locationDetail: string | null
  proposals: ChatTimeProposal[]
  suggestions: string[]
  hasMutualAvailability: boolean
  hasOwnAvailability: boolean
}) {
  const firstName = otherUserName?.trim().split(/\s+/)[0] ?? 'them'

  const [proposeState, proposeAction] = useActionState(proposeTimes, IDLE)
  const [acceptState, acceptAction] = useActionState(acceptProposal, IDLE)
  const [picked, setPicked] = useState<string[]>([])
  const [manual, setManual] = useState('')
  const [duration, setDuration] = useState<number>(durationMinutes)
  const [kind, setKind] = useState<LocationKind>(locationKind)
  const [detail, setDetail] = useState(locationDetail ?? '')

  useEffect(() => {
    for (const state of [proposeState, acceptState]) {
      if (state.status === 'success') toast.success(state.message)
      if (state.status === 'error') toast.error(state.message)
    }
  }, [proposeState, acceptState])

  const mine = proposals.filter((p) => p.proposed_by === currentUserId)
  const theirs = proposals.filter((p) => p.proposed_by !== currentUserId)

  /* --- Confirmed --------------------------------------------------------- */
  if (scheduledAt) {
    const start = new Date(scheduledAt)
    const showTheirTime = !sameWallClock(start, myZone, theirZone)

    return (
      <section className="surface space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="label-mono">Scheduled</h2>
          <span className="pill">
            {kind === 'in_person' ? (
              <MapPin className="size-3" aria-hidden />
            ) : (
              <Video className="size-3" aria-hidden />
            )}
            {kind === 'in_person' ? 'In person' : 'Virtual'}
          </span>
        </div>

        <p className="font-mono text-sm tabular tracking-tight">
          {formatZonedDateTime(start, myZone)}
        </p>

        {showTheirTime && (
          <p className="font-mono text-[11px] tabular text-muted-foreground">
            {formatZonedDateTime(start, theirZone)} for {firstName} ·{' '}
            {zoneCityLabel(theirZone)}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          {durationMinutes} minutes
          {locationDetail ? ` · ${locationDetail}` : ''}
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              downloadIcs(
                `coffee-with-${firstName.toLowerCase()}`,
                buildIcs({
                  uid: chatId,
                  start,
                  durationMinutes,
                  title: `Coffee with ${otherUserName ?? 'a colleague'}`,
                  description: 'Arranged through Watercooler.',
                  location: locationDetail ?? (kind === 'virtual' ? 'Virtual' : undefined),
                })
              )
            }
          >
            <Download className="size-3.5" />
            Add to calendar
          </Button>

          <form action={unscheduleChat}>
            <input type="hidden" name="chatId" value={chatId} />
            <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
              Reschedule
            </Button>
          </form>
        </div>
      </section>
    )
  }

  /* --- Not yet scheduled -------------------------------------------------- */
  const toggle = (iso: string) =>
    setPicked((current) =>
      current.includes(iso)
        ? current.filter((v) => v !== iso)
        : current.length >= 3
          ? current
          : [...current, iso]
    )

  return (
    <section className="surface space-y-4 p-4">
      <h2 className="label-mono">Find a time</h2>

      {theirs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {firstName} suggested {theirs.length === 1 ? 'a time' : 'these times'}:
          </p>

          {theirs.map((proposal) => {
            const start = new Date(proposal.start_at)
            return (
              <div
                key={proposal.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs tabular">
                    {formatZonedDateTime(start, myZone)}
                  </p>
                  {!sameWallClock(start, myZone, theirZone) && (
                    <p className="font-mono text-[10px] tabular text-muted-foreground">
                      {formatZonedDateTime(start, theirZone)} their time
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <form action={acceptAction}>
                    <input type="hidden" name="chatId" value={chatId} />
                    <input type="hidden" name="proposalId" value={proposal.id} />
                    <input type="hidden" name="durationMinutes" value={duration} />
                    <input type="hidden" name="locationKind" value={kind} />
                    <input type="hidden" name="locationDetail" value={detail} />
                    <SubmitButton size="sm" pendingText="…">
                      <Check className="size-3.5" />
                      Accept
                    </SubmitButton>
                  </form>

                  <form action={declineProposal}>
                    <input type="hidden" name="chatId" value={chatId} />
                    <input type="hidden" name="proposalId" value={proposal.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Decline this time"
                      className="text-muted-foreground"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {mine.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Waiting on {firstName}:</p>
          {mine.map((proposal) => (
            <p key={proposal.id} className="font-mono text-xs tabular text-muted-foreground">
              {formatZonedDateTime(new Date(proposal.start_at), myZone)}
            </p>
          ))}
        </div>
      )}

      <form action={proposeAction} className="space-y-3 border-t border-border pt-3">
        <input type="hidden" name="chatId" value={chatId} />
        {picked.map((iso) => (
          <input key={iso} type="hidden" name="start" value={iso} />
        ))}

        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            {suggestions.length > 0
              ? 'Times you are both free — pick up to three.'
              : hasMutualAvailability
                ? 'No overlap in the next two weeks. Pick a time manually.'
                : hasOwnAvailability
                  ? `${firstName} hasn't set availability yet. Pick a time manually.`
                  : 'Set your availability in settings to get suggestions.'}
          </p>

          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((iso) => {
                const selected = picked.includes(iso)
                return (
                  <button
                    key={iso}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggle(iso)}
                    className={cn(
                      'rounded-md border px-2 py-1 font-mono text-[11px] tabular transition-colors',
                      selected
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
                    )}
                  >
                    {formatZonedDateTime(new Date(iso), myZone)}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <label htmlFor="manual-time" className="label-mono">
              Or pick a time
            </label>
            <Input
              id="manual-time"
              type="datetime-local"
              value={manual}
              onChange={(event) => setManual(event.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={!manual}
            onClick={() => {
              const date = new Date(manual)
              if (Number.isNaN(date.getTime())) return
              toggle(date.toISOString())
              setManual('')
            }}
          >
            <CalendarPlus className="size-3.5" />
            Add
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <Clock className="size-3 text-muted-foreground" aria-hidden />
            {DURATIONS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={duration === value}
                onClick={() => setDuration(value)}
                className={cn(
                  'rounded-md border px-2 py-0.5 font-mono text-[11px] tabular transition-colors',
                  duration === value
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                {value}m
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            {(['virtual', 'in_person'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={kind === value}
                onClick={() => setKind(value)}
                className={cn(
                  'rounded-md border px-2 py-0.5 text-[11px] transition-colors',
                  kind === value
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                {value === 'virtual' ? 'Virtual' : 'In person'}
              </button>
            ))}
          </div>
        </div>

        <Input
          name="locationDetail"
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          placeholder={kind === 'virtual' ? 'Meeting link (optional)' : 'Where? (optional)'}
        />

        <SubmitButton
          size="lg"
          className="w-full"
          disabled={picked.length === 0}
          pendingText="Sending…"
        >
          {picked.length === 0
            ? 'Pick a time to send'
            : `Send ${picked.length} ${picked.length === 1 ? 'time' : 'times'}`}
        </SubmitButton>
      </form>
    </section>
  )
}
