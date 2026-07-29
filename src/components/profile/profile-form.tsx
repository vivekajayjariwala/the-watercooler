'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { SubmitButton } from '@/components/kit/submit-button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AvatarField } from './avatar-field'
import { updateProfile } from '@/app/(app)/profile/actions'
import { PROFILE_IDLE, type ProfileField } from '@/app/(app)/profile/form-state'
import { cn } from '@/lib/utils'
import type { ChatPreference, Interest, InterestCategory, Profile } from '@/lib/types'

const CATEGORY_ORDER: InterestCategory[] = ['craft', 'topic', 'hobby', 'lifestyle']
const CATEGORY_LABEL: Record<InterestCategory, string> = {
  craft: 'Craft',
  topic: 'Topics',
  hobby: 'Hobbies',
  lifestyle: 'Life',
}

const PROMPTS = [
  {
    name: 'bio',
    label: 'About you',
    hint: 'The short version a stranger would find useful.',
    rows: 3,
  },
  {
    name: 'workingOn',
    label: 'Working on',
    hint: 'What is actually on your plate right now?',
    rows: 3,
  },
  {
    name: 'curiousAbout',
    label: 'Curious about',
    hint: 'What would you want to learn from someone else here?',
    rows: 3,
  },
  { name: 'funFact', label: 'Fun fact', hint: 'Optional, but it starts conversations.', rows: 2 },
] as const

export function ProfileForm({
  profile,
  interests,
  selectedIds,
}: {
  profile: Profile
  interests: Interest[]
  selectedIds: string[]
}) {
  const [state, formAction] = useActionState(updateProfile, PROFILE_IDLE)
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds))
  const [preference, setPreference] = useState<ChatPreference>(profile.chat_preference)

  useEffect(() => {
    if (state.status === 'success' && state.message) toast.success(state.message)
    if (state.status === 'error' && state.message) toast.error(state.message)
  }, [state])

  const error = (field: ProfileField) => state.fieldErrors[field]

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: interests.filter((i) => i.category === category),
  })).filter((group) => group.items.length > 0)

  return (
    <form action={formAction} className="space-y-10">
      <section className="space-y-4">
        <h2 className="label-mono">Photo</h2>
        <AvatarField
          userId={profile.id}
          name={profile.full_name}
          initialUrl={profile.avatar_url}
          error={error('avatarUrl')}
        />
      </section>

      <section className="space-y-4 border-t border-border pt-8">
        <h2 className="label-mono">Basics</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" name="fullName" defaultValue={profile.full_name ?? ''} error={error('fullName')} required />
          <Field label="Role" name="headline" defaultValue={profile.headline ?? ''} placeholder="Staff Design Engineer" />
          <Field label="Team" name="department" defaultValue={profile.department ?? ''} placeholder="Design" />
          <Field label="Location" name="location" defaultValue={profile.location ?? ''} placeholder="Toronto, ON" />
          <Field label="Pronouns" name="pronouns" defaultValue={profile.pronouns ?? ''} placeholder="they/them" />
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-8">
        <div>
          <h2 className="label-mono">In your words</h2>
          <p className="mt-1.5 text-xs text-muted-foreground text-pretty">
            These answers are what the matching model reads. Specific beats polished —
            &ldquo;untangling a four-year-old ledger&rdquo; matches better than
            &ldquo;backend work&rdquo;.
          </p>
        </div>

        <div className="space-y-4">
          {PROMPTS.map((prompt) => (
            <div key={prompt.name} className="space-y-1.5">
              <label htmlFor={prompt.name} className="text-sm font-medium">
                {prompt.label}
              </label>
              <p className="text-[11px] text-muted-foreground">{prompt.hint}</p>
              <Textarea
                id={prompt.name}
                name={prompt.name}
                rows={prompt.rows}
                defaultValue={
                  (profile[
                    prompt.name === 'workingOn'
                      ? 'working_on'
                      : prompt.name === 'curiousAbout'
                        ? 'curious_about'
                        : prompt.name === 'funFact'
                          ? 'fun_fact'
                          : 'bio'
                  ] as string | null) ?? ''
                }
                className="resize-none"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="label-mono">Interests</h2>
          <span className="font-mono text-[11px] tabular text-muted-foreground">
            {selected.size} selected
          </span>
        </div>

        {[...selected].map((id) => (
          <input key={id} type="hidden" name="interests" value={id} />
        ))}

        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.category} className="space-y-2">
              <p className="label-mono">{CATEGORY_LABEL[group.category]}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((interest) => {
                  const on = selected.has(interest.id)
                  return (
                    <button
                      key={interest.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setSelected((current) => {
                          const next = new Set(current)
                          if (next.has(interest.id)) next.delete(interest.id)
                          else next.add(interest.id)
                          return next
                        })
                      }
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors',
                        on
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
                      )}
                    >
                      {interest.emoji && (
                        <span aria-hidden className="text-[11px]">
                          {interest.emoji}
                        </span>
                      )}
                      {interest.name}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 border-t border-border pt-8">
        <h2 className="label-mono">How you like to meet</h2>
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
      </section>

      <div className="sticky bottom-0 -mx-1 border-t border-border bg-background/90 px-1 py-3 backdrop-blur">
        <SubmitButton size="lg" pendingText="Saving…">
          Save profile
        </SubmitButton>
      </div>
    </form>
  )
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  error,
  required,
}: {
  label: string
  name: string
  defaultValue: string
  placeholder?: string
  error?: string
  required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={name}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error && (
        <p id={`${name}-error`} role="alert" className="text-[11px] text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
