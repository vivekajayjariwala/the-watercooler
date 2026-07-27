import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

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
        <nav className="bg-background border-b border-thin sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <Link href="/" className="text-xl font-bold tracking-tight text-foreground">
                    The Watercooler.
                  </Link>
                </div>
              </div>
              <div className="flex items-center space-x-6 border-l border-thin pl-6 ml-6">
                {user ? (
                  <>
                    <Link href="/dashboard" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
                      Dashboard
                    </Link>
                    <Link href="/chat/requests" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
                      Chats
                    </Link>
                    <Link href="/profile" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
                      Profile
                    </Link>
                    <form action="/auth/signout" method="post" className="border-l border-thin pl-6 ml-2">
                      <button type="submit" className="text-sm font-medium text-foreground hover:opacity-70 transition-colors">
                        Sign Out &rarr;
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
                      Sign In
                    </Link>
                    <Link href="/signup" className="text-sm font-medium bg-foreground text-background px-4 py-2 rounded hover:opacity-90 transition-opacity">
                      Join &rarr;
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>
        <main className="flex-grow flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
