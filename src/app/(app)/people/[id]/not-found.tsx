import { UserX } from 'lucide-react'
import { EmptyState } from '@/components/kit/empty-state'
import { ButtonLink } from '@/components/ui/button'

export default function PersonNotFound() {
  return (
    <EmptyState
      icon={<UserX />}
      title="We couldn't find that person"
      description="They may have left, or the link might be out of date."
      action={
        <ButtonLink variant="outline" size="lg" href="/discover">
          Back to discover
        </ButtonLink>
      }
    />
  )
}
