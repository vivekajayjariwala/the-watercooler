'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'
import { createClient } from '@/utils/supabase/server'
import type { LocationKind } from '@/lib/types'

/**
 * Scheduling mutations.
 *
 * Setting `coffee_chats.scheduled_at` fires the `time_confirmed` notification
 * to both participants via the database trigger — never write those rows here.
 */

export type ScheduleState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }

const MAX_PROPOSALS = 3
/** Don't accept a proposal for a time that has already passed. */
const MIN_LEAD_MS = 5 * 60 * 1000

async function assertParticipant(chatId: string, userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('coffee_chats')
    .select('id, initiator_id, recipient_id, status')
    .eq('id', chatId)
    .maybeSingle()

  if (!data) return null
  if (data.initiator_id !== userId && data.recipient_id !== userId) return null
  return data
}

/** Offer up to three times. Replaces any of your own still-open proposals. */
export async function proposeTimes(
  _previous: ScheduleState,
  formData: FormData
): Promise<ScheduleState> {
  const session = await getSession()
  if (!session) return { status: 'error', message: 'Your session expired.' }

  const userId = session.user.id
  const chatId = String(formData.get('chatId') ?? '')

  const chat = await assertParticipant(chatId, userId)
  if (!chat) return { status: 'error', message: "We couldn't find that chat." }
  if (chat.status !== 'accepted') {
    return { status: 'error', message: 'This chat is not active.' }
  }

  const starts = formData
    .getAll('start')
    .map((value) => new Date(String(value)))
    .filter((date) => !Number.isNaN(date.getTime()) && date.getTime() > Date.now() + MIN_LEAD_MS)
    .slice(0, MAX_PROPOSALS)

  if (starts.length === 0) {
    return { status: 'error', message: 'Pick at least one time in the future.' }
  }

  const supabase = await createClient()

  // Withdraw your own open proposals first, so the other person sees one
  // coherent offer rather than an accumulating pile.
  await supabase
    .from('chat_time_proposals')
    .update({ status: 'withdrawn' })
    .eq('chat_id', chatId)
    .eq('proposed_by', userId)
    .eq('status', 'open')

  const { error } = await supabase.from('chat_time_proposals').upsert(
    starts.map((start) => ({
      chat_id: chatId,
      proposed_by: userId,
      start_at: start.toISOString(),
      status: 'open' as const,
    })),
    { onConflict: 'chat_id,start_at' }
  )

  if (error) {
    console.error('[schedule] proposeTimes failed:', error.message)
    return { status: 'error', message: 'Those times could not be sent.' }
  }

  revalidatePath(`/chats/${chatId}`)
  return {
    status: 'success',
    message: starts.length === 1 ? 'Time sent.' : `${starts.length} times sent.`,
  }
}

/**
 * Accepts a proposal and locks the chat to that time.
 *
 * Three writes that must agree: the proposal is accepted, its siblings are
 * declined, and the chat carries the confirmed time. If the chat update fails
 * the proposal is rolled back to open, so the pair never ends up with an
 * "accepted" slot the chat doesn't reflect.
 */
