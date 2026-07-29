'use client'

import { useActionState, useId, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Check, Mail } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/kit/submit-button'
import { cn } from '@/lib/utils'
import { signIn, signUp, type AuthActionState, type AuthField } from './actions'

export const MIN_PASSWORD_LENGTH = 8

const EMPTY_STATE: AuthActionState = {
  status: 'idle',
  formError: null,
  fieldErrors: {},
  values: { fullName: '', email: '' },
}

/* ---------------------------------------------------------------------------
 * Field primitives
 * ------------------------------------------------------------------------- */

function FieldError({ id, message }: { id: string; message?: string }) {
  // The region is always mounted so the message announces on change instead of
  // on insert, and so the row below the input never jumps into existence.
  return (
    <p
      id={id}
      role="alert"
      className={cn(
        'text-[12px] leading-4 text-destructive transition-opacity duration-150',
        message ? 'opacity-100' : 'opacity-0'
      )}
    >
      {message ?? ' '}
    </p>
  )
}

function TextField({
  label,
  name,
  error,
  hint,
  ...props
}: React.ComponentProps<typeof Input> & {
  label: string
  name: AuthField
  error?: string
  hint?: string
}) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium tracking-tight">
          {label}
        </label>
        {hint && <span className="text-[12px] text-muted-foreground">{hint}</span>}
      </div>
      <Input
        id={id}
        name={name}
        className="h-9"
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={errorId}
        {...props}
      />
      <FieldError id={errorId} message={error} />
    </div>
  )
}

function PasswordField({
  label,
  value,
  onValueChange,
  error,
  autoComplete,
  hint,
  describedBy,
  autoFocus,
}: {
  label: string
  value: string
  onValueChange: (next: string) => void
  error?: string
  autoComplete: 'current-password' | 'new-password'
  hint?: React.ReactNode
  describedBy?: string
  autoFocus?: boolean
}) {
  const id = useId()
  const errorId = `${id}-error`
  const [visible, setVisible] = useState(false)

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium tracking-tight">
          {label}
        </label>
        {hint}
      </div>
      <div className="relative">
        <Input
          id={id}
          name="password"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          className="h-9 pr-9"
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy ? `${errorId} ${describedBy}` : errorId}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  )
}

