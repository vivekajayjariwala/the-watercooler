'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/kit/submit-button'
import { InterestTag } from '@/components/kit/interest-tag'
import { cn } from '@/lib/utils'
import type { ChatPreference, Interest, InterestCategory } from '@/lib/types'
import {
  completeOnboarding,
  type OnboardingActionState,
  type OnboardingField,
} from './actions'
import { ProseField, Segmented, SwitchRow, TextField, ToggleChip } from './fields'

/* ---------------------------------------------------------------------------
 * Draft
 * ------------------------------------------------------------------------- */

export interface OnboardingDraft {
  fullName: string
  headline: string
  department: string
  location: string
  pronouns: string
  interestIds: string[]
  bio: string
  workingOn: string
  curiousAbout: string
  funFact: string
  chatPreference: ChatPreference
  openToMatching: boolean
}

const EMPTY_STATE: OnboardingActionState = {
  status: 'idle',
  formError: null,
  fieldErrors: {},
  errorStep: null,
}

/** Mirrors the server. The server still decides — this only saves a round trip. */
const MIN_INTERESTS = 3
const MIN_PROSE = 40

const STEPS = [
  { title: 'Identity', caption: 'Who shows up on the card' },
  { title: 'Your interests', caption: 'The overlap we can point at' },
  { title: 'In your words', caption: 'What the matching actually reads' },
  { title: 'Preferences', caption: 'How you like to meet' },
] as const

const CATEGORY_ORDER: InterestCategory[] = ['craft', 'topic', 'hobby', 'lifestyle']

const CATEGORY_LABEL: Record<InterestCategory, string> = {
  craft: 'Craft',
  topic: 'Topics',
  hobby: 'Hobbies',
  lifestyle: 'Life',
}

const CHAT_OPTIONS = [
  { value: 'virtual' as const, label: 'Virtual', caption: 'A call works fine' },
  { value: 'in_person' as const, label: 'In person', caption: 'Same building, real coffee' },
  { value: 'either' as const, label: 'Either', caption: 'Whatever suits them' },
]

/* ---------------------------------------------------------------------------
 * Draft persistence
 *
 * sessionStorage, not localStorage: a mid-wizard refresh should restore, but a
 * draft from three weeks ago shouldn't quietly override the profile row.
 * ------------------------------------------------------------------------- */

function reviveDraft(base: OnboardingDraft, raw: unknown): OnboardingDraft {
  if (!raw || typeof raw !== 'object') return base
  const value = raw as Record<string, unknown>
  const str = (key: keyof OnboardingDraft, fallback: string) =>
    typeof value[key] === 'string' ? (value[key] as string) : fallback

  return {
    fullName: str('fullName', base.fullName),
    headline: str('headline', base.headline),
    department: str('department', base.department),
    location: str('location', base.location),
    pronouns: str('pronouns', base.pronouns),
    interestIds: Array.isArray(value.interestIds)
      ? value.interestIds.filter((id): id is string => typeof id === 'string')
      : base.interestIds,
    bio: str('bio', base.bio),
    workingOn: str('workingOn', base.workingOn),
    curiousAbout: str('curiousAbout', base.curiousAbout),
    funFact: str('funFact', base.funFact),
    chatPreference: (['virtual', 'in_person', 'either'] as const).includes(
      value.chatPreference as ChatPreference
    )
      ? (value.chatPreference as ChatPreference)
      : base.chatPreference,
    openToMatching:
      typeof value.openToMatching === 'boolean' ? value.openToMatching : base.openToMatching,
  }
}

/* ---------------------------------------------------------------------------
 * Client-side step gate
 * ------------------------------------------------------------------------- */

