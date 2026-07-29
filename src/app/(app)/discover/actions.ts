'use server'

import { revalidatePath } from 'next/cache'

import { getSession } from '@/lib/session'
import { createClient } from '@/utils/supabase/server'

/**
 * Discovery mutations.
 *
 * Only one for now: asking someone for a coffee. Notification rows are written
 * by the `coffee_chats_notify` trigger — never insert them from here.
 */

export type RequestChatState =
  | { status: 'idle' }
  | { status: 'success'; chatId: string; recipientName: string }
  /** A pending or accepted request already exists between these two. */
  | { status: 'duplicate'; recipientName: string }
  /** They exist, but they've turned matching off. */
  | { status: 'unavailable'; recipientName: string }
  | { status: 'error'; message: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_MESSAGE_LENGTH = 500
/** Postgres `unique_violation` — here, `coffee_chats_one_open_per_pair`. */
const UNIQUE_VIOLATION = '23505'

function firstNameOf(fullName: string | null): string {
  return fullName?.trim().split(/\s+/)[0] ?? 'them'
}

/**
 * The shared-interest snapshot is recomputed here rather than trusted from the
 * form: it is stored on the chat row as the durable pairing rationale, so it
 * has to reflect the database at request time.
 */
async function sharedInterestNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  otherId: string
): Promise<string[]> {
  const { data: mine } = await supabase
    .from('user_interests')
    .select('interest_id')
    .eq('user_id', userId)

  const ids = ((mine ?? []) as { interest_id: string }[]).map((row) => row.interest_id)
  if (ids.length === 0) return []

  const { data } = await supabase
    .from('user_interests')
    .select('interests ( name )')
    .eq('user_id', otherId)
    .in('interest_id', ids)

  return ((data ?? []) as unknown as { interests: { name: string } | null }[])
    .map((row) => row.interests?.name)
    .filter((name): name is string => Boolean(name))
    .sort((a, b) => a.localeCompare(b))
}

export async function requestChat(
  _previous: RequestChatState,
  formData: FormData
): Promise<RequestChatState> {
  const session = await getSession()
  if (!session?.profile) {
    return { status: 'error', message: 'Your session expired. Sign in and try again.' }
  }

  const userId = session.user.id
  const recipientId = String(formData.get('recipientId') ?? '').trim()

  if (!UUID.test(recipientId)) {
    return { status: 'error', message: "We couldn't find that person." }
  }
  if (recipientId === userId) {
    return { status: 'error', message: "You can't ask yourself for coffee." }
  }

  const message = String(formData.get('message') ?? '')
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH)

  const rawScore = Number(formData.get('score'))
  const matchScore = Number.isFinite(rawScore) ? Math.min(1, Math.max(0, rawScore)) : null

  const supabase = await createClient()

  const { data: recipient } = await supabase
    .from('profiles')
    .select('id, full_name, open_to_matching')
    .eq('id', recipientId)
    .maybeSingle()

  if (!recipient) {
    return { status: 'error', message: "We couldn't find that person." }
  }

  const recipientName = firstNameOf(recipient.full_name)

  if (!recipient.open_to_matching) {
    return { status: 'unavailable', recipientName }
  }

  // The unique index only covers this direction, so check both before writing —
  // a request that crosses in the post is still a duplicate to a human.
  const { data: existing } = await supabase
    .from('coffee_chats')
    .select('id')
    .in('status', ['pending', 'accepted'])
    .or(
      `and(initiator_id.eq.${userId},recipient_id.eq.${recipientId}),` +
        `and(initiator_id.eq.${recipientId},recipient_id.eq.${userId})`
    )
    .limit(1)
    .maybeSingle()

  if (existing) {
    return { status: 'duplicate', recipientName }
  }

  const matchReasons = await sharedInterestNames(supabase, userId, recipientId)

  const { data: chat, error } = await supabase
    .from('coffee_chats')
    .insert({
      initiator_id: userId,
      recipient_id: recipientId,
      message: message || null,
      match_score: matchScore,
      match_reasons: matchReasons,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { status: 'duplicate', recipientName }
    }
    console.error('[discover] requestChat failed:', error.message)
    return { status: 'error', message: 'Something went wrong sending that request.' }
  }

  // A new request removes this person from the ranked feed (the RPC filters out
  // anyone you already have a live chat with), so both routes need refreshing.
  revalidatePath('/discover')
  revalidatePath('/people/[id]', 'page')
  revalidatePath('/chats')

  return { status: 'success', chatId: chat.id as string, recipientName }
}
