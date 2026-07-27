'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function sendChatRequest(formData: FormData) {
  const supabase = await createClient()

  const initiatorId = formData.get('initiator_id') as string
  const recipientId = formData.get('recipient_id') as string
  const message = formData.get('message') as string

  const { error } = await supabase.from('coffee_chats').insert({
    initiator_id: initiatorId,
    recipient_id: recipientId,
    message,
    status: 'pending',
  })

  if (error) {
    console.error('Error sending chat request:', error)
    return { error: 'Failed to send request.' }
  }

  revalidatePath('/chat/requests')
  redirect('/chat/requests')
}
