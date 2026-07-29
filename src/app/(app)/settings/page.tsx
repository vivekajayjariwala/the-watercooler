import type { Metadata } from 'next'
import { requireProfile } from '@/lib/session'
import { createClient } from '@/utils/supabase/server'
import { PageHeader } from '@/components/kit/page-header'
import { Button } from '@/components/ui/button'
import { AvailabilityEditor } from '@/components/schedule/availability-editor'
import {
  AppearanceSettings,
  DangerZone,
  MatchingSettings,
  TimezoneSettings,
} from '@/components/profile/settings-sections'
import { resolveTimeZone } from '@/lib/availability'
import type { AvailabilitySlot } from '@/lib/types'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const { user, profile } = await requireProfile()
  const supabase = await createClient()

  const { data: slots } = await supabase
    .from('availability_slots')
    .select('*')
    .eq('user_id', user.id)

  const timezone = resolveTimeZone(profile.timezone)

  return (
    <div className="max-w-2xl space-y-10">
      <PageHeader eyebrow="Settings" title="Settings" />

      <Section title="Account">
        <div className="space-y-1">
          <p className="text-sm font-medium">Email</p>
          <p className="font-mono text-xs text-muted-foreground">{user.email}</p>
        </div>

        <form action="/auth/signout" method="post">
          <Button type="submit" variant="outline" size="lg">
            Sign out
          </Button>
        </form>
      </Section>

      <Section title="Matching">
        <MatchingSettings
          openToMatching={profile.open_to_matching}
          chatPreference={profile.chat_preference}
        />
      </Section>

      <Section
        title="Availability"
        description="Paint the windows you're generally free for a coffee. We only ever suggest times you and the other person both marked."
      >
        <AvailabilityEditor
          timezone={timezone}
          slots={(slots ?? []) as AvailabilitySlot[]}
        />
      </Section>

      <Section title="Timezone">
        <TimezoneSettings timezone={timezone} />
      </Section>

      <Section title="Appearance">
        <AppearanceSettings />
      </Section>

      <Section
        title="Danger zone"
        description="Deleting your account removes your profile, chats, and messages permanently."
      >
        <DangerZone />
      </Section>
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4 border-t border-border pt-8 first:border-t-0 first:pt-0">
      <div className="space-y-1">
        <h2 className="label-mono">{title}</h2>
        {description && (
          <p className="max-w-lg text-xs text-muted-foreground text-pretty">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}
