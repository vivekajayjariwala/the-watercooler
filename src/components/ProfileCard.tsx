'use client'

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { AnimatedCard } from "./AnimatedCard"
import Link from "next/link"
import { Calendar, Users } from "lucide-react"

interface Interest {
  id: string
  name: string
}

interface ProfileCardProps {
  id: string
  name: string
  title: string
  avatarUrl?: string
  interests: Interest[]
  index?: number
}

export function ProfileCard({ id, name, title, avatarUrl, interests, index = 0 }: ProfileCardProps) {
  return (
    <AnimatedCard index={index} className="flex flex-col h-full">
      <div className="p-6 flex-1 flex flex-col items-center text-center">
        <Avatar className="w-24 h-24 mb-4 ring-4 ring-blue-50/50 shadow-sm">
          <AvatarImage src={avatarUrl || ""} />
          <AvatarFallback className="text-2xl bg-blue-100 text-blue-700 font-medium">
            {name ? name.charAt(0).toUpperCase() : "U"}
          </AvatarFallback>
        </Avatar>
        <h3 className="text-xl font-bold tracking-tight mb-1">{name || "Anonymous User"}</h3>
        <p className="text-muted-foreground text-sm font-medium mb-6 flex items-center justify-center gap-1">
          <Users className="w-4 h-4 opacity-50" />
          {title || "Employee"}
        </p>
        
        <div className="flex flex-wrap gap-2 justify-center mt-auto">
          {interests.slice(0, 3).map((interest) => (
            <Badge key={interest.id} variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none px-3 font-medium">
              {interest.name}
            </Badge>
          ))}
          {interests.length > 3 && (
            <Badge variant="secondary" className="bg-muted text-muted-foreground border-none px-3">
              +{interests.length - 3}
            </Badge>
          )}
        </div>
      </div>
      <div className="p-4 border-t border-border/50 bg-muted/20">
        <Button asChild variant="outline" className="w-full rounded-xl shadow-sm hover:shadow-md transition-shadow bg-white text-primary border-primary/20 hover:border-primary/40 hover:bg-blue-50">
          <Link href={`/chat/request?to=${id}`} className="flex items-center justify-center gap-2">
            <Calendar className="w-4 h-4" />
            Request Coffee
          </Link>
        </Button>
      </div>
    </AnimatedCard>
  )
}
