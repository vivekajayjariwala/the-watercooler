/**
 * Shared domain types. These mirror `supabase/migrations/0001_watercooler_core.sql`
 * exactly — if you change one, change the other.
 */

export type ChatPreference = 'virtual' | 'in_person' | 'either'
export type ChatStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed'
export type LocationKind = 'virtual' | 'in_person'
export type ProposalStatus = 'open' | 'accepted' | 'declined' | 'withdrawn'
export type InterestCategory = 'craft' | 'topic' | 'hobby' | 'lifestyle'

export type NotificationType =
  | 'chat_request'
  | 'chat_accepted'
  | 'chat_declined'
  | 'new_message'
  | 'time_proposed'
  | 'time_confirmed'

export interface Profile {
  id: string
  full_name: string | null
  headline: string | null
  department: string | null
  location: string | null
  timezone: string | null
  pronouns: string | null
  bio: string | null
  avatar_url: string | null
  working_on: string | null
  curious_about: string | null
  fun_fact: string | null
  chat_preference: ChatPreference
  open_to_matching: boolean
  embedding_source: string | null
  embedding_updated_at: string | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface Interest {
  id: string
  slug: string
  name: string
  category: InterestCategory
  emoji: string | null
}

export interface AvailabilitySlot {
  id: string
  user_id: string
  /** 0 = Sunday … 6 = Saturday */
  weekday: number
  /** Minutes from midnight, UTC. */
  start_minute: number
  end_minute: number
  created_at: string
}

export interface CoffeeChat {
  id: string
  initiator_id: string
  recipient_id: string
  status: ChatStatus
  message: string | null
  match_score: number | null
  match_reasons: string[] | null
  scheduled_at: string | null
  duration_minutes: number | null
  location_kind: LocationKind | null
  location_detail: string | null
  responded_at: string | null
  created_at: string
  updated_at: string
}

export interface ChatTimeProposal {
  id: string
  chat_id: string
  proposed_by: string
  start_at: string
  status: ProposalStatus
  created_at: string
}

export interface Message {
  id: string
  chat_id: string
  sender_id: string
  body: string
  read_at: string | null
  created_at: string
}

export interface AppNotification {
  id: string
  user_id: string
  actor_id: string | null
  type: NotificationType
  chat_id: string | null
  title: string
  body: string | null
  href: string | null
  read_at: string | null
  created_at: string
}

/** Row shape returned by the `match_profiles` RPC. */
export interface MatchResult {
  id: string
  full_name: string | null
  headline: string | null
  department: string | null
  location: string | null
  avatar_url: string | null
  bio: string | null
  working_on: string | null
  /** Blended score, 0..1. This is what the UI shows as a percentage. */
  score: number
  /** Raw cosine similarity, 0..1. */
  semantic_score: number
  shared_interests: string[]
}

/** A person card enriched with their interest list, used across discovery UI. */
export interface ProfileWithInterests extends Profile {
  interests: Interest[]
}
