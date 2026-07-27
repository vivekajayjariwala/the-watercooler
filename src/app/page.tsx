import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background text-center px-4 sm:px-6 lg:px-8 h-[calc(100vh-4rem)]">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tighter text-foreground leading-[1.1]">
          Connect. <br className="hidden sm:block" /> Share. Collaborate.
        </h1>
        <p className="mx-auto max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
          The Watercooler is the modern platform for your organization to build meaningful relationships. Discover colleagues with shared interests and easily schedule coffee chats.
        </p>
        <div className="flex justify-center gap-4 pt-8">
          <Button asChild size="lg" className="h-12 px-8 text-base font-semibold">
            <Link href="/signup">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base font-semibold">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
