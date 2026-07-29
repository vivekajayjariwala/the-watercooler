'use client'

import { useId, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

/* ---------------------------------------------------------------------------
 * Shared field chrome
 * ------------------------------------------------------------------------- */

/**
 * Always mounted, even when empty — an error row that appears from nothing
 * shoves the rest of the step down, and the wizard promises no layout shift.
 */
export function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <p
      id={id}
      role="alert"
      className={cn(
        'text-[12px] leading-4 text-destructive transition-opacity duration-150',
        message ? 'opacity-100' : 'opacity-0'
      )}
    >
      {message ?? ' '}
    </p>
  )
}

export function TextField({
  label,
  value,
  onValueChange,
  error,
  optional,
  placeholder,
  autoComplete,
  autoFocus,
  maxLength = 120,
}: {
  label: string
  value: string
  onValueChange: (next: string) => void
  error?: string
  optional?: boolean
  placeholder?: string
  autoComplete?: string
  autoFocus?: boolean
  maxLength?: number
}) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium tracking-tight">
          {label}
        </label>
        {optional && <span className="label-mono">Optional</span>}
      </div>
      <Input
        id={id}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        maxLength={maxLength}
        className="h-9"
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={errorId}
      />
      <FieldError id={errorId} message={error} />
    </div>
  )
}

/**
 * A prose prompt. The question is the label, the smaller line under it is the
 * nudge that gets people past "I work on the platform team".
 */
export function ProseField({
  label,
  hint,
  value,
  onValueChange,
  error,
  optional,
  placeholder,
  minLength,
  maxLength = 600,
  rows = 4,
}: {
  label: string
  hint: string
  value: string
  onValueChange: (next: string) => void
  error?: string
  optional?: boolean
  placeholder?: string
  minLength?: number
  maxLength?: number
  rows?: number
}) {
  const id = useId()
  const errorId = `${id}-error`
  const count = value.trim().length
  const met = minLength === undefined || count >= minLength

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium tracking-tight">
          {label}
        </label>
        {optional && <span className="label-mono">Optional</span>}
      </div>
      <p className="text-[12px] leading-relaxed text-muted-foreground text-pretty">{hint}</p>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className="min-h-[92px] resize-none leading-relaxed"
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={errorId}
      />
      <div className="flex items-baseline justify-between gap-3">
        <FieldError id={errorId} message={error} />
        <span
          aria-hidden
          className={cn(
            'shrink-0 font-mono text-[10px] tabular tracking-tight tabular-nums',
            met ? 'text-muted-foreground' : 'text-border-strong'
          )}
        >
          {minLength !== undefined && !met ? `${count} / ${minLength}` : `${count}`}
        </span>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Toggle chip — a real button, so it is reachable and announces its state.
 * ------------------------------------------------------------------------- */

export function ToggleChip({
  label,
  emoji,
  selected,
  onToggle,
}: {
  label: string
  emoji?: string | null
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      // Checkbox, not toggle button: these are picked several at a time out of
      // a list. `aria-pressed` is not defined on role=checkbox, and stating
      // the same thing twice is how the two end up disagreeing.
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors duration-150',
        selected
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-muted text-muted-foreground hover:border-border-strong hover:text-foreground'
      )}
    >
      {emoji && (
        <span aria-hidden className="text-[11px] leading-none">
          {emoji}
        </span>
      )}
      {label}
    </button>
  )
}

/* ---------------------------------------------------------------------------
 * Segmented control — radiogroup semantics, arrow-key roving focus.
 * ------------------------------------------------------------------------- */

export function Segmented<T extends string>({
  label,
  options,
  value,
  onValueChange,
  error,
}: {
  label: string
  options: ReadonlyArray<{ value: T; label: string; caption: string }>
  value: T
  onValueChange: (next: T) => void
  error?: string
}) {
  const id = useId()
  const errorId = `${id}-error`
  const listRef = useRef<HTMLDivElement>(null)

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (delta === 0) return

    event.preventDefault()
    const index = options.findIndex((option) => option.value === value)
    const nextIndex = (index + delta + options.length) % options.length
    onValueChange(options[nextIndex].value)

    const buttons = listRef.current?.querySelectorAll('button')
    buttons?.[nextIndex]?.focus()
  }

  return (
    <div className="space-y-2">
      <p id={id} className="text-[13px] font-medium tracking-tight">
        {label}
      </p>
      <div
        ref={listRef}
        role="radiogroup"
        aria-labelledby={id}
        aria-describedby={errorId}
        onKeyDown={onKeyDown}
        className="grid gap-1 rounded-lg border border-border bg-muted p-1 sm:grid-cols-3"
      >
        {options.map((option) => {
          const selected = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onValueChange(option.value)}
              className={cn(
                'rounded-md border px-3 py-2 text-left transition-colors duration-150',
                selected
                  ? 'border-border-strong bg-background'
                  : 'border-transparent hover:bg-background/60'
              )}
            >
              <span
                className={cn(
                  'block text-[13px] font-medium tracking-tight',
                  selected ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {option.label}
              </span>
              <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">
                {option.caption}
              </span>
            </button>
          )
        })}
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Switch row
 * ------------------------------------------------------------------------- */

export function SwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string
  description: string
  checked: boolean
  onCheckedChange: (next: boolean) => void
}) {
  const id = useId()

  return (
    <div className="surface flex items-start justify-between gap-4 px-3.5 py-3">
      <div className="min-w-0">
        <p id={id} className="text-[13px] font-medium tracking-tight">
          {label}
        </p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground text-pretty">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors duration-200',
          checked ? 'border-foreground bg-foreground' : 'border-border-strong bg-muted'
        )}
      >
        <span
          aria-hidden
          className={cn(
            'absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full transition-[left] duration-200',
            checked ? 'left-[18px] bg-background' : 'left-[2px] bg-border-strong'
          )}
        />
      </button>
    </div>
  )
}
