'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Users, Coffee, Sparkles, MessageCircle } from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Hero Section */}
      <section className="relative flex-1 flex flex-col items-center justify-center pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        
        {/* Abstract Background Blobs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] opacity-30 pointer-events-none blur-[100px] -z-10">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 left-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply opacity-70"
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              rotate: [0, -90, 0],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-0 right-0 w-96 h-96 bg-sky-300 rounded-full mix-blend-multiply opacity-70"
          />
        </div>

        <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-medium mb-4"
          >
            <Sparkles className="w-4 h-4" />
            <span>The new way to network internally</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
            className="text-6xl sm:text-7xl lg:text-[80px] font-bold tracking-tight text-foreground leading-[1.05]"
          >
            Find your next <br className="hidden sm:block" />
            <span className="text-gradient-blue">favorite coworker.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="mx-auto max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed"
          >
            Watercooler helps teams build meaningful relationships through shared interests, spontaneous conversations, and coffee chats.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col sm:flex-row justify-center gap-4 pt-8"
          >
            <Link href="/signup">
              <Button size="lg" className="h-14 px-8 text-base font-semibold rounded-xl shadow-hover w-full sm:w-auto bg-primary hover:bg-primary/90">
                Get Started
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="h-14 px-8 text-base font-semibold rounded-xl w-full sm:w-auto border-border hover:bg-muted/50">
                Book Demo
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Abstract Illustration Cards */}
        <div className="relative w-full max-w-5xl mx-auto h-[400px] mt-24 hidden md:block">
          {/* Central Line connecting */}
          <svg className="absolute top-1/2 left-0 w-full h-full overflow-visible pointer-events-none -translate-y-1/2 opacity-20" viewBox="0 0 1000 200">
            <motion.path 
              d="M 100 100 Q 300 0 500 100 T 900 100" 
              fill="transparent" 
              stroke="url(#gradient)" 
              strokeWidth="2"
              strokeDasharray="10 10"
              animate={{ strokeDashoffset: [0, -100] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2563EB" />
                <stop offset="100%" stopColor="#38BDF8" />
              </linearGradient>
            </defs>
          </svg>

          {/* Floating Cards */}
          <motion.div 
            animate={{ y: [-10, 10, -10] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-10 left-20 glass rounded-2xl p-4 w-64 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="h-4 w-24 bg-foreground/10 rounded mb-2"></div>
              <div className="h-3 w-16 bg-foreground/5 rounded"></div>
            </div>
          </motion.div>

          <motion.div 
            animate={{ y: [10, -10, 10] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-32 right-32 glass rounded-2xl p-4 w-72 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center text-sky-600">
              <Coffee className="w-6 h-6" />
            </div>
            <div>
              <div className="h-4 w-32 bg-foreground/10 rounded mb-2"></div>
              <div className="h-3 w-20 bg-foreground/5 rounded"></div>
            </div>
          </motion.div>

          <motion.div 
            animate={{ y: [-5, 15, -5] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 glass rounded-2xl p-4 w-64 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="h-4 w-20 bg-foreground/10 rounded mb-2"></div>
              <div className="h-3 w-24 bg-foreground/5 rounded"></div>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Feature Grid */}
      <section className="py-24 bg-white border-t border-border/40">
        <div className="container mx-auto px-4 max-w-6xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-16">Trusted by modern teams</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-muted/30 border border-border/50 text-left">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Discover Connections</h3>
              <p className="text-muted-foreground leading-relaxed">Find colleagues across departments who share your passions and hobbies.</p>
            </div>
            <div className="p-8 rounded-3xl bg-muted/30 border border-border/50 text-left">
              <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center mb-6">
                <Coffee className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Spontaneous Chats</h3>
              <p className="text-muted-foreground leading-relaxed">Easily schedule 15-minute coffee breaks to expand your internal network.</p>
            </div>
            <div className="p-8 rounded-3xl bg-muted/30 border border-border/50 text-left">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Build Culture</h3>
              <p className="text-muted-foreground leading-relaxed">Foster a warmer, more connected company culture that people love.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
