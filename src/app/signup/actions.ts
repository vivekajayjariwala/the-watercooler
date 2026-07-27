'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error, data: authData } = await supabase.auth.signUp(data)

  if (error) {
    redirect(`/signup?message=${encodeURIComponent(error.message)}`)
  }

  // If email confirmation is required by Supabase, session will be null
  if (!authData.session) {
    redirect(`/signup?message=${encodeURIComponent('Please check your email to verify your account before logging in.')}`)
  }

  revalidatePath('/', 'layout')
  redirect('/profile') // New users should go to profile setup
}
