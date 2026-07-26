import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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

import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

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
      <body className="min-h-full flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <Link href="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-teal-400">
                    💧 The Watercooler
                  </Link>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {user ? (
                  <>
                    <Link href="/dashboard" className="text-sm font-medium hover:text-blue-500 transition-colors">
                      Dashboard
                    </Link>
                    <Link href="/profile" className="text-sm font-medium hover:text-blue-500 transition-colors">
                      Profile
                    </Link>
                    <form action="/auth/signout" method="post">
                      <button type="submit" className="text-sm font-medium hover:text-red-500 transition-colors">
                        Sign Out
                      </button>
                    </form>
                  </>
                ) : (
                  <Link href="/login" className="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors shadow-sm">
                    Sign In
                  </Link>
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
