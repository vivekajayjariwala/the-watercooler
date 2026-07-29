import { createClient } from '@/utils/supabase/server'
import { findMutualCandidates, resolveTimeZone } from '@/lib/availability'
import type { AvailabilitySlot, ChatTimeProposal, LocationKind } from '@/lib/types'
import { SchedulePanelClient } from './schedule-panel-client'

/**
 * Scheduling for one chat.
 *
 * A server component so the proposal list and both people's availability are
 * fetched next to the database; only the interactive shell ships to the client.
 * Suggested times are computed here too — the overlap maths needs both users'
 * slots, which the browser has no business holding.
 */
export async function SchedulePanel({
  chatId,
  currentUserId,
  otherUserId,
  otherUserName,
  scheduledAt,
  durationMinutes,
  locationKind,
  locationDetail,
}: {
  chatId: string
  currentUserId: string
  otherUserId: string
  otherUserName: string | null
  scheduledAt: string | null
  durationMinutes: number | null
  locationKind: LocationKind | null
  locationDetail: string | null
}) {
  const supabase = await createClient()

  const [{ data: proposalRows }, { data: slotRows }, { data: profileRows }] =
    await Promise.all([
      supabase
        .from('chat_time_proposals')
        .select('*')
        .eq('chat_id', chatId)
        .eq('status', 'open')
        .order('start_at', { ascending: true }),
      supabase
        .from('availability_slots')
        .select('*')
        .in('user_id', [currentUserId, otherUserId]),
      supabase
        .from('profiles')
        .select('id, timezone')
        .in('id', [currentUserId, otherUserId]),
    ])

  const proposals = (proposalRows ?? []) as ChatTimeProposal[]
  const slots = (slotRows ?? []) as AvailabilitySlot[]
  const zones = new Map(
    ((profileRows ?? []) as { id: string; timezone: string | null }[]).map((row) => [
      row.id,
      resolveTimeZone(row.timezone),
    ])
  )

  const myZone = zones.get(currentUserId) ?? 'UTC'
  const theirZone = zones.get(otherUserId) ?? 'UTC'

  const mySlots = slots.filter((s) => s.user_id === currentUserId)
  const theirSlots = slots.filter((s) => s.user_id === otherUserId)

  // Empty when either side hasn't set availability — the panel falls back to a
  // manual picker rather than inventing times nobody said they were free for.
  const suggestions = findMutualCandidates(
    { slots: mySlots, timezone: myZone },
    { slots: theirSlots, timezone: theirZone },
    { durationMinutes: durationMinutes ?? 30, limit: 6, maxPerDay: 2 }
  ).map((date) => date.toISOString())

  return (
    <SchedulePanelClient
      chatId={chatId}
      currentUserId={currentUserId}
      otherUserName={otherUserName}
      myZone={myZone}
      theirZone={theirZone}
      scheduledAt={scheduledAt}
      durationMinutes={durationMinutes ?? 30}
      locationKind={locationKind ?? 'virtual'}
      locationDetail={locationDetail}
      proposals={proposals}
      suggestions={suggestions}
      hasMutualAvailability={mySlots.length > 0 && theirSlots.length > 0}
      hasOwnAvailability={mySlots.length > 0}
    />
  )
}
