'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (password !== confirmPassword) {
    redirect(`/signup?message=${encodeURIComponent("Passwords do not match.")}`)
  }

  const { error, data: authData } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      }
    }
  })

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