function FormAlert({ message }: { message: string | null }) {
  if (!message) return null

  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive-subtle px-3 py-2 text-[13px] leading-snug text-destructive"
    >
      {message}
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Shared chrome
 * ------------------------------------------------------------------------- */

function FormHeading({ eyebrow, title, lede }: { eyebrow: string; title: string; lede: string }) {
  return (
    <div className="space-y-2">
      <p className="label-mono">{eyebrow}</p>
      <h1 className="text-[26px] font-semibold tracking-[-0.035em]">{title}</h1>
      <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{lede}</p>
    </div>
  )
}

function SwapLink({ prompt, href, label }: { prompt: string; href: string; label: string }) {
  return (
    <p className="text-[13px] text-muted-foreground">
      {prompt}{' '}
      <Link
        href={href}
        className="font-medium text-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-foreground"
      >
        {label}
      </Link>
    </p>
  )
}

/* ---------------------------------------------------------------------------
 * Login
 * ------------------------------------------------------------------------- */

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, formAction] = useActionState(signIn, EMPTY_STATE)
  const [password, setPassword] = useState('')

  return (
    <div className="space-y-7">
      <FormHeading
        eyebrow="Sign in"
        title="Welcome back"
        lede="Pick up where you left off — new matches are waiting."
      />

      <form action={formAction} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />

        <FormAlert message={notice ?? state.formError} />

        <TextField
          label="Work email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          placeholder="you@company.com"
          defaultValue={state.values.email}
          error={state.fieldErrors.email}
        />

        <PasswordField
          label="Password"
          value={password}
          onValueChange={setPassword}
          autoComplete="current-password"
          error={state.fieldErrors.password}
        />

        <SubmitButton size="lg" className="h-9 w-full" pendingText="Signing in">
          Sign in
        </SubmitButton>
      </form>

      <SwapLink prompt="New here?" href="/signup" label="Create an account" />
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Signup
 * ------------------------------------------------------------------------- */

const STRENGTH_LABELS = ['Too short', 'Weak', 'Fair', 'Strong'] as const

function passwordScore(value: string): 0 | 1 | 2 | 3 {
  if (value.length < MIN_PASSWORD_LENGTH) return 0
  let score = 1
  if (value.length >= 12) score += 1
  if (/[a-zA-Z]/.test(value) && /[^a-zA-Z]/.test(value)) score += 1
  return Math.min(score, 3) as 0 | 1 | 2 | 3
}

function PasswordMeter({ value, id }: { value: string; id: string }) {
  const score = passwordScore(value)
  const longEnough = value.length >= MIN_PASSWORD_LENGTH

  return (
    <div id={id} className="space-y-2 pt-0.5">
      <div className="flex items-center gap-2">
        <div className="flex gap-1" aria-hidden>
          {[1, 2, 3].map((step) => (
            <span
              key={step}
              className={cn(
                'h-[3px] w-8 rounded-full transition-colors duration-200',
                score >= step ? 'bg-foreground' : 'bg-border-strong'
              )}
            />
          ))}
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {value.length === 0 ? 'Strength' : STRENGTH_LABELS[score]}
        </span>
      </div>
      <p className="flex items-center gap-1.5 text-[12px] leading-4 text-muted-foreground">
        <Check
          className={cn(
            'size-3 shrink-0 transition-colors',
            longEnough ? 'text-foreground' : 'text-border-strong'
          )}
          aria-hidden
        />
        <span className={cn(longEnough && 'text-foreground')}>
          {MIN_PASSWORD_LENGTH} characters minimum
        </span>
        <span aria-hidden className="text-border-strong">
          ·
        </span>
        <span>a number or symbol makes it stronger</span>
      </p>
    </div>
  )
}

function CheckEmail({ email }: { email: string }) {
  return (
    <div className="space-y-7">
      <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
        <Mail className="size-[18px]" aria-hidden />
      </div>
      <div className="space-y-2">
        <p className="label-mono">One more step</p>
        <h1 className="text-[26px] font-semibold tracking-[-0.035em]">Check your inbox</h1>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          We sent a confirmation link to{' '}
          <span className="font-medium text-foreground">{email}</span>. Open it and we&rsquo;ll
          take you straight to setting up your profile.
        </p>
      </div>
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        Nothing after a minute or two? Check spam, or{' '}
        <Link
          href="/signup"
          className="font-medium text-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-foreground"
        >
          try a different address
        </Link>
        .
      </p>
    </div>
  )
}

export function SignupForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(signUp, EMPTY_STATE)
  const [password, setPassword] = useState('')
  const meterId = useId()

  if (state.status === 'check_email') {
    return <CheckEmail email={state.values.email} />
  }

  return (
    <div className="space-y-7">
      <FormHeading
        eyebrow="Create account"
        title="Meet the coworker you keep missing"
        lede="Two minutes of setup, then we start matching you on what you actually care about."
      />

      <form action={formAction} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />

        <FormAlert message={state.formError} />

        <TextField
          label="Full name"
          name="fullName"
          type="text"
          autoComplete="name"
          autoFocus
          placeholder="Ada Lovelace"
          maxLength={80}
          defaultValue={state.values.fullName}
          error={state.fieldErrors.fullName}
        />

        <TextField
          label="Work email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@company.com"
          defaultValue={state.values.email}
          error={state.fieldErrors.email}
        />

        <PasswordField
          label="Password"
          value={password}
          onValueChange={setPassword}
          autoComplete="new-password"
          error={state.fieldErrors.password}
          describedBy={meterId}
        />

        <PasswordMeter value={password} id={meterId} />

        <SubmitButton size="lg" className="h-9 w-full" pendingText="Creating account">
          Create account
        </SubmitButton>
      </form>

      <SwapLink prompt="Already have an account?" href="/login" label="Sign in" />
    </div>
  )
}
