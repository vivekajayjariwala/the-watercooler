'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function respondToChat(formData: FormData) {
  const supabase = await createClient()

  const chatId = formData.get('chat_id') as string
  const status = formData.get('status') as string

  if (status !== 'accepted' && status !== 'declined') {
    return { error: 'Invalid status' }
  }

  const { error } = await supabase
    .from('coffee_chats')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', chatId)

  if (error) {
    console.error('Error updating chat status:', error)
    return { error: 'Failed to update request.' }
  }

  revalidatePath('/chat/requests')
  redirect('/chat/requests')
}