function validateStep(
  step: number,
  draft: OnboardingDraft
): Partial<Record<OnboardingField, string>> {
  const errors: Partial<Record<OnboardingField, string>> = {}

  if (step === 0) {
    if (!draft.fullName.trim()) errors.fullName = 'People need a name to recognise.'
    if (!draft.headline.trim()) {
      errors.headline = 'A role gives your matches somewhere to start.'
    }
  }

  if (step === 1 && draft.interestIds.length < MIN_INTERESTS) {
    errors.interests = `Pick at least ${MIN_INTERESTS} — overlap is what makes a first conversation easy.`
  }

  if (step === 2) {
    if (draft.workingOn.trim().length < MIN_PROSE) {
      errors.workingOn = `A sentence or two, please — ${MIN_PROSE} characters minimum.`
    }
    if (draft.curiousAbout.trim().length < MIN_PROSE) {
      errors.curiousAbout = `A sentence or two, please — ${MIN_PROSE} characters minimum.`
    }
  }

  return errors
}

/* ---------------------------------------------------------------------------
 * Wizard
 * ------------------------------------------------------------------------- */

export function Wizard({
  userId,
  interests,
  initial,
}: {
  userId: string
  interests: Interest[]
  initial: OnboardingDraft
}) {
  const [state, formAction] = useActionState(completeOnboarding, EMPTY_STATE)
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<OnboardingDraft>(initial)
  const [localErrors, setLocalErrors] = useState<Partial<Record<OnboardingField, string>>>({})
  const [timezone, setTimezone] = useState('')
  const [restored, setRestored] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const storageKey = `watercooler:onboarding:${userId}`

  // Restore a draft left behind by a refresh.
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as { draft?: unknown; step?: unknown }
        setDraft((current) => reviveDraft(current, parsed.draft))
        if (typeof parsed.step === 'number') {
          setStep(Math.min(Math.max(Math.trunc(parsed.step), 0), STEPS.length - 1))
        }
      }
    } catch {
      // A corrupt draft is not worth blocking onboarding over.
    }
    setRestored(true)
  }, [storageKey])

  useEffect(() => {
    if (!restored) return
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify({ draft, step }))
    } catch {
      // Private mode / quota. The wizard still works, it just won't survive F5.
    }
  }, [draft, step, restored, storageKey])

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone ?? '')
  }, [])

  // The server found something the client missed — take the person to it.
  useEffect(() => {
    if (state.status === 'error' && state.errorStep !== null) {
      setStep(state.errorStep)
    }
  }, [state])

  const errors = useMemo(
    () => ({ ...state.fieldErrors, ...localErrors }),
    [state.fieldErrors, localErrors]
  )

  function update<K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    setLocalErrors((current) => {
      if (!(key in current)) return current
      const next = { ...current }
      delete next[key as OnboardingField]
      return next
    })
  }

  function toggleInterest(id: string) {
    setDraft((current) => ({
      ...current,
      interestIds: current.interestIds.includes(id)
        ? current.interestIds.filter((existing) => existing !== id)
        : [...current.interestIds, id],
    }))
    setLocalErrors((current) => {
      if (!current.interests) return current
      const next = { ...current }
      delete next.interests
      return next
    })
  }

  function focusStepHeading() {
    // Move the reading position to the new step without stealing a tab stop.
    requestAnimationFrame(() => headingRef.current?.focus())
  }

  function goNext() {
    const stepErrors = validateStep(step, draft)
    if (Object.keys(stepErrors).length > 0) {
      setLocalErrors((current) => ({ ...current, ...stepErrors }))
      return
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1))
    focusStepHeading()
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 0))
    focusStepHeading()
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    if (event.key !== 'Enter') return
    const target = event.target as HTMLElement
    if (target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') return
    if (step === STEPS.length - 1) return

    event.preventDefault()
    goNext()
  }

  const grouped = useMemo(() => {
    return CATEGORY_ORDER.map((category) => ({
      category,
      items: interests.filter((interest) => interest.category === category),
    })).filter((group) => group.items.length > 0)
  }, [interests])

  const selected = useMemo(
    () => interests.filter((interest) => draft.interestIds.includes(interest.id)),
    [interests, draft.interestIds]
  )

  const isLast = step === STEPS.length - 1
  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <form action={formAction} onKeyDown={onKeyDown} className="w-full">
      {/* --- Everything the action reads, in one place ------------------- */}
      <input type="hidden" name="fullName" value={draft.fullName} />
      <input type="hidden" name="headline" value={draft.headline} />
      <input type="hidden" name="department" value={draft.department} />
      <input type="hidden" name="location" value={draft.location} />
      <input type="hidden" name="pronouns" value={draft.pronouns} />
      <input type="hidden" name="bio" value={draft.bio} />
      <input type="hidden" name="workingOn" value={draft.workingOn} />
      <input type="hidden" name="curiousAbout" value={draft.curiousAbout} />
      <input type="hidden" name="funFact" value={draft.funFact} />
      <input type="hidden" name="chatPreference" value={draft.chatPreference} />
      <input type="hidden" name="openToMatching" value={String(draft.openToMatching)} />
      <input type="hidden" name="timezone" value={timezone} />
      {draft.interestIds.map((id) => (
        <input key={id} type="hidden" name="interests" value={id} />
      ))}

      {/* --- Progress ---------------------------------------------------- */}
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-[13px] font-medium tracking-tight">
            {STEPS[step].title}
            <span className="ml-2 font-normal text-muted-foreground">{STEPS[step].caption}</span>
          </p>
          <p className="shrink-0 font-mono text-[11px] font-medium tabular tracking-tight text-foreground">
            {String(step + 1).padStart(2, '0')}
            <span className="mx-1 text-border-strong">/</span>
            <span className="text-muted-foreground">
              {String(STEPS.length).padStart(2, '0')}
            </span>
          </p>
        </div>
        <div
          className="mt-3 h-px w-full bg-border"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          aria-label="Onboarding progress"
        >
          <div
            className="h-px bg-foreground transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* --- Step body --------------------------------------------------- */}
      <div className="pt-8 sm:min-h-[440px]">
        {state.formError && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-destructive/40 bg-destructive-subtle px-3 py-2 text-[13px] leading-snug text-destructive"
          >
            {state.formError}
          </div>
        )}

        {step === 0 && (
          <StepIdentity
            headingRef={headingRef}
            draft={draft}
            errors={errors}
            update={update}
          />
        )}

        {step === 1 && (
          <StepInterests
            headingRef={headingRef}
            grouped={grouped}
            selectedIds={draft.interestIds}
            error={errors.interests}
            onToggle={toggleInterest}
          />
        )}

        {step === 2 && (
          <StepWords headingRef={headingRef} draft={draft} errors={errors} update={update} />
        )}

        {step === 3 && (
          <StepPreferences
            headingRef={headingRef}
            draft={draft}
            errors={errors}
            update={update}
            selected={selected}
          />
        )}
      </div>

      {/* --- Nav --------------------------------------------------------- */}
      <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={goBack}
          disabled={step === 0}
          className="h-9 text-muted-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Back
        </Button>

        {isLast ? (
          <SubmitButton size="lg" className="h-9 px-4" pendingText="Building your matches">
            Finish setup
          </SubmitButton>
        ) : (
          <Button type="button" size="lg" onClick={goNext} className="h-9 px-4">
            Continue
            <ArrowRight className="size-3.5" aria-hidden />
          </Button>
        )}
      </div>
    </form>
  )
}

