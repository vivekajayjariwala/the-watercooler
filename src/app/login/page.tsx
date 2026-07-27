import { login } from './actions'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { message?: string }
}) {
  const { message } = await searchParams

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-[80px] pointer-events-none"></div>
      
      <Card className="w-full max-w-sm rounded-3xl border-none shadow-hover bg-white/80 backdrop-blur-xl relative z-10">
        <CardHeader className="space-y-2 text-center pt-8">
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">Welcome back</CardTitle>
          <CardDescription className="text-base">
            Enter your email and password to sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          {message && (
            <div className="bg-destructive/10 text-destructive p-3 mb-6 text-sm font-medium rounded-xl text-center">
              {message}
            </div>
          )}
          <form id="login-form" className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground font-medium">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                required
                className="rounded-xl bg-muted/20 border-border/50 h-12 px-4"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground font-medium">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="rounded-xl bg-muted/20 border-border/50 h-12 px-4"
              />
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 px-8 pb-8 border-t border-border/30 pt-8 bg-muted/10 rounded-b-3xl">
          <Button type="submit" form="login-form" formAction={login} className="w-full rounded-xl font-semibold shadow-sm h-12 text-base bg-primary hover:bg-primary/90">
            Sign In
          </Button>
          <p className="text-sm text-center text-muted-foreground w-full">
            Don't have an account?{' '}
            <Link href="/signup" className="text-primary font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
