import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { updateProfile } from './actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Camera, Settings, Star, Zap, Coffee, Flame } from "lucide-react"

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
    <div className="flex flex-col min-h-full pb-20">
      
      {/* Gradient Header */}
      <div className="h-64 sm:h-80 w-full bg-gradient-blue relative flex flex-col justify-end">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="container mx-auto px-4 sm:px-8 max-w-5xl relative z-10 translate-y-1/2 flex items-end justify-between">
          <div className="flex items-end gap-6">
            <div className="relative group">
              <Avatar className="w-32 h-32 sm:w-40 sm:h-40 ring-4 ring-white shadow-xl bg-white">
                <AvatarImage src={profile?.avatar_url || ""} className="object-cover" />
                <AvatarFallback className="text-4xl sm:text-5xl bg-blue-50 text-blue-700 font-bold">
                  {profile?.name ? profile.name.charAt(0).toUpperCase() : "U"}
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-2 right-2 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-muted-foreground hover:text-primary transition-colors border border-border/50 opacity-0 group-hover:opacity-100 focus:opacity-100">
                <Camera className="w-5 h-5" />
              </button>
            </div>
            <div className="pb-4 hidden sm:block">
              <h1 className="text-3xl font-bold text-foreground bg-white/90 backdrop-blur-md px-4 py-1 rounded-2xl shadow-sm inline-block">
                {profile?.name || 'Your Profile'}
              </h1>
            </div>
          </div>
          <div className="pb-4">
            <Button variant="outline" className="rounded-xl shadow-sm bg-white/90 backdrop-blur-md border-transparent hover:bg-white flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-8 max-w-5xl pt-24 sm:pt-28 flex flex-col lg:flex-row gap-8">
        
        {/* Left Column - Stats / Achievements */}
        <div className="w-full lg:w-1/3 space-y-6">
          <Card className="rounded-2xl border-none shadow-sm bg-white">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                Achievements
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-muted/30 p-3 rounded-xl border border-border/50">
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">1 Day Streak</p>
                    <p className="text-xs text-muted-foreground">Log in tomorrow!</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-muted/30 p-3 rounded-xl border border-border/50">
                  <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
                    <Coffee className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">0 Coffee Chats</p>
                    <p className="text-xs text-muted-foreground">Time to schedule one!</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-muted/30 p-3 rounded-xl border border-border/50">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Early Adopter</p>
                    <p className="text-xs text-muted-foreground">Joined the platform early</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Edit Form */}
        <div className="w-full lg:w-2/3">
          <Card className="rounded-2xl border-none shadow-sm bg-white overflow-hidden">
            <form id="profile-form" action={updateProfile} className="flex flex-col h-full">
              <input type="hidden" name="user_id" value={user.id} />
              
              <div className="p-6 sm:p-8 space-y-8">
                <div className="space-y-6">
                  <h3 className="font-bold text-xl text-foreground">Basic Information</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-muted-foreground font-medium">Full Name</Label>
                      <Input
                        type="text"
                        name="name"
                        id="name"
                        defaultValue={profile?.name || ''}
                        required
                        className="rounded-xl shadow-sm bg-muted/10 border-border/50 focus-visible:ring-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-muted-foreground font-medium">Job Title</Label>
                      <Input
                        type="text"
                        name="title"
                        id="title"
                        defaultValue={profile?.title || ''}
                        className="rounded-xl shadow-sm bg-muted/10 border-border/50 focus-visible:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-muted-foreground font-medium">Bio</Label>
                    <Textarea
                      name="bio"
                      id="bio"
                      rows={4}
                      defaultValue={profile?.bio || ''}
                      placeholder="Tell your coworkers a little about yourself..."
                      className="rounded-xl shadow-sm resize-none bg-muted/10 border-border/50 focus-visible:ring-primary"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-border/50">
                  <div className="mb-6 space-y-1">
                    <h3 className="font-bold text-xl text-foreground">Interests</h3>
                    <p className="text-sm text-muted-foreground">Select the topics you enjoy to connect with others.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {interests?.map((interest) => {
                      const isChecked = userInterestIds.includes(interest.id);
                      return (
                        <label 
                          key={interest.id} 
                          htmlFor={`interest-${interest.id}`}
                          className={`flex items-center space-x-3 p-4 rounded-xl border transition-all cursor-pointer select-none ${isChecked ? 'bg-blue-50 border-blue-200' : 'bg-white border-border/50 hover:bg-muted/30'}`}
                        >
                          <Checkbox
                            id={`interest-${interest.id}`}
                            name="interests"
                            value={interest.id}
                            defaultChecked={isChecked}
                            className="rounded-md"
                          />
                          <span className={`text-sm font-semibold ${isChecked ? 'text-blue-700' : 'text-foreground'}`}>
                            {interest.name}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-auto p-6 bg-muted/10 border-t border-border/50 flex justify-end">
                <Button type="submit" size="lg" className="rounded-xl font-semibold px-8 shadow-sm">
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>

      </div>
    </div>
  )
}
