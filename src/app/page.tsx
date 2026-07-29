import type { Metadata } from 'next'
import Link from 'next/link'

import { Logo } from '@/components/shell/logo'
import { ThemeToggle } from '@/components/shell/theme-toggle'
import { InterestTag } from '@/components/kit/interest-tag'
import { PersonAvatar } from '@/components/kit/person-avatar'
import { ScoreBadge } from '@/components/kit/score-badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Watercooler — semantic coffee chats for coworkers',
  description:
    'Watercooler embeds everyone’s profile with a sentence-transformer model and pairs you with the coworker whose answers mean the same thing as yours. Matched on meaning, not keyword overlap.',
}

/* --------------------------------------------------------------------------
 * Marketing landing. Public, and deliberately zero-JS on our side: the reveal
 * is a CSS scroll-driven animation behind `@supports`, so browsers without it
 * simply render the page — no blank first paint, no hydration cost.
 * ----------------------------------------------------------------------- */

const SHELL = 'mx-auto w-full max-w-5xl px-5 sm:px-8'

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <RevealStyles />
      <SiteHeader />

      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <Matching />
        <ClosingBand />
      </main>

      <SiteFooter />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Chrome                                                                     */
/* -------------------------------------------------------------------------- */

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className={cn(SHELL, 'flex h-14 items-center justify-between gap-4')}>
        <Logo href="/" />

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: 'ghost' }), 'hidden sm:inline-flex')}
          >
            Sign in
          </Link>
          <Link href="/signup" className={buttonVariants()}>
            Get started
          </Link>
        </div>
      </div>
    </header>
  )
}

function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div
        className={cn(
          SHELL,
          'flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between'
        )}
      >
        <div className="space-y-2">
          <Logo href="/" />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground text-pretty">
            Coffee chats between coworkers who would not otherwise have met, chosen
            by what they wrote rather than where they sit.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/login"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Get started
            </Link>
          </nav>
          <p className="label-mono">© {new Date().getFullYear()} Watercooler</p>
        </div>
      </div>
    </footer>
  )
}

/* -------------------------------------------------------------------------- */
/* Hero                                                                       */
/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* The only backdrop on the page: a dot grid, faded out at the edges. */}
      <div
        aria-hidden
        className="bg-grid mask-fade pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px]"
      />

      <div className={cn(SHELL, 'pt-20 pb-16 sm:pt-28 sm:pb-24')}>
        <div className="flex flex-col items-center text-center">
          <span className="pill animate-rise text-muted-foreground">
            Semantic matching · pgvector
          </span>

          <h1
            className="animate-rise mt-6 max-w-3xl text-5xl leading-[0.98] font-semibold tracking-[-0.045em] text-balance sm:text-7xl"
            style={{ animationDelay: '60ms' }}
          >
            The coworker you should have met months ago.
          </h1>

          <p
            className="animate-rise mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg"
            style={{ animationDelay: '120ms' }}
          >
            Watercooler reads what everyone actually wrote about their work and
            their interests, ranks the people across your org whose answers mean
            the same thing as yours, and turns the best one into a thirty-minute
            coffee.
          </p>

          <div
            className="animate-rise mt-9 flex w-full flex-col items-stretch gap-2.5 sm:w-auto sm:flex-row sm:items-center"
            style={{ animationDelay: '180ms' }}
          >
            <Link
              href="/signup"
              className={cn(buttonVariants({ size: 'lg' }), 'h-10 px-5 text-sm')}
            >
              Get started
            </Link>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'h-10 px-5 text-sm'
              )}
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="reveal mt-16 sm:mt-20">
          <DiscoverMock />
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* Product visual — the discover view, built from the real primitives          */
/* -------------------------------------------------------------------------- */

interface MockMatch {
  name: string
  headline: string
  department: string
  score: number
  reason: string
  interests: { name: string; emoji: string; shared?: boolean }[]
}

const MOCK_MATCHES: MockMatch[] = [
  {
    name: 'Priya Raman',
    headline: 'Staff Design Engineer',
    department: 'Design',
    score: 0.87,
    reason: 'You both like Design Systems and Typography',
    interests: [
      { name: 'Design Systems', emoji: '🧩', shared: true },
      { name: 'Typography', emoji: '🔠', shared: true },
      { name: 'Climbing', emoji: '🧗' },
      { name: 'Coffee', emoji: '☕' },
    ],
  },
  {
    name: 'Marcus Oyelaran',
    headline: 'Infrastructure Engineer',
    department: 'Platform',
    score: 0.74,
    reason: 'Similar interests, different corner of the org',
    interests: [
      { name: 'Infrastructure', emoji: '🏗️' },
      { name: 'Open Source', emoji: '🌐' },
      { name: 'Running', emoji: '🏃' },
    ],
  },
  {
    name: 'Yuki Tanaka',
    headline: 'Data Scientist',
    department: 'Insights',
    score: 0.66,
    reason: 'You both like Reading',
    interests: [
      { name: 'Reading', emoji: '📚', shared: true },
      { name: 'Machine Learning', emoji: '🧠' },
    ],
  },
]

