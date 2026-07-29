import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, MapPin, MessageSquare } from 'lucide-react'
import { requireProfile } from '@/lib/session'
import { getMatches, explainMatch } from '@/lib/matching'
import { getInterestsByUser, getOpenChatBetween, getProfileById } from '@/components/discover/data'
import { RequestChatDialog } from '@/components/discover/request-chat-dialog'
import { PersonAvatar } from '@/components/kit/person-avatar'
import { ScoreBadge } from '@/components/kit/score-badge'
import { InterestTag } from '@/components/kit/interest-tag'
import { Button, ButtonLink } from '@/components/ui/button'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const profile = await getProfileById(id)
  return { title: profile?.full_name ?? 'Profile' }
}

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user } = await requireProfile()

  if (id === user.id) redirect('/profile')

  const person = await getProfileById(id)
  if (!person || !person.onboarding_completed) notFound()

  const [interestsByUser, myInterests, openChat, matches] = await Promise.all([
    getInterestsByUser([id]),
    getInterestsByUser([user.id]),
    getOpenChatBetween(user.id, id),
    // The RPC excludes anyone you already have a live chat with, so this can
    // legitimately come back empty — the score is enrichment, not the point.
    getMatches(user.id, { limit: 60 }),
  ])

  const theirInterests = interestsByUser.get(id) ?? []
  const mySlugs = new Set((myInterests.get(user.id) ?? []).map((i) => i.slug))
  const shared = theirInterests.filter((i) => mySlugs.has(i.slug))

  const match = matches.find((m) => m.id === id) ?? null

  const prose: { label: string; value: string | null }[] = [
    { label: 'About', value: person.bio },
    { label: 'Working on', value: person.working_on },
    { label: 'Curious about', value: person.curious_about },
    { label: 'Fun fact', value: person.fun_fact },
  ]

  return (
    <div className="space-y-8">
      <ButtonLink
        variant="ghost"
        size="sm"
        className="-ml-2 text-muted-foreground"
        href="/discover"
      >
        <ArrowLeft className="size-3.5" />
        Discover
      </ButtonLink>

      <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <PersonAvatar name={person.full_name} src={person.avatar_url} size="2xl" />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-[-0.03em]">
                {person.full_name ?? 'Someone'}
              </h1>
              {person.pronouns && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  {person.pronouns}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {[person.headline, person.department].filter(Boolean).join(' · ') || '—'}
            </p>
            {person.location && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3" aria-hidden />
                {person.location}
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {openChat ? (
            <ButtonLink variant="outline" size="lg" href={`/chats/${openChat.id}`}>
              <MessageSquare className="size-3.5" />
              {openChat.status === 'accepted' ? 'Open chat' : 'Request pending'}
            </ButtonLink>
          ) : person.open_to_matching ? (
            <RequestChatDialog
              recipientId={person.id}
              recipientName={person.full_name}
              recipientHeadline={person.headline}
              avatarUrl={person.avatar_url}
              score={match?.score ?? 0}
              sharedInterests={shared.map((i) => i.name)}
              trigger={<Button size="lg">Ask for coffee</Button>}
            />
          ) : (
            <p className="max-w-[15rem] text-xs text-muted-foreground">
              {person.full_name?.split(' ')[0] ?? 'They'} has paused new coffee chats for now.
            </p>
          )}
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-6">
          {prose.filter((p) => p.value).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This profile is still fairly empty.
            </p>
          ) : (
            prose
              .filter((p) => p.value)
              .map((p) => (
                <section key={p.label} className="space-y-2">
                  <h2 className="label-mono">{p.label}</h2>
                  <p className="text-sm leading-relaxed text-foreground/85 text-pretty">
                    {p.value}
                  </p>
                </section>
              ))
          )}
        </div>

        <aside className="space-y-6">
          {match && (
            <section className="surface space-y-3 p-4">
              <div className="flex items-center justify-between">
                <h2 className="label-mono">Why you two</h2>
                <ScoreBadge score={match.score} showBar={false} />
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
                {explainMatch(match)}
              </p>
              {shared.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {shared.map((interest) => (
                    <InterestTag
                      key={interest.id}
                      name={interest.name}
                      emoji={interest.emoji}
                      shared
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="space-y-3">
            <h2 className="label-mono">Interests</h2>
            {theirInterests.length === 0 ? (
              <p className="text-xs text-muted-foreground">None listed yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {theirInterests.map((interest) => (
                  <InterestTag
                    key={interest.id}
                    name={interest.name}
                    emoji={interest.emoji}
                    shared={mySlugs.has(interest.slug)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="label-mono">Prefers</h2>
            <p className="text-xs text-muted-foreground">
              {person.chat_preference === 'virtual'
                ? 'Virtual coffee'
                : person.chat_preference === 'in_person'
                  ? 'Meeting in person'
                  : 'Either virtual or in person'}
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
