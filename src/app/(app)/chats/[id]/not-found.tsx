import { MessageSquareOff } from 'lucide-react'
import { EmptyState } from '@/components/kit/empty-state'
import { ButtonLink } from '@/components/ui/button'

export default function ThreadNotFound() {
  return (
    <EmptyState
      icon={<MessageSquareOff />}
      title="This chat isn't available"
      description="It may have been withdrawn, or you might not be part of this conversation."
      action={
        <ButtonLink variant="outline" size="lg" href="/chats">
          Back to chats
        </ButtonLink>
      }
    />
  )
}
