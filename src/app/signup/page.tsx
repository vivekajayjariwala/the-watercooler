import { signup } from './actions'
import Link from 'next/link'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: { message?: string }
}) {
  const { message } = await searchParams

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm space-y-8 bg-background p-8 border-thin rounded-md shadow-sm">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            Join The Watercooler
          </h2>
          <p className="mt-2 text-sm text-foreground/70">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-foreground hover:underline">
              Sign in instead
            </Link>
          </p>
        </div>
        
        {message && (
          <div className="bg-blue-50 text-blue-700 p-3 rounded-md text-sm border border-blue-200">
            {message}
          </div>
        )}

        <form className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none block w-full px-3 py-2 border-thin bg-transparent placeholder-foreground/40 text-foreground rounded-md focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none block w-full px-3 py-2 border-thin bg-transparent placeholder-foreground/40 text-foreground rounded-md focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground sm:text-sm"
              />
            </div>
          </div>

          <div>
            <button
              formAction={signup}
              className="w-full flex justify-center py-2.5 px-4 border-thin rounded-md shadow-sm text-sm font-medium text-accent-foreground bg-accent hover:bg-accent/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-foreground transition-colors"
            >
              Sign Up
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
