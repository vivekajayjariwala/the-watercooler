import type { Metadata } from 'next'
import { SearchX, Users } from 'lucide-react'
import { requireProfile } from '@/lib/session'
import { getMatches } from '@/lib/matching'
import { embeddingsEnabled } from '@/lib/embeddings'
import { PageHeader } from '@/components/kit/page-header'
import { EmptyState } from '@/components/kit/empty-state'
import { ButtonLink } from '@/components/ui/button'
import { TopMatch } from '@/components/discover/top-match'
import { MatchCard } from '@/components/discover/match-card'
import { MatchRow } from '@/components/discover/match-row'
import { FilterBar } from '@/components/discover/filter-bar'
import {
  parseDiscoverParams,
  activeFilterCount,
  clearFiltersHref,
  type RawSearchParams,
} from '@/components/discover/search-params'
import {
  buildInterestFacets,
  countOpenToMatching,
  getInterestsByUser,
  searchProfileIds,
} from '@/components/discover/data'

export const metadata: Metadata = { title: 'Discover' }

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>
}) {
  const { user, profile } = await requireProfile()
  const params = parseDiscoverParams(await searchParams)

  // Ask for more than we show: filtering happens after ranking, so a narrow
  // filter still needs a deep enough pool to fill the page.
  const [allMatches, openCount] = await Promise.all([
    getMatches(user.id, { limit: 60 }),
    countOpenToMatching(user.id),
  ])

  const interestsByUser = await getInterestsByUser(allMatches.map((m) => m.id))
  const matchingIds = params.query ? await searchProfileIds(params.query) : null

  const matches = allMatches.filter((match) => {
    if (matchingIds && !matchingIds.has(match.id)) return false
    if (params.department && match.department !== params.department) return false

    if (params.interests.length > 0) {
      const slugs = new Set((interestsByUser.get(match.id) ?? []).map((i) => i.slug))
      // Every selected interest must be present — narrowing, not broadening.
      if (!params.interests.every((slug) => slugs.has(slug))) return false
    }

    return true
  })

  const facets = buildInterestFacets(allMatches, interestsByUser, params.interests)
  const departments = [
    ...new Set(allMatches.map((m) => m.department).filter((d): d is string => Boolean(d))),
  ].sort()

  const filtered = activeFilterCount(params) > 0
  const [top, ...rest] = matches
  // A hero only earns its space in the unfiltered default view — once someone
  // is filtering, they want the full list, not one person enlarged.
  const showHero = !filtered && params.view === 'grid' && Boolean(top)
  const gridItems = showHero ? rest : matches

  const firstName = profile.full_name?.trim().split(/\s+/)[0]

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Discover"
        title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
        description={
          openCount === 0
            ? 'Nobody else has finished setting up a profile yet.'
            : `${openCount} ${openCount === 1 ? 'person is' : 'people are'} open to a coffee chat right now, ranked by how much you have in common.`
        }
      />

      {!embeddingsEnabled() && (
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Semantic matching is off — no <code className="font-mono">HF_TOKEN</code> is
          configured, so these results are ranked by shared interests alone.
        </p>
      )}

      <FilterBar params={params} facets={facets} departments={departments} />

      {matches.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={<SearchX />}
            title="No one matches those filters"
            description="Try loosening the interests or clearing the search — the people you're looking for may just describe it differently."
            action={
              <ButtonLink variant="outline" size="lg" href={clearFiltersHref(params)}>
                Clear filters
              </ButtonLink>
            }
          />
        ) : (
          <EmptyState
            icon={<Users />}
            title="You're early"
            description="Nobody else has completed a profile yet. Once teammates join, they'll show up here ranked by what you have in common."
          />
        )
      ) : params.view === 'list' ? (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-3 py-2 sm:gap-4">
            <span className="label-mono w-6">#</span>
            <span className="label-mono flex-1 pl-11">Person</span>
            <span className="label-mono hidden w-32 md:block">Team</span>
            <span className="label-mono hidden w-24 sm:block">Overlap</span>
            <span className="label-mono w-10 text-right">Match</span>
            <span className="w-[52px]" aria-hidden />
          </div>
          <div className="divide-y divide-border">
            {matches.map((match, index) => (
              <MatchRow key={match.id} match={match} rank={index + 1} />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {showHero && top && <TopMatch match={top} />}

          {gridItems.length > 0 && (
            <>
              {showHero && (
                <h2 className="label-mono pt-2">
                  More people · {gridItems.length}
                </h2>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {gridItems.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
