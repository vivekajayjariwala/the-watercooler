import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { sendChatRequest } from './actions'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default async function RequestChatPage({
  searchParams,
}: {
  searchParams: { to?: string }
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { to: recipientId } = await searchParams

  if (!recipientId) {
    redirect('/dashboard')
  }

  const { data: recipient } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', recipientId)
    .single()

  if (!recipient) {
    redirect('/dashboard')
  }

  return (
    <div className="container mx-auto py-12 px-4 sm:px-8 max-w-2xl">
      <Card className="rounded-none">
        <CardHeader className="space-y-2 border-b mb-6 pb-6">
          <CardTitle className="text-3xl font-bold">Schedule Coffee Chat</CardTitle>
          <CardDescription className="text-base">
            Send a request to connect with <span className="font-semibold text-foreground">{recipient.name}</span> over a coffee or tea.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form id="request-form" action={sendChatRequest} className="space-y-6">
            <input type="hidden" name="initiator_id" value={user.id} />
            <input type="hidden" name="recipient_id" value={recipient.id} />

            <div className="space-y-3">
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                name="message"
                id="message"
                rows={5}
                placeholder="Hi! I saw we both like Hiking. Would love to grab a coffee and chat about your recent trips."
                className="rounded-none resize-none"
              />
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-end space-x-4 border-t pt-6">
          <Button asChild variant="outline" className="rounded-none px-6">
            <Link href="/dashboard">Cancel</Link>
          </Button>
          <Button type="submit" form="request-form" className="rounded-none px-6 font-semibold">
            Send Request
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
