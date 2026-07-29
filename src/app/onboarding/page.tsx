import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { requireUser } from '@/lib/session'
import { Logo } from '@/components/shell/logo'
import { ThemeToggle } from '@/components/shell/theme-toggle'
import { Button } from '@/components/ui/button'
import type { Interest } from '@/lib/types'
import { Wizard, type OnboardingDraft } from './wizard'

export const metadata: Metadata = { title: 'Set up your profile' }

export default async function OnboardingPage() {
  // requireUser, not requireProfile — the latter redirects here, which would loop.
  const { user, profile } = await requireUser()

  if (profile?.onboarding_completed) redirect('/discover')

  const supabase = await createClient()

  const [{ data: interests }, { data: existing }] = await Promise.all([
    supabase.from('interests').select('*').order('name'),
    supabase.from('user_interests').select('interest_id').eq('user_id', user.id),
  ])

  // Someone may land back here after a partial save, so seed the wizard from
  // whatever is already on the row rather than starting them from blank.
  const initial: OnboardingDraft = {
    fullName:
      profile?.full_name ??
      (user.user_metadata?.full_name as string | undefined) ??
      '',
    headline: profile?.headline ?? '',
    department: profile?.department ?? '',
    location: profile?.location ?? '',
    pronouns: profile?.pronouns ?? '',
    interestIds: (existing ?? []).map((row) => row.interest_id as string),
    bio: profile?.bio ?? '',
    workingOn: profile?.working_on ?? '',
    curiousAbout: profile?.curious_about ?? '',
    funFact: profile?.fun_fact ?? '',
    chatPreference: profile?.chat_preference ?? 'either',
    openToMatching: profile?.open_to_matching ?? true,
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Logo href="/" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <form action="/auth/signout" method="post">
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <Wizard
          userId={user.id}
          interests={(interests ?? []) as Interest[]}
          initial={initial}
        />
      </main>
    </div>
  )
}
