/**
 * The `/discover` URL contract.
 *
 * Every piece of discovery state lives in the query string so the page stays a
 * plain Server Component: filters are links, results are server-rendered, and a
 * shared URL reproduces exactly what the sender was looking at.
 *
 *   ?view=list        grid (default) | list
 *   ?i=climbing&i=tea repeatable interest slug
 *   ?dept=Design      exact department match
 *   ?q=ada            text search over name + headline
 *
 * Pure module — safe to import from client components.
 */

export type DiscoverView = 'grid' | 'list'

export const DEFAULT_VIEW: DiscoverView = 'grid'

/** Guardrails so a hand-edited URL can't fan out into an expensive query. */
const MAX_INTERESTS = 12
const MAX_QUERY_LENGTH = 80

export interface DiscoverParams {
  view: DiscoverView
  /** Interest slugs, de-duplicated and lower-cased. */
  interests: string[]
  department: string | null
  query: string
}

export type RawSearchParams = Record<string, string | string[] | undefined>

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function allValues(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value
  return value ? [value] : []
}

export function parseDiscoverParams(raw: RawSearchParams): DiscoverParams {
  const interests = Array.from(
    new Set(
      allValues(raw.i)
        .map((slug) => slug.trim().toLowerCase())
        .filter(Boolean)
    )
  ).slice(0, MAX_INTERESTS)

  return {
    view: firstValue(raw.view) === 'list' ? 'list' : 'grid',
    interests,
    department: (firstValue(raw.dept) ?? '').trim() || null,
    query: (firstValue(raw.q) ?? '').trim().slice(0, MAX_QUERY_LENGTH),
  }
}

/** `view` is a display preference, not a filter — it never counts here. */
export function activeFilterCount(params: DiscoverParams): number {
  return params.interests.length + (params.department ? 1 : 0) + (params.query ? 1 : 0)
}

export function discoverHref(
  params: DiscoverParams,
  patch: Partial<DiscoverParams> = {}
): string {
  const next = { ...params, ...patch }
  const search = new URLSearchParams()

  if (next.query) search.set('q', next.query)
  if (next.department) search.set('dept', next.department)
  for (const slug of next.interests) search.append('i', slug)
  if (next.view !== DEFAULT_VIEW) search.set('view', next.view)

  const qs = search.toString()
  return qs ? `/discover?${qs}` : '/discover'
}

export function toggleInterestHref(params: DiscoverParams, slug: string): string {
  const selected = params.interests.includes(slug)
  return discoverHref(params, {
    interests: selected
      ? params.interests.filter((s) => s !== slug)
      : [...params.interests, slug],
  })
}

/** Drops every filter but keeps the view the person chose. */
export function clearFiltersHref(params: DiscoverParams): string {
  return discoverHref({ view: params.view, interests: [], department: null, query: '' })
}
