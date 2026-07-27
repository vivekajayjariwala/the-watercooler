import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Watercooler",
  description: "Connect with your coworkers over shared interests.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 sm:px-8 flex h-16 items-center justify-between">
            <Link href="/" className="font-bold tracking-tighter text-xl">
              Watercooler
            </Link>
            <nav className="flex items-center gap-6">
              {user ? (
                <>
                  <Link href="/dashboard" className="text-sm font-medium transition-colors hover:text-primary">
                    Dashboard
                  </Link>
                  <Link href="/chat/requests" className="text-sm font-medium transition-colors hover:text-primary">
                    Chats
                  </Link>
                  <Link href="/profile" className="text-sm font-medium transition-colors hover:text-primary">
                    Profile
                  </Link>
                  <form action="/auth/signout" method="post">
                    <Button variant="outline" size="sm" type="submit" className="ml-2">
                      Sign Out
                    </Button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-sm font-medium transition-colors hover:text-primary">
                    Sign In
                  </Link>
                  <Button asChild size="sm">
                    <Link href="/signup">Sign Up</Link>
                  </Button>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
