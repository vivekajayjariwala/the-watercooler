'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { createClient } from '@/utils/supabase/server'

/**
 * Chat mutations.
 *
 * RLS is the real gate here — `coffee_chats` updates require participation and
 * `messages` inserts require an accepted chat. These functions add intent
 * checks on top (only the recipient may accept; only the initiator may
 * withdraw) because RLS alone would let either side do either.
 *
 * Notification rows come from database triggers. Never insert them here.
 */

export type ChatActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string }

const MAX_BODY = 4000

/** Accept or decline an incoming request. Only the recipient may do this. */
export async function respondToRequest(formData: FormData): Promise<void> {
  const session = await getSession()
  if (!session) redirect('/login')

  const chatId = String(formData.get('chatId') ?? '')
  const decision = String(formData.get('decision') ?? '')

  if (decision !== 'accepted' && decision !== 'declined') return

  const supabase = await createClient()

  const { data: chat } = await supabase
    .from('coffee_chats')
    .select('id, recipient_id, status')
    .eq('id', chatId)
    .maybeSingle()

  if (!chat || chat.recipient_id !== session.user.id || chat.status !== 'pending') {
    return
  }

  const { error } = await supabase
    .from('coffee_chats')
    .update({ status: decision, responded_at: new Date().toISOString() })
    .eq('id', chatId)

  if (error) {
    console.error('[chats] respondToRequest failed:', error.message)
    return
  }

  revalidatePath('/chats')
  revalidatePath('/discover')

  if (decision === 'accepted') redirect(`/chats/${chatId}`)
}

/** Withdraw a request you sent. Only the initiator may do this. */
export async function withdrawRequest(formData: FormData): Promise<void> {
  const session = await getSession()
  if (!session) redirect('/login')

  const chatId = String(formData.get('chatId') ?? '')
  const supabase = await createClient()

  const { data: chat } = await supabase
    .from('coffee_chats')
    .select('id, initiator_id, status')
    .eq('id', chatId)
    .maybeSingle()

  if (!chat || chat.initiator_id !== session.user.id || chat.status !== 'pending') {
    return
  }

  const { error } = await supabase
    .from('coffee_chats')
    .update({ status: 'cancelled' })
    .eq('id', chatId)

  if (error) console.error('[chats] withdrawRequest failed:', error.message)

  revalidatePath('/chats')
  revalidatePath('/discover')
}

/**
 * Sends a message. Returns a result rather than throwing so the composer can
 * roll its optimistic entry back and offer a retry.
 */
export async function sendMessage(
  _previous: ChatActionState,
  formData: FormData
): Promise<ChatActionState> {
  const session = await getSession()
  if (!session) {
    return { status: 'error', message: 'Your session expired. Sign in and try again.' }
  }

  const chatId = String(formData.get('chatId') ?? '')
  const body = String(formData.get('body') ?? '').trim()

  if (!body) return { status: 'idle' }
  if (body.length > MAX_BODY) {
    return { status: 'error', message: `Messages are capped at ${MAX_BODY} characters.` }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('messages')
    .insert({ chat_id: chatId, sender_id: session.user.id, body })

  if (error) {
    // RLS rejects inserts unless the parent chat is accepted, which is the most
    // likely cause of a failure here.
    console.error('[chats] sendMessage failed:', error.message)
    return {
      status: 'error',
      message: 'That message could not be sent. The chat may no longer be active.',
    }
  }

  revalidatePath(`/chats/${chatId}`)
  revalidatePath('/chats')
  return { status: 'idle' }
}

/** Marks the other person's messages in a thread as read. */
export async function markThreadRead(chatId: string): Promise<void> {
  const session = await getSession()
  if (!session) return

  const supabase = await createClient()

  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('chat_id', chatId)
    .neq('sender_id', session.user.id)
    .is('read_at', null)

  if (error) console.error('[chats] markThreadRead failed:', error.message)
}
