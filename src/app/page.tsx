import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex-grow flex bg-background">
      {/* Left Side: Content */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24">
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-foreground leading-tight mb-6">
          Connect with <br />
          Coworkers. <br />
          Grab a Coffee.
        </h1>
        <p className="text-lg text-foreground/70 max-w-md mb-10 leading-relaxed font-light">
          The Watercooler unifies your team's interests and schedules into a single platform. 
          Discover coworkers with shared hobbies and easily schedule coffee chats to build stronger relationships across your organization.
        </p>
        <div className="flex gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-6 py-3 border-thin rounded-md bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/80 transition-colors shadow-sm"
          >
            Join now &rarr;
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-3 border-thin rounded-md bg-transparent text-foreground text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>

      {/* Right Side: Graphic/Pattern */}
      <div className="hidden lg:flex w-1/2 border-l border-border bg-[url('/grid.svg')] bg-center bg-repeat relative">
        <div className="absolute inset-0 bg-background/50"></div>
        {/* Abstract decorative elements inspired by schematic */}
        <div className="absolute top-1/4 left-1/4 w-full border-t border-border border-dashed opacity-50"></div>
        <div className="absolute top-1/2 left-0 w-full border-t border-border opacity-70"></div>
        <div className="absolute top-3/4 left-1/4 w-full border-t border-border border-dashed opacity-50"></div>
        
        <div className="absolute top-0 bottom-0 left-1/3 border-l border-border opacity-30"></div>
        <div className="absolute top-0 bottom-0 left-2/3 border-l border-border opacity-30"></div>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-16 pointer-events-none z-10 opacity-70">
           {/* Decorative generic UI pieces */}
           <div className="w-64 h-16 border-thin bg-background/80 flex items-center px-4 gap-4">
              <div className="w-8 h-8 rounded-full border-thin bg-muted"></div>
              <div className="h-2 w-24 bg-muted rounded-full"></div>
           </div>
           <div className="w-80 h-16 border-thin bg-background/80 flex items-center px-4 gap-4 translate-x-12">
              <div className="w-8 h-8 rounded-full border-thin bg-muted"></div>
              <div className="h-2 w-32 bg-muted rounded-full"></div>
           </div>
           <div className="w-72 h-16 border-thin bg-background/80 flex items-center px-4 gap-4 -translate-x-8">
              <div className="w-8 h-8 rounded-full border-thin bg-muted"></div>
              <div className="h-2 w-20 bg-muted rounded-full"></div>
           </div>
        </div>
      </div>
    </div>
  );
}
