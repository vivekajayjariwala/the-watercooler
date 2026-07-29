'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { SubmitButton } from '@/components/kit/submit-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  deleteAccount,
  updateMatchingSettings,
  updateTimezone,
  type SettingsState,
} from '@/app/(app)/settings/actions'
import { useHydrated } from '@/lib/use-hydrated'
import { cn } from '@/lib/utils'
import type { ChatPreference } from '@/lib/types'

const IDLE: SettingsState = { status: 'idle' }

function useToastOn(state: SettingsState) {
  useEffect(() => {
    if (state.status === 'success') toast.success(state.message)
    if (state.status === 'error') toast.error(state.message)
  }, [state])
}

/* --- Matching -------------------------------------------------------------- */

export function MatchingSettings({
  openToMatching,
  chatPreference,
}: {
  openToMatching: boolean
  chatPreference: ChatPreference
}) {
  const [state, action] = useActionState(updateMatchingSettings, IDLE)
  const [open, setOpen] = useState(openToMatching)
  const [preference, setPreference] = useState<ChatPreference>(chatPreference)
  useToastOn(state)

  return (
    <form action={action} className="space-y-5">
      <label className="flex cursor-pointer items-start justify-between gap-4">
        <span>
          <span className="text-sm font-medium">Open to matching</span>
          <span className="mt-1 block text-xs text-muted-foreground text-pretty">
            When this is off you disappear from discovery and nobody new can ask you for a
            coffee. Conversations you already have carry on as normal.
          </span>
        </span>

        <input
          type="checkbox"
          name="openToMatching"
          checked={open}
          onChange={(event) => setOpen(event.target.checked)}
          className="sr-only"
        />
        <span
          aria-hidden
          className={cn(
            'relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors',
            open ? 'border-foreground bg-foreground' : 'border-border bg-muted'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 size-3.5 rounded-full transition-transform',
              open ? 'translate-x-[1.125rem] bg-background' : 'translate-x-0.5 bg-background'
            )}
          />
        </span>
      </label>

      <div className="space-y-2">
        <p className="text-sm font-medium">Preferred format</p>
        <input type="hidden" name="chatPreference" value={preference} />
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { value: 'virtual', label: 'Virtual' },
              { value: 'in_person', label: 'In person' },
              { value: 'either', label: 'Either' },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={preference === option.value}
              onClick={() => setPreference(option.value)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                preference === option.value
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <SubmitButton size="lg" pendingText="Saving…">
        Save
      </SubmitButton>
    </form>
  )
}

/* --- Timezone -------------------------------------------------------------- */

export function TimezoneSettings({ timezone }: { timezone: string }) {
  const [state, action] = useActionState(updateTimezone, IDLE)
  useToastOn(state)

  const zones = useMemo(() => {
    try {
      return Intl.supportedValuesOf('timeZone')
    } catch {
      return [timezone, 'UTC']
    }
  }, [timezone])

  const detected = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      return null
    }
  }, [])

  const [value, setValue] = useState(timezone)

  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="timezone" className="text-sm font-medium">
          Timezone
        </label>
        <p className="text-xs text-muted-foreground">
          Used for every time shown to you, and to work out when you and someone else are
          both free.
        </p>
        <select
          id="timezone"
          name="timezone"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-8 w-full max-w-sm rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {detected && detected !== value && (
        <button
          type="button"
          onClick={() => setValue(detected)}
          className="text-xs text-muted-foreground underline transition-colors hover:text-foreground"
        >
          Use detected zone ({detected.replace(/_/g, ' ')})
        </button>
      )}

      <SubmitButton size="lg" pendingText="Saving…">
        Save timezone
      </SubmitButton>
    </form>
  )
}

/* --- Appearance ------------------------------------------------------------ */

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme()
  // Until hydration, no option is marked active — the server can't know which.
  const hydrated = useHydrated()

  const options = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ] as const

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Theme</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = hydrated && theme === option.value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => setTheme(option.value)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* --- Danger zone ----------------------------------------------------------- */

const CONFIRM_PHRASE = 'delete my account'

export function DangerZone() {
  const [state, action] = useActionState(deleteAccount, IDLE)
  const [confirm, setConfirm] = useState('')
  useToastOn(state)

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="destructive" size="lg">
            Delete account
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account</DialogTitle>
          <DialogDescription>
            This removes your profile, interests, chats, and messages. It cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="confirm" className="text-xs text-muted-foreground">
              Type <span className="font-mono text-foreground">{CONFIRM_PHRASE}</span> to
              confirm
            </label>
            <Input
              id="confirm"
              name="confirm"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="flex justify-end gap-2">
            <DialogClose
              render={
                <Button type="button" variant="outline" size="lg">
                  Cancel
                </Button>
              }
            />
            <SubmitButton
              variant="destructive"
              size="lg"
              disabled={confirm.trim() !== CONFIRM_PHRASE}
              pendingText="…"
            >
              Delete account
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
