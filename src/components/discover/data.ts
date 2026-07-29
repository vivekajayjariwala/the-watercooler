import 'server-only'

import { createClient } from '@/utils/supabase/server'
import type { CoffeeChat, Interest, MatchResult, Profile } from '@/lib/types'

/**
 * Reads that discovery needs on top of the `match_profiles` RPC.
 *
 * The RPC already does the ranking; everything here is enrichment (interest
 * lists, facet counts, the `ilike` name search) so the score ordering coming
 * out of Postgres is never rebuilt in Node — only filtered.
 */

export interface InterestFacet {
  slug: string
  name: string
  emoji: string | null
  /** How many people in the current result set hold this interest. */
  count: number
}

interface UserInterestRow {
  user_id: string
  interests: Interest | null
}

/** Interest rows for a set of people, keyed by user id. */
export async function getInterestsByUser(
  userIds: string[]
): Promise<Map<string, Interest[]>> {
  const byUser = new Map<string, Interest[]>()
  if (userIds.length === 0) return byUser

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_interests')
    .select('user_id, interests ( id, slug, name, category, emoji )')
    .in('user_id', userIds)

  if (error) {
    console.error('[discover] interest lookup failed:', error.message)
    return byUser
  }

  for (const row of (data ?? []) as unknown as UserInterestRow[]) {
    if (!row.interests) continue
    const list = byUser.get(row.user_id)
    if (list) list.push(row.interests)
    else byUser.set(row.user_id, [row.interests])
  }

  for (const list of byUser.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name))
  }

  return byUser
}

/**
 * Ids of profiles whose name or headline match `query`.
 *
 * `ilike` on `full_name` rides the GIN trigram index from the migration, which
 * is why the search runs in Postgres instead of over the in-memory match array.
 * Returns `null` when there is nothing to search for.
 */
export async function searchProfileIds(query: string): Promise<Set<string> | null> {
  // PostgREST parses `or=(...)` as a comma-separated list, so characters that
  // would break out of the value are stripped rather than escaped.
  const term = query.replace(/[,()\\'"%]/g, ' ').trim()
  if (!term) return null

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .or(`full_name.ilike.%${term}%,headline.ilike.%${term}%`)
    .limit(500)

  if (error) {
    console.error('[discover] name search failed:', error.message)
    return null
  }

  return new Set((data ?? []).map((row: { id: string }) => row.id))
}

/** How many other people are actually available to be matched with. */
export async function countOpenToMatching(excludeUserId: string): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('open_to_matching', true)
    .eq('onboarding_completed', true)
    .neq('id', excludeUserId)

  if (error) {
    console.error('[discover] open-to-matching count failed:', error.message)
    return 0
  }

  return count ?? 0
}

/** A single profile, or `null` when the id doesn't exist. */
export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = await createClient()

  const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()

  return (data as Profile | null) ?? null
}

/** The live request between two people, in either direction. */
export async function getOpenChatBetween(
  userId: string,
  otherId: string
): Promise<CoffeeChat | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('coffee_chats')
    .select('*')
    .in('status', ['pending', 'accepted'])
    .or(
      `and(initiator_id.eq.${userId},recipient_id.eq.${otherId}),` +
        `and(initiator_id.eq.${otherId},recipient_id.eq.${userId})`
    )
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data as CoffeeChat | null) ?? null
}

/**
 * Interest chips for the filter bar, most common first.
 *
 * Facets come from the people actually in the feed, not the whole taxonomy —
 * a chip that can only ever return zero results is noise.
 */
export function buildInterestFacets(
  matches: MatchResult[],
  interestsByUser: Map<string, Interest[]>,
  selected: string[],
  limit = 18
): InterestFacet[] {
  const facets = new Map<string, InterestFacet>()

  for (const match of matches) {
    for (const interest of interestsByUser.get(match.id) ?? []) {
      const existing = facets.get(interest.slug)
      if (existing) existing.count += 1
      else
        facets.set(interest.slug, {
          slug: interest.slug,
          name: interest.name,
          emoji: interest.emoji,
          count: 1,
        })
    }
  }

  const ranked = [...facets.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name)
  )

  const top = ranked.slice(0, limit)
  // A selected chip must always stay visible, otherwise it can't be un-picked.
  const pinned = ranked.slice(limit).filter((facet) => selected.includes(facet.slug))

  return [...top, ...pinned]
}
