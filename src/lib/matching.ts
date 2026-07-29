import 'server-only'

import { createClient } from '@/utils/supabase/server'
import { buildProfileText, embedOne, embeddingsEnabled, EmbeddingError } from '@/lib/embeddings'
import type { MatchResult } from '@/lib/types'

/**
 * Keeps a profile's vector in sync with its text.
 *
 * Call this after any write that touches an embedded field. It compares the
 * freshly-built source string against `embedding_source` and skips the HF round
 * trip when nothing meaningful changed — profile saves are frequent, and most
 * of them only touch fields that carry no semantic signal.
 *
 * Never throws: a matching index that is briefly stale is much better than a
 * profile save that fails. Returns what happened so callers can surface it.
 */
export async function syncProfileEmbedding(
  userId: string,
  options: { force?: boolean } = {}
): Promise<{ status: 'updated' | 'unchanged' | 'skipped'; reason?: string }> {
  if (!embeddingsEnabled()) {
    return { status: 'skipped', reason: 'HF_TOKEN not configured' }
  }

  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(
      'id, headline, department, location, bio, working_on, curious_about, fun_fact, embedding_source'
    )
    .eq('id', userId)
    .single()

  if (error || !profile) {
    return { status: 'skipped', reason: error?.message ?? 'profile not found' }
  }

  const { data: interestRows } = await supabase
    .from('user_interests')
    .select('interests (name)')
    .eq('user_id', userId)

  // PostgREST types an embedded one-to-one as an array here; the runtime shape
  // is a single object, so narrow through `unknown` rather than fighting it.
  const interests = ((interestRows ?? []) as unknown as {
    interests: { name: string } | null
  }[])
    .map((row) => row.interests?.name)
    .filter((name): name is string => Boolean(name))

  const source = buildProfileText({ ...profile, interests })

  if (!source) {
    return { status: 'skipped', reason: 'profile has no embeddable text yet' }
  }

  if (!options.force && source === profile.embedding_source) {
    return { status: 'unchanged' }
  }

  try {
    const vector = await embedOne(source)

    const { error: writeError } = await supabase
      .from('profiles')
      .update({
        embedding: JSON.stringify(vector),
        embedding_source: source,
        embedding_updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (writeError) {
      return { status: 'skipped', reason: writeError.message }
    }

    return { status: 'updated' }
  } catch (cause) {
    const reason =
      cause instanceof EmbeddingError ? cause.message : 'unexpected embedding failure'
    console.error('[matching] embedding sync failed:', reason)
    return { status: 'skipped', reason }
  }
}

/**
 * Ranked people for the current user, best first.
 *
 * Scoring lives in the `match_profiles` Postgres function so the ordering
 * happens next to the HNSW index instead of in Node. Users whose vector is
 * missing get a neutral 0.5 semantic score, which lets them still appear —
 * ranked by shared interests alone — rather than vanishing from discovery.
 */
export async function getMatches(
  userId: string,
  { limit = 24, minScore = 0 }: { limit?: number; minScore?: number } = {}
): Promise<MatchResult[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('match_profiles', {
    requester_id: userId,
    match_count: limit,
    min_score: minScore,
  })

  if (error) {
    console.error('[matching] match_profiles failed:', error.message)
    return []
  }

  return (data ?? []) as MatchResult[]
}

/**
 * Turns a match into a short, human sentence explaining the pairing.
 * Shared interests are concrete, so they lead; the vector score only fills in
 * when there is no overlap to point at.
 */
export function explainMatch(match: Pick<MatchResult, 'shared_interests' | 'score'>): string {
  const shared = match.shared_interests ?? []

  if (shared.length >= 3) {
    return `You both like ${shared[0]}, ${shared[1]}, and ${shared.length - 2} more`
  }
  if (shared.length === 2) {
    return `You both like ${shared[0]} and ${shared[1]}`
  }
  if (shared.length === 1) {
    return `You both like ${shared[0]}`
  }
  if (match.score >= 0.7) {
    return 'Your profiles read remarkably alike'
  }
  if (match.score >= 0.5) {
    return 'Similar interests, different corner of the org'
  }
  return 'A fresh perspective from outside your usual orbit'
}

/** Score as a whole-number percentage for display. */
export function scoreToPercent(score: number): number {
  return Math.round(Math.max(0, Math.min(1, score)) * 100)
}
