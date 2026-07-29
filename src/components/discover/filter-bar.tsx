import Link from 'next/link'
import { LayoutGrid, List, Search, X } from 'lucide-react'
import { ButtonLink } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  activeFilterCount,
  clearFiltersHref,
  discoverHref,
  toggleInterestHref,
  type DiscoverParams,
} from './search-params'
import type { InterestFacet } from './data'

/**
 * Filters are links, not client state.
 *
 * Every control here is an `<a>` that changes the query string, so filtering
 * works without JavaScript, the back button behaves, and a copied URL
 * reproduces the exact view. The search box is the one exception — it's a GET
 * form, which is still no client JS.
 */
export function FilterBar({
  params,
  facets,
  departments,
}: {
  params: DiscoverParams
  facets: InterestFacet[]
  departments: string[]
}) {
  const active = activeFilterCount(params)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <form method="GET" action="/discover" className="relative flex-1 sm:max-w-xs">
          {/* Preserve the rest of the URL contract across a search submit. */}
          {params.interests.map((slug) => (
            <input key={slug} type="hidden" name="i" value={slug} />
          ))}
          {params.department && (
            <input type="hidden" name="dept" value={params.department} />
          )}
          {params.view !== 'grid' && <input type="hidden" name="view" value={params.view} />}

          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            // Remount when the URL's query changes, so the box tracks the
            // address bar. Reusing the instance would mean a `defaultValue`
            // that moves after mount, which Base UI warns about and which
            // wouldn't update the box anyway.
            key={params.query}
            type="search"
            name="q"
            defaultValue={params.query}
            placeholder="Search people"
            aria-label="Search people by name or role"
            className="pl-8"
          />
        </form>

        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          <ViewToggle
            href={discoverHref(params, { view: 'grid' })}
            active={params.view === 'grid'}
            label="Grid view"
          >
            <LayoutGrid className="size-3.5" />
          </ViewToggle>
          <ViewToggle
            href={discoverHref(params, { view: 'list' })}
            active={params.view === 'list'}
            label="List view"
          >
            <List className="size-3.5" />
          </ViewToggle>
        </div>

        {active > 0 && (
          <ButtonLink variant="ghost" size="sm" href={clearFiltersHref(params)}>
            <X className="size-3.5" />
            Clear
            <span className="font-mono tabular">{active}</span>
          </ButtonLink>
        )}
      </div>

      {departments.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="label-mono mr-1">Team</span>
          <Chip href={discoverHref(params, { department: null })} active={!params.department}>
            All
          </Chip>
          {departments.map((dept) => (
            <Chip
              key={dept}
              href={discoverHref(params, {
                department: params.department === dept ? null : dept,
              })}
              active={params.department === dept}
            >
              {dept}
            </Chip>
          ))}
        </div>
      )}

      {facets.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="label-mono mr-1">Interests</span>
          {facets.map((facet) => {
            const selected = params.interests.includes(facet.slug)
            return (
              <Chip
                key={facet.slug}
                href={toggleInterestHref(params, facet.slug)}
                active={selected}
              >
                {facet.emoji && (
                  <span aria-hidden className="mr-1 text-[11px]">
                    {facet.emoji}
                  </span>
                )}
                {facet.name}
                <span className="ml-1.5 font-mono text-[10px] tabular opacity-60">
                  {facet.count}
                </span>
              </Chip>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Chip({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
      )}
    >
      {children}
    </Link>
  )
}

function ViewToggle({
  href,
  active,
  label,
  children,
}: {
  href: string
  active: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'inline-flex size-7 items-center justify-center rounded-md transition-colors',
        active
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </Link>
  )
}
