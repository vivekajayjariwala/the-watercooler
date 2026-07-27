'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()

  const userId = formData.get('user_id') as string
  const name = formData.get('name') as string
  const title = formData.get('title') as string
  const bio = formData.get('bio') as string
  const selectedInterests = formData.getAll('interests') as string[]

  // Update profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      name,
      title,
      bio,
      updated_at: new Date().toISOString(),
    })

  if (profileError) {
    console.error('Error updating profile:', profileError)
    // Handle error (could redirect to an error page or return a message)
    return { error: 'Failed to update profile' }
  }

  // Update interests
  // First, delete all existing interests for the user
  const { error: deleteError } = await supabase
    .from('user_interests')
    .delete()
    .eq('user_id', userId)

  if (deleteError) {
    console.error('Error deleting old interests:', deleteError)
    return { error: 'Failed to update interests' }
  }

  // Then insert new ones
  if (selectedInterests.length > 0) {
    const interestInserts = selectedInterests.map((interestId) => ({
      user_id: userId,
      interest_id: interestId,
    }))

    const { error: insertError } = await supabase
      .from('user_interests')
      .insert(interestInserts)

    if (insertError) {
      console.error('Error inserting new interests:', insertError)
      return { error: 'Failed to save interests' }
    }
  }

  revalidatePath('/profile')
  revalidatePath('/dashboard')
  redirect('/dashboard') // After profile update, go to dashboard
}
