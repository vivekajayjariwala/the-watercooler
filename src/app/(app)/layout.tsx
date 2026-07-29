import { TopNav } from '@/components/shell/top-nav'
import { Toaster } from '@/components/kit/toaster'
import { requireProfile, getUnreadNotificationCount } from '@/lib/session'

/**
 * Chrome for every signed-in page. `requireProfile` doubles as the auth and
 * onboarding gate, so individual pages don't repeat those redirects.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile } = await requireProfile()
  const unread = await getUnreadNotificationCount(user.id)

  return (
    <div className="flex min-h-dvh flex-col">
      <TopNav
        userId={user.id}
        name={profile.full_name}
        avatarUrl={profile.avatar_url}
        unreadCount={unread}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
      <Toaster />
    </div>
  )
}
