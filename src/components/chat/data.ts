import 'server-only'

import { createClient } from '@/utils/supabase/server'
import type { ChatStatus, CoffeeChat, Message, Profile } from '@/lib/types'

/** A chat joined with the other participant and its latest message. */
export interface ChatSummary {
  chat: CoffeeChat
  other: Pick<Profile, 'id' | 'full_name' | 'headline' | 'avatar_url' | 'department'>
  lastMessage: Message | null
  unreadCount: number
}

type ChatRow = CoffeeChat & {
  initiator: ChatSummary['other'] | null
  recipient: ChatSummary['other'] | null
}

const PARTICIPANT_FIELDS = 'id, full_name, headline, avatar_url, department'

/**
 * Every chat the user is part of, in one round trip, bucketed by role.
 *
 * Last messages and unread counts are fetched for the whole set at once rather
 * than per row — an inbox of 30 chats would otherwise be 60 extra queries.
 */
export async function getChatSummaries(userId: string): Promise<{
  incoming: ChatSummary[]
  active: ChatSummary[]
  sent: ChatSummary[]
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('coffee_chats')
    .select(
      `*,
       initiator:profiles!initiator_id ( ${PARTICIPANT_FIELDS} ),
       recipient:profiles!recipient_id ( ${PARTICIPANT_FIELDS} )`
    )
    .or(`initiator_id.eq.${userId},recipient_id.eq.${userId}`)
    .in('status', ['pending', 'accepted'])
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[chats] summary query failed:', error.message)
    return { incoming: [], active: [], sent: [] }
  }

  const rows = (data ?? []) as unknown as ChatRow[]
  const chatIds = rows.map((row) => row.id)

  const [messagesByChat, unreadByChat] = await Promise.all([
    getLastMessages(chatIds),
    getUnreadCounts(chatIds, userId),
  ])

  const incoming: ChatSummary[] = []
  const active: ChatSummary[] = []
  const sent: ChatSummary[] = []

  for (const row of rows) {
    const isInitiator = row.initiator_id === userId
    const other = isInitiator ? row.recipient : row.initiator
    if (!other) continue

    const { initiator: _i, recipient: _r, ...chat } = row
    const summary: ChatSummary = {
      chat,
      other,
      lastMessage: messagesByChat.get(row.id) ?? null,
      unreadCount: unreadByChat.get(row.id) ?? 0,
    }

    if (row.status === 'accepted') active.push(summary)
    else if (isInitiator) sent.push(summary)
    else incoming.push(summary)
  }

  return { incoming, active, sent }
}

/** Most recent message per chat. */
async function getLastMessages(chatIds: string[]): Promise<Map<string, Message>> {
  const byChat = new Map<string, Message>()
  if (chatIds.length === 0) return byChat

  const supabase = await createClient()

  // Ordered newest-first, so the first row seen for each chat is its latest.
  const { data } = await supabase
    .from('messages')
    .select('*')
    .in('chat_id', chatIds)
    .order('created_at', { ascending: false })
    .limit(400)

  for (const message of (data ?? []) as Message[]) {
    if (!byChat.has(message.chat_id)) byChat.set(message.chat_id, message)
  }

  return byChat
}

/** Unread counts, counting only messages the other person sent. */
async function getUnreadCounts(
  chatIds: string[],
  userId: string
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (chatIds.length === 0) return counts

  const supabase = await createClient()

  const { data } = await supabase
    .from('messages')
    .select('chat_id')
    .in('chat_id', chatIds)
    .neq('sender_id', userId)
    .is('read_at', null)

  for (const row of (data ?? []) as { chat_id: string }[]) {
    counts.set(row.chat_id, (counts.get(row.chat_id) ?? 0) + 1)
  }

  return counts
}

export interface ThreadData {
  chat: CoffeeChat
  other: ChatSummary['other']
  messages: Message[]
  isInitiator: boolean
}

/** A single thread with its participants and message history. */
export async function getThread(
  chatId: string,
  userId: string
): Promise<ThreadData | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('coffee_chats')
    .select(
      `*,
       initiator:profiles!initiator_id ( ${PARTICIPANT_FIELDS} ),
       recipient:profiles!recipient_id ( ${PARTICIPANT_FIELDS} )`
    )
    .eq('id', chatId)
    .maybeSingle()

  if (!data) return null

  const row = data as unknown as ChatRow

  // RLS should already have filtered this out, but participation decides what
  // renders, so check it explicitly rather than inferring from a missing row.
  if (row.initiator_id !== userId && row.recipient_id !== userId) return null

  const isInitiator = row.initiator_id === userId
  const other = isInitiator ? row.recipient : row.initiator
  if (!other) return null

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })
    .limit(200)

  const { initiator: _i, recipient: _r, ...chat } = row

  return {
    chat,
    other,
    messages: (messages ?? []) as Message[],
    isInitiator,
  }
}

/** Human label for a chat's state, from the viewer's perspective. */
export function statusLabel(status: ChatStatus, isInitiator: boolean): string {
  switch (status) {
    case 'pending':
      return isInitiator ? 'Waiting for a reply' : 'Awaiting your answer'
    case 'accepted':
      return 'Active'
    case 'declined':
      return 'Declined'
    case 'cancelled':
      return 'Withdrawn'
    case 'completed':
      return 'Done'
  }
}
