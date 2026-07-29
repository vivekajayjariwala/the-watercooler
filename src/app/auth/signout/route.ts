import { revalidatePath } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * Sign out. POST only — a GET route here would let any `<img src>` on the
 * internet log people out of the app.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await supabase.auth.signOut()
  }

  // Every layout above reads the session, so the whole tree is stale now.
  revalidatePath('/', 'layout')

  // 303 so the browser follows with GET instead of re-POSTing to `/`.
  return NextResponse.redirect(new URL('/', request.url), { status: 303 })
}
