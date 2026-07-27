import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Bell, Droplets } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Watercooler",
  description: "Build meaningful relationships through shared interests.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    profile = data;
  }

  return (
    <html
      lang="en"
      className={`${inter.variable} font-sans h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40">
          <div className="container mx-auto px-4 sm:px-8 flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold tracking-tighter text-xl group">
              <div className="bg-gradient-blue p-1.5 rounded-lg text-white shadow-sm group-hover:scale-105 transition-transform">
                <Droplets className="w-5 h-5 fill-current" />
              </div>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
                Watercooler
              </span>
            </Link>
            <nav className="flex items-center gap-2 sm:gap-6">
              {user ? (
                <>
                  <div className="hidden md:flex items-center gap-6 mr-4">
                    <Link href="/dashboard" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                      Discover
                    </Link>
                    <Link href="/chat/requests" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                      Chats
                    </Link>
                  </div>
                  
                  <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground">
                    <Bell className="w-5 h-5" />
                  </Button>
                  
                  <Link href="/profile">
                    <Avatar className="h-9 w-9 ring-2 ring-transparent hover:ring-primary/20 transition-all cursor-pointer">
                      <AvatarImage src={profile?.avatar_url || ""} />
                      <AvatarFallback className="bg-blue-50 text-blue-700 font-medium">
                        {profile?.name ? profile.name.charAt(0).toUpperCase() : "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Link>

                  <form action="/auth/signout" method="post" className="hidden sm:block ml-2">
                    <Button variant="ghost" size="sm" type="submit" className="rounded-xl text-muted-foreground hover:text-foreground">
                      Sign Out
                    </Button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hidden sm:block">
                    Sign In
                  </Link>
                  <Link href="/signup">
                    <Button size="sm" className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="flex-1 flex flex-col relative z-0">
          {children}
        </main>
      </body>
    </html>
  );
}
