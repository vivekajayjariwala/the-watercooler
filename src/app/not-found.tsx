import type { Metadata } from 'next'
import { SearchX } from 'lucide-react'
import { EmptyState } from '@/components/kit/empty-state'
import { ButtonLink } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Page not found' }

/**
 * The catch-all 404. Segments that can 404 on a specific record — a person, a
 * chat — ship their own `not-found.tsx` so they can say which thing is missing;
 * this one only handles URLs that never mapped to anything.
 *
 * `/discover` is the second action rather than the first: someone who mistyped
 * a URL is already signed in more often than not, and that is where they were
 * headed. Signed-out visitors get bounced to login by the proxy anyway.
 */
export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-24 sm:px-6">
      <EmptyState
        icon={<SearchX />}
        title="Page not found"
        description="That link doesn't go anywhere. It may have moved, or never existed."
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <ButtonLink size="lg" href="/discover">
              Discover people
            </ButtonLink>
            <ButtonLink variant="outline" size="lg" href="/">
              Home
            </ButtonLink>
          </div>
        }
      />
    </div>
  )
}