/* ---------------------------------------------------------------------------
 * Step chrome
 * ------------------------------------------------------------------------- */

type HeadingRef = React.RefObject<HTMLHeadingElement | null>

function StepHeading({
  headingRef,
  title,
  lede,
}: {
  headingRef: HeadingRef
  title: string
  lede: string
}) {
  return (
    <div className="mb-6 space-y-1.5">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-[22px] font-semibold tracking-[-0.03em] outline-none"
      >
        {title}
      </h2>
      <p className="max-w-[52ch] text-sm leading-relaxed text-muted-foreground text-pretty">
        {lede}
      </p>
    </div>
  )
}

/* --- 01 Identity ---------------------------------------------------------- */

function StepIdentity({
  headingRef,
  draft,
  errors,
  update,
}: {
  headingRef: HeadingRef
  draft: OnboardingDraft
  errors: Partial<Record<OnboardingField, string>>
  update: <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => void
}) {
  return (
    <div>
      <StepHeading
        headingRef={headingRef}
        title="Start with the basics"
        lede="This is the top line of your card — enough for someone to place you before they read a word of the rest."
      />

      <div className="space-y-4">
        <TextField
          label="Full name"
          value={draft.fullName}
          onValueChange={(value) => update('fullName', value)}
          error={errors.fullName}
          autoComplete="name"
          autoFocus
          placeholder="Ada Lovelace"
        />

        <TextField
          label="What you do"
          value={draft.headline}
          onValueChange={(value) => update('headline', value)}
          error={errors.headline}
          autoComplete="organization-title"
          placeholder="Staff Design Engineer"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Team"
            value={draft.department}
            onValueChange={(value) => update('department', value)}
            error={errors.department}
            optional
            placeholder="Design Systems"
          />
          <TextField
            label="Where you are"
            value={draft.location}
            onValueChange={(value) => update('location', value)}
            error={errors.location}
            optional
            autoComplete="address-level2"
            placeholder="Toronto, ON"
          />
        </div>

        <TextField
          label="Pronouns"
          value={draft.pronouns}
          onValueChange={(value) => update('pronouns', value)}
          error={errors.pronouns}
          optional
          maxLength={40}
          placeholder="she/her"
        />
      </div>
    </div>
  )
}

