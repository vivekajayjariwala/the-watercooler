import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'

/**
 * A realtime channel that is guaranteed to be new.
 *
 * `createBrowserClient` hands back a singleton, and `supabase.channel(topic)`
 * returns the *existing* channel whenever one with that topic is already
 * registered. A channel that has been subscribed rejects further
 * `postgres_changes` listeners, so any second mount on a stable topic — React
 * Strict Mode's remount, or two components watching the same row — throws
 * "cannot add `postgres_changes` callbacks … after `subscribe()`".
 *
 * Suffixing the topic gives every subscription its own channel. The topic is
 * only a client-side routing key; the rows a subscriber receives come from the
 * filter passed to `.on()`, so this changes nothing about what is delivered.
 */
export function uniqueChannel(supabase: SupabaseClient, topic: string): RealtimeChannel {
  return supabase.channel(`${topic}:${crypto.randomUUID()}`)
}