function DiscoverMock() {
  return (
    <figure className="m-0">
      <div className="surface overflow-hidden">
        {/* Browser chrome — hairline, three dots, a mono URL pill. */}
        <div className="flex items-center gap-3 border-b border-border px-3 py-2.5">
          <div className="flex shrink-0 gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full border border-border-strong" />
            <span className="size-2.5 rounded-full border border-border-strong" />
            <span className="size-2.5 rounded-full border border-border-strong" />
          </div>
          <span className="pill mx-auto max-w-full truncate text-muted-foreground">
            watercooler.app/discover
          </span>
          <div className="w-[38px] shrink-0" aria-hidden />
        </div>

        <div className="bg-background-subtle p-4 sm:p-6">
          <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
            <div className="space-y-1.5">
              <p className="label-mono">Discover</p>
              <p className="text-lg font-semibold tracking-[-0.02em]">
                People you should meet
              </p>
            </div>
            <p className="hidden font-mono text-xs tabular text-muted-foreground sm:block">
              24 open to matching
            </p>
          </div>

          {/* The last card fades out — it reads as a list that keeps going. */}
          <div className="mask-fade-b -mb-2 pt-4">
            <div className="grid gap-3">
              {MOCK_MATCHES.map((match) => (
                <MockMatchCard key={match.name} match={match} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <figcaption className="label-mono mt-3 text-center">
        Discovery, ranked best first — with the reason attached
      </figcaption>
    </figure>
  )
}

function MockMatchCard({ match }: { match: MockMatch }) {
  return (
    <div className="surface p-4">
      <div className="flex items-start gap-3">
        <PersonAvatar name={match.name} size="md" />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium tracking-tight">
                {match.name}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {match.headline} · {match.department}
              </p>
            </div>
            <ScoreBadge score={match.score} className="shrink-0 pt-0.5" />
          </div>

          <p className="mt-2.5 text-sm text-muted-foreground text-pretty">
            {match.reason}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {match.interests.map((interest) => (
              <InterestTag
                key={interest.name}
                name={interest.name}
                emoji={interest.emoji}
                shared={interest.shared}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* How it works                                                               */
/* -------------------------------------------------------------------------- */

const STEPS = [
  {
    number: '01',
    title: 'Answer three prompts',
    body: 'What you’re working on, what you’re curious about, and one fun fact — in plain sentences. Ordinary prose is exactly what the model reads best.',
  },
  {
    number: '02',
    title: 'Get ranked, with reasons',
    body: 'Discovery lists everyone open to matching, strongest first, and always says why: the interests you actually share, and how closely the rest of your profiles read.',
  },
  {
    number: '03',
    title: 'Send one request',
    body: 'They accept, you each propose times from your weekly availability, and a thread opens. One coffee, thirty minutes, no standing commitment.',
  },
] as const

function HowItWorks() {
  return (
    <section className="border-t border-border">
      <div className={cn(SHELL, 'py-16 sm:py-24')}>
        <div className="reveal max-w-2xl">
          <p className="label-mono">How it works</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
            Three prompts in, one coffee out.
          </h2>
        </div>

        <ol className="reveal mt-12 grid grid-cols-1 border-t border-border md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.number}
              className={cn(
                'flex flex-col gap-3 border-b border-border py-8 md:border-b-0 md:py-10',
                index === 0 ? 'md:pr-8' : 'md:px-8',
                index > 0 && 'md:border-l md:border-border',
                index === STEPS.length - 1 && 'border-b-0 md:pr-0'
              )}
            >
              <span className="font-mono text-xs font-medium tabular tracking-[0.12em] text-muted-foreground">
                {step.number}
              </span>
              <h3 className="text-lg font-semibold tracking-[-0.02em]">
                {step.title}
              </h3>
              <p className="text-base leading-relaxed text-muted-foreground text-pretty">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* The matching model — the credibility beat                                  */
/* -------------------------------------------------------------------------- */

function Matching() {
  return (
    <section className="border-t border-border">
      <div className={cn(SHELL, 'py-16 sm:py-24')}>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="reveal">
            <p className="label-mono">The matching model</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
              Matched on meaning, not keyword overlap.
            </h2>

            <div className="mt-6 space-y-5 text-base leading-relaxed text-muted-foreground text-pretty">
              <p>
                Keyword search would never connect{' '}
                <em className="text-foreground not-italic">
                  “migrating our design tokens to one source of truth”
                </em>{' '}
                with{' '}
                <em className="text-foreground not-italic">
                  “I want to learn how large design systems stay coherent.”
                </em>{' '}
                They share no words. They are the same conversation.
              </p>
              <p>
                So Watercooler doesn’t match on words. Your headline, team,
                location, bio, the three prompts and your interests are flattened
                into one labelled sentence and passed through{' '}
                <code className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[13px] text-foreground">
                  all-MiniLM-L6-v2
                </code>
                , a sentence-transformer that returns a 384-dimension vector. The
                vectors live in Postgres in a{' '}
                <code className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[13px] text-foreground">
                  vector(384)
                </code>{' '}
                column with an HNSW index.
              </p>
              <p>
                Two people are then compared by the cosine of the angle between
                their vectors —{' '}
                <span className="font-mono text-sm tabular text-foreground">1.00</span>{' '}
                is identical,{' '}
                <span className="font-mono text-sm tabular text-foreground">0.00</span>{' '}
                unrelated. That similarity, plus a small bonus for interests you
                both literally ticked, is the percentage printed on every card.
              </p>
              <p>
                And if your vector hasn’t been built yet, you don’t vanish: you
                are ranked on shared interests alone until it catches up.
              </p>
            </div>
          </div>

          <div className="reveal">
            <PipelineDiagram />
          </div>
        </div>
      </div>
    </section>
  )
}

/* A monochrome text → vector → neighbours diagram, built from divs. */
function PipelineDiagram() {
  // Deterministic pseudo-signal so the server and client render identically.
  const bars = Array.from({ length: 44 }, (_, i) =>
    Math.round(18 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)) * 82)
  )

  const neighbours = [
    { name: 'Priya Raman', score: 0.87 },
    { name: 'Marcus Oyelaran', score: 0.74 },
    { name: 'Yuki Tanaka', score: 0.66 },
  ]

  return (
    <div className="surface p-4 sm:p-6">
      <p className="label-mono">Your profile, flattened</p>
      <div className="mt-2.5 rounded-lg border border-border bg-muted/60 p-3">
        <p className="font-mono text-[11px] leading-[1.7] text-muted-foreground">
          Role: Staff Design Engineer. Team: Design. Currently working on:
          migrating our design tokens to one source of truth. Curious about: how
          large design systems stay coherent.
        </p>
      </div>

      <Connector label="all-MiniLM-L6-v2" />

      <p className="label-mono">384-dimension vector</p>
      <div className="mt-2.5 rounded-lg border border-border bg-muted/60 p-3">
        <div className="flex h-14 items-end gap-[3px]" aria-hidden>
          {bars.map((height, i) => (
            <span
              key={i}
              className="min-w-[2px] flex-1 rounded-[1px] bg-foreground/25"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <p className="mt-2.5 truncate font-mono text-[11px] tabular text-muted-foreground">
          [0.021, −0.114, 0.078, 0.042, −0.009, … ]
        </p>
      </div>

      <Connector label="cosine similarity" />

      <p className="label-mono">Nearest neighbours</p>
      <ul className="mt-2.5 divide-y divide-border rounded-lg border border-border">
        {neighbours.map((person) => (
          <li
            key={person.name}
            className="flex items-center justify-between gap-3 px-3 py-2.5"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <PersonAvatar name={person.name} size="xs" />
              <span className="truncate text-sm">{person.name}</span>
            </span>
            <ScoreBadge score={person.score} showBar={false} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function Connector({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-3" aria-hidden>
      <span className="ml-[7px] h-6 w-px shrink-0 bg-border-strong" />
      <span className="label-mono">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Closing                                                                    */
/* -------------------------------------------------------------------------- */

function ClosingBand() {
  return (
    <section className="border-t border-border bg-background-subtle">
      <div className={cn(SHELL, 'reveal py-16 text-center sm:py-24')}>
        <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-5xl">
          The right person is already on the payroll.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
          Write a profile once. Watercooler keeps the index warm and surfaces
          someone worth thirty minutes whenever you want one.
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center">
          <Link
            href="/signup"
            className={cn(buttonVariants({ size: 'lg' }), 'h-10 px-5 text-sm')}
          >
            Get started
          </Link>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'h-10 px-5 text-sm'
            )}
          >
            Sign in
          </Link>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* Scroll reveal — CSS only, progressive, reduced-motion aware                */
/* -------------------------------------------------------------------------- */

function RevealStyles() {
  return (
    <style href="landing-reveal" precedence="default">{`
      @keyframes wc-reveal {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: none; }
      }
      @supports (animation-timeline: view()) {
        @media (prefers-reduced-motion: no-preference) {
          .reveal {
            animation: wc-reveal 1ms linear both;
            animation-timeline: view();
            animation-range: entry 0% cover 18%;
          }
        }
      }
    `}</style>
  )
}