export async function acceptProposal(
  _previous: ScheduleState,
  formData: FormData
): Promise<ScheduleState> {
  const session = await getSession()
  if (!session) return { status: 'error', message: 'Your session expired.' }

  const userId = session.user.id
  const chatId = String(formData.get('chatId') ?? '')
  const proposalId = String(formData.get('proposalId') ?? '')

  const chat = await assertParticipant(chatId, userId)
  if (!chat) return { status: 'error', message: "We couldn't find that chat." }

  const supabase = await createClient()

  const { data: proposal } = await supabase
    .from('chat_time_proposals')
    .select('id, start_at, status, proposed_by')
    .eq('id', proposalId)
    .eq('chat_id', chatId)
    .maybeSingle()

  if (!proposal || proposal.status !== 'open') {
    return { status: 'error', message: 'That time is no longer available.' }
  }
  if (new Date(proposal.start_at).getTime() < Date.now()) {
    return { status: 'error', message: 'That time has already passed.' }
  }

  const duration = Number(formData.get('durationMinutes')) || 30
  const locationKind = (String(formData.get('locationKind') ?? 'virtual') === 'in_person'
    ? 'in_person'
    : 'virtual') as LocationKind
  const locationDetail = String(formData.get('locationDetail') ?? '').trim() || null

  const { error: acceptError } = await supabase
    .from('chat_time_proposals')
    .update({ status: 'accepted' })
    .eq('id', proposalId)

  if (acceptError) {
    console.error('[schedule] acceptProposal failed:', acceptError.message)
    return { status: 'error', message: 'That time could not be confirmed.' }
  }

  const { error: chatError } = await supabase
    .from('coffee_chats')
    .update({
      scheduled_at: proposal.start_at,
      duration_minutes: duration,
      location_kind: locationKind,
      location_detail: locationDetail,
    })
    .eq('id', chatId)

  if (chatError) {
    await supabase
      .from('chat_time_proposals')
      .update({ status: 'open' })
      .eq('id', proposalId)

    console.error('[schedule] chat update failed:', chatError.message)
    return {
      status: 'error',
      message: 'The time was not confirmed. Nothing was changed — please try again.',
    }
  }

  // Only now retire the alternatives; a failure here is cosmetic.
  await supabase
    .from('chat_time_proposals')
    .update({ status: 'declined' })
    .eq('chat_id', chatId)
    .eq('status', 'open')
    .neq('id', proposalId)

  revalidatePath(`/chats/${chatId}`)
  revalidatePath('/chats')
  return { status: 'success', message: 'Locked in.' }
}

/** Declines a single proposed time. */
export async function declineProposal(formData: FormData): Promise<void> {
  const session = await getSession()
  if (!session) return

  const chatId = String(formData.get('chatId') ?? '')
  const proposalId = String(formData.get('proposalId') ?? '')

  if (!(await assertParticipant(chatId, session.user.id))) return

  const supabase = await createClient()
  await supabase
    .from('chat_time_proposals')
    .update({ status: 'declined' })
    .eq('id', proposalId)
    .eq('chat_id', chatId)

  revalidatePath(`/chats/${chatId}`)
}

/** Clears a confirmed time so the pair can start again. */
export async function unscheduleChat(formData: FormData): Promise<void> {
  const session = await getSession()
  if (!session) return

  const chatId = String(formData.get('chatId') ?? '')
  if (!(await assertParticipant(chatId, session.user.id))) return

  const supabase = await createClient()

  await supabase
    .from('coffee_chats')
    .update({ scheduled_at: null, location_detail: null })
    .eq('id', chatId)

  await supabase
    .from('chat_time_proposals')
    .update({ status: 'withdrawn' })
    .eq('chat_id', chatId)
    .in('status', ['open', 'accepted'])

  revalidatePath(`/chats/${chatId}`)
  revalidatePath('/chats')
}

/** Replaces the signed-in user's weekly availability windows. */
export async function saveAvailability(
  _previous: ScheduleState,
  formData: FormData
): Promise<ScheduleState> {
  const session = await getSession()
  if (!session) return { status: 'error', message: 'Your session expired.' }

  const userId = session.user.id
  const supabase = await createClient()

  let windows: { weekday: number; start_minute: number; end_minute: number }[]
  try {
    const parsed = JSON.parse(String(formData.get('windows') ?? '[]')) as unknown
    if (!Array.isArray(parsed)) throw new Error('not an array')

    windows = parsed
      .map((w) => w as Record<string, unknown>)
      .filter(
        (w) =>
          Number.isInteger(w.weekday) &&
          Number.isInteger(w.start_minute) &&
          Number.isInteger(w.end_minute)
      )
      .map((w) => ({
        weekday: Number(w.weekday),
        start_minute: Number(w.start_minute),
        end_minute: Number(w.end_minute),
      }))
      .filter(
        (w) =>
          w.weekday >= 0 &&
          w.weekday <= 6 &&
          w.start_minute >= 0 &&
          w.end_minute > w.start_minute &&
          w.end_minute <= 1440
      )
  } catch {
    return { status: 'error', message: 'That availability could not be read.' }
  }

  await supabase.from('availability_slots').delete().eq('user_id', userId)

  if (windows.length > 0) {
    const { error } = await supabase
      .from('availability_slots')
      .insert(windows.map((w) => ({ ...w, user_id: userId })))

    if (error) {
      console.error('[schedule] saveAvailability failed:', error.message)
      return { status: 'error', message: 'Your availability could not be saved.' }
    }
  }

  revalidatePath('/settings')
  return { status: 'success', message: 'Availability saved.' }
}
