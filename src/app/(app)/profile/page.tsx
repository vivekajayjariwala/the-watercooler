import type { Metadata } from 'next'
import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { requireProfile } from '@/lib/session'
import { createClient } from '@/utils/supabase/server'
import { PageHeader } from '@/components/kit/page-header'
import { PersonAvatar } from '@/components/kit/person-avatar'
import { InterestTag } from '@/components/kit/interest-tag'
import { ProfileForm } from '@/components/profile/profile-form'
import { ButtonLink } from '@/components/ui/button'
import type { Interest } from '@/lib/types'

export const metadata: Metadata = { title: 'Your profile' }

export default async function ProfilePage() {
  const { user, profile } = await requireProfile()
  const supabase = await createClient()

  const [{ data: interests }, { data: mine }] = await Promise.all([
    supabase.from('interests').select('*').order('name'),
    supabase.from('user_interests').select('interest_id').eq('user_id', user.id),
  ])

  const allInterests = (interests ?? []) as Interest[]
  const selectedIds = (mine ?? []).map((row) => row.interest_id as string)
  const selected = allInterests.filter((i) => selectedIds.includes(i.id))

  // The vector lags the row whenever a save happened without a successful
  // embedding call — worth saying quietly rather than pretending it's current.
  const embeddingStale =
    !profile.embedding_updated_at ||
    new Date(profile.embedding_updated_at) < new Date(profile.updated_at)

  const prose = [
    { label: 'About', value: profile.bio },
    { label: 'Working on', value: profile.working_on },
    { label: 'Curious about', value: profile.curious_about },
    { label: 'Fun fact', value: profile.fun_fact },
  ].filter((entry) => entry.value)

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Your profile"
        title="Profile"
        description="What your colleagues see, and what the matching model reads."
        action={
          <ButtonLink variant="outline" size="sm" href="/settings">
            Settings
          </ButtonLink>
        }
      />

      <div className="grid gap-10 lg:grid-cols-[1fr_20rem] lg:items-start">
        <ProfileForm
          profile={profile}
          interests={allInterests}
          selectedIds={selectedIds}
        />

        <aside className="space-y-4 lg:sticky lg:top-20">
          <h2 className="label-mono">How others see you</h2>

          <div className="surface space-y-4 p-4">
            <div className="flex items-center gap-3">
              <PersonAvatar name={profile.full_name} src={profile.avatar_url} size="lg" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <p className="truncate text-sm font-medium tracking-tight">
                    {profile.full_name ?? 'Unnamed'}
                  </p>
                  {profile.pronouns && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {profile.pronouns}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {[profile.headline, profile.department].filter(Boolean).join(' · ') || '—'}
                </p>
                {profile.location && (
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin className="size-2.5" aria-hidden />
                    {profile.location}
                  </p>
                )}
              </div>
            </div>

            {prose.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nothing written yet — the fields on the left fill this in.
              </p>
            ) : (
              prose.map((entry) => (
                <div key={entry.label} className="space-y-1">
                  <p className="label-mono">{entry.label}</p>
                  <p className="text-xs leading-relaxed text-foreground/80 text-pretty">
                    {entry.value}
                  </p>
                </div>
              ))
            )}

            {selected.length > 0 && (
              <div className="space-y-1.5 border-t border-border pt-3">
                <p className="label-mono">Interests</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.map((interest) => (
                    <InterestTag
                      key={interest.id}
                      name={interest.name}
                      emoji={interest.emoji}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <p className="font-mono text-[11px] text-muted-foreground">
            {embeddingStale
              ? 'Match index refreshing…'
              : `Match index updated ${new Date(profile.embedding_updated_at!).toLocaleDateString()}`}
          </p>

          {!profile.open_to_matching && (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              You&rsquo;re hidden from discovery. Turn matching back on in{' '}
              <Link href="/settings" className="underline">
                settings
              </Link>
              .
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}
