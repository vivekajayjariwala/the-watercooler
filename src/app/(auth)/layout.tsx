import { Logo } from '@/components/shell/logo'
import { ThemeToggle } from '@/components/shell/theme-toggle'
import { PersonAvatar } from '@/components/kit/person-avatar'
import { ScoreBadge } from '@/components/kit/score-badge'
import { InterestTag } from '@/components/kit/interest-tag'

/**
 * Static, illustrative rows. They exist to show the *shape* of a match — a
 * person, a reason, a number — before anyone has an account. Exactly one row
 * carries the accent, which is the whole point of the accent.
 */
const SAMPLE_MATCHES = [
  {
    name: 'Priya Raman',
    headline: 'Staff Engineer · Platform',
    interest: 'Design Systems',
    shared: true,
    score: 0.94,
  },
  {
    name: 'Tomás Aguilar',
    headline: 'Product Designer · Growth',
    interest: 'Typography',
    shared: false,
    score: 0.87,
  },
  {
    name: 'Wren Okafor',
    headline: 'Data Scientist · Trust',
    interest: 'AI Ethics',
    shared: false,
    score: 0.81,
  },
  {
    name: 'Jonah Bright',
    headline: 'Engineering Manager · Payments',
    interest: 'Climbing',
    shared: false,
    score: 0.76,
  },
] as const

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* --- Form column ------------------------------------------------- */}
      <div className="flex w-full flex-col px-6 py-8 sm:px-10 lg:w-[46%] lg:max-w-[640px] lg:shrink-0 lg:px-14 lg:py-10">
        <header className="flex items-center justify-between">
          <Logo href="/" />
          <div className="lg:hidden">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex flex-1 items-center py-14 lg:py-16">
          <div className="w-full max-w-[380px] animate-rise">{children}</div>
        </main>

        <footer className="flex items-center justify-between gap-4">
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            One coworker a week. No feed, no leaderboard.
          </p>
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>
        </footer>
      </div>

      {/* --- Product panel ----------------------------------------------- */}
      <aside className="relative hidden flex-1 overflow-hidden border-l border-border bg-background-subtle lg:block">
        <div className="bg-grid mask-fade-b pointer-events-none absolute inset-0 opacity-70" aria-hidden />

        <div className="relative flex h-full flex-col justify-center gap-14 px-14 py-16 xl:px-20">
          <div className="max-w-[30ch] space-y-5">
            <p className="label-mono">How the matching works</p>
            <p className="text-[32px] leading-[1.12] font-semibold tracking-[-0.035em] text-balance xl:text-[38px]">
              The org chart doesn&rsquo;t know you&rsquo;re both rebuilding a design system.
            </p>
            <p className="max-w-[46ch] text-sm leading-relaxed text-muted-foreground text-pretty">
              Watercooler reads what you write about your work and what you want to learn, then
              compares it against everyone else&rsquo;s. Proximity and reporting lines don&rsquo;t
              come into it.
            </p>
          </div>

          <div className="max-w-[440px]">
            <div className="mb-2.5 flex items-baseline justify-between">
              <p className="label-mono">A week of matches</p>
              <p className="label-mono">Score</p>
            </div>

            <ul className="surface divide-y divide-border">
              {SAMPLE_MATCHES.map((match) => (
                <li key={match.name} className="flex items-center gap-3 px-3.5 py-3">
                  <PersonAvatar name={match.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium tracking-tight">{match.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{match.headline}</p>
                  </div>
                  <InterestTag
                    name={match.interest}
                    shared={match.shared}
                    className="hidden xl:inline-flex"
                  />
                  <ScoreBadge score={match.score} />
                </li>
              ))}
            </ul>

            <p className="label-mono mt-3">
              Illustrative — 384-dimension embeddings, cosine ranked
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}