/* --- 02 Interests --------------------------------------------------------- */

function StepInterests({
  headingRef,
  grouped,
  selectedIds,
  error,
  onToggle,
}: {
  headingRef: HeadingRef
  grouped: { category: InterestCategory; items: Interest[] }[]
  selectedIds: string[]
  error?: string
  onToggle: (id: string) => void
}) {
  const count = selectedIds.length
  const met = count >= MIN_INTERESTS

  return (
    <div>
      <StepHeading
        headingRef={headingRef}
        title="Pick what you'd actually talk about"
        lede="These are the concrete hooks a match can point at — “you both like typography” beats “you scored 84%” every time. Three is the floor, seven or eight is a good profile."
      />

      <div
        className="mb-5 flex items-baseline justify-between gap-4 border-b border-border pb-3"
        aria-live="polite"
      >
        <p className="label-mono">Selected</p>
        <p
          className={cn(
            'font-mono text-[11px] font-medium tabular tracking-tight',
            met ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {count}
          <span className="mx-1 text-border-strong">/</span>
          <span className="text-muted-foreground">{MIN_INTERESTS} minimum</span>
        </p>
      </div>

      <div className="space-y-6">
        {grouped.map((group) => (
          <fieldset key={group.category}>
            <legend className="label-mono mb-2.5">{CATEGORY_LABEL[group.category]}</legend>
            <div className="flex flex-wrap gap-1.5">
              {group.items.map((interest) => (
                <ToggleChip
                  key={interest.id}
                  label={interest.name}
                  emoji={interest.emoji}
                  selected={selectedIds.includes(interest.id)}
                  onToggle={() => onToggle(interest.id)}
                />
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <p
        role="alert"
        className={cn(
          'mt-5 text-[12px] leading-4 text-destructive transition-opacity duration-150',
          error ? 'opacity-100' : 'opacity-0'
        )}
      >
        {error ?? ' '}
      </p>
    </div>
  )
}

/* --- 03 In your words ----------------------------------------------------- */

function StepWords({
  headingRef,
  draft,
  errors,
  update,
}: {
  headingRef: HeadingRef
  draft: OnboardingDraft
  errors: Partial<Record<OnboardingField, string>>
  update: <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => void
}) {
  return (
    <div>
      <StepHeading
        headingRef={headingRef}
        title="Now the part that does the work"
        lede="Everything below is read by the model that ranks your matches. Specifics beat adjectives: “migrating a 900-component library off Sass” finds someone; “passionate about design” finds nobody."
      />

      <div className="space-y-5">
        <ProseField
          label="What are you actually working on right now?"
          hint="The real thing on your screen this week, not your job description."
          value={draft.workingOn}
          onValueChange={(value) => update('workingOn', value)}
          error={errors.workingOn}
          minLength={MIN_PROSE}
          placeholder="Rewriting our design tokens so light and dark stop drifting apart. Mostly fighting with our old Sass variables."
        />

        <ProseField
          label="What do you want to learn from someone else here?"
          hint="A question you'd genuinely ask a stranger over coffee."
          value={draft.curiousAbout}
          onValueChange={(value) => update('curiousAbout', value)}
          error={errors.curiousAbout}
          minLength={MIN_PROSE}
          placeholder="How teams keep a component library honest once four squads are shipping into it."
        />

        <ProseField
          label="Anything else worth knowing about you?"
          hint="Background, a strong opinion, the thing you'd rather be doing."
          value={draft.bio}
          onValueChange={(value) => update('bio', value)}
          error={errors.bio}
          optional
          rows={3}
          placeholder="Came in through print design. Still think kerning is a moral issue."
        />

        <ProseField
          label="One fun fact"
          hint="The line that makes the first two minutes easy."
          value={draft.funFact}
          onValueChange={(value) => update('funFact', value)}
          error={errors.funFact}
          optional
          rows={2}
          maxLength={240}
          placeholder="I've hiked every trail in the park by my house — twice, in the wrong shoes."
        />
      </div>
    </div>
  )
}

/* --- 04 Preferences + review --------------------------------------------- */

function StepPreferences({
  headingRef,
  draft,
  errors,
  update,
  selected,
}: {
  headingRef: HeadingRef
  draft: OnboardingDraft
  errors: Partial<Record<OnboardingField, string>>
  update: <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => void
  selected: Interest[]
}) {
  return (
    <div>
      <StepHeading
        headingRef={headingRef}
        title="Last thing, then we'll go find people"
        lede="Both of these are yours to change any time from Settings."
      />

      <div className="space-y-5">
        <Segmented
          label="How do you like to meet?"
          options={CHAT_OPTIONS}
          value={draft.chatPreference}
          onValueChange={(value) => update('chatPreference', value)}
          error={errors.chatPreference}
        />

        <SwitchRow
          label="Show me in discovery"
          description="Turn this off and you keep your profile but stop appearing in other people's matches."
          checked={draft.openToMatching}
          onCheckedChange={(value) => update('openToMatching', value)}
        />

        {/* --- Review --- */}
        <div className="pt-1">
          <p className="label-mono mb-2.5">Before you finish</p>
          <dl className="surface divide-y divide-border text-sm">
            <ReviewRow label="Name" value={draft.fullName} />
            <ReviewRow
              label="Role"
              value={[draft.headline, draft.department].filter(Boolean).join(' · ')}
            />
            <ReviewRow label="Location" value={draft.location} />
            <div className="grid gap-1 px-3.5 py-2.5 sm:grid-cols-[110px_1fr] sm:gap-4">
              <dt className="label-mono sm:pt-1">Interests</dt>
              <dd className="flex flex-wrap gap-1.5">
                {selected.length > 0 ? (
                  selected.map((interest) => (
                    <InterestTag key={interest.id} name={interest.name} emoji={interest.emoji} />
                  ))
                ) : (
                  <span className="text-muted-foreground">None selected</span>
                )}
              </dd>
            </div>
            <ReviewRow label="Working on" value={draft.workingOn} clamp />
            <ReviewRow label="Curious about" value={draft.curiousAbout} clamp />
          </dl>
        </div>
      </div>
    </div>
  )
}

function ReviewRow({
  label,
  value,
  clamp = false,
}: {
  label: string
  value: string
  clamp?: boolean
}) {
  return (
    <div className="grid gap-1 px-3.5 py-2.5 sm:grid-cols-[110px_1fr] sm:gap-4">
      <dt className="label-mono sm:pt-0.5">{label}</dt>
      <dd
        className={cn(
          'text-[13px] leading-relaxed text-pretty',
          clamp && 'line-clamp-2',
          value ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        {value || '—'}
      </dd>
    </div>
  )
}
