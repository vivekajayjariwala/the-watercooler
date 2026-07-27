import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { updateProfile } from './actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: interests } = await supabase.from('interests').select('*').order('name')

  const { data: userInterests } = await supabase
    .from('user_interests')
    .select('interest_id')
    .eq('user_id', user.id)

  const userInterestIds = userInterests?.map((ui) => ui.interest_id) || []

  return (
    <div className="container mx-auto py-12 px-4 sm:px-8 max-w-3xl">
      <Card className="rounded-none">
        <CardHeader className="space-y-2 border-b mb-8 pb-6">
          <CardTitle className="text-3xl font-bold">Your Profile</CardTitle>
          <CardDescription className="text-base">
            Manage your personal information and select your interests to help coworkers find you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form id="profile-form" action={updateProfile} className="space-y-10">
            <input type="hidden" name="user_id" value={user.id} />

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  type="text"
                  name="name"
                  id="name"
                  defaultValue={profile?.name || ''}
                  required
                  className="rounded-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Job Title</Label>
                <Input
                  type="text"
                  name="title"
                  id="title"
                  defaultValue={profile?.title || ''}
                  className="rounded-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  name="bio"
                  id="bio"
                  rows={4}
                  defaultValue={profile?.bio || ''}
                  className="rounded-none resize-none"
                />
              </div>
            </div>

            <div className="pt-6 border-t">
              <div className="mb-6 space-y-2">
                <h3 className="text-xl font-semibold">Interests</h3>
                <p className="text-sm text-muted-foreground">Select the topics you enjoy to connect with others.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 sm:grid-cols-3">
                {interests?.map((interest) => (
                  <div key={interest.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`interest-${interest.id}`}
                      name="interests"
                      value={interest.id}
                      defaultChecked={userInterestIds.includes(interest.id)}
                      className="rounded-none"
                    />
                    <Label
                      htmlFor={`interest-${interest.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {interest.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="border-t pt-6 flex justify-end">
          <Button type="submit" form="profile-form" className="rounded-none font-semibold px-8">
            Save Profile
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
