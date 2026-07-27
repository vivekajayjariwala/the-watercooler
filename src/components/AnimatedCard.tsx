'use client'

import { motion } from "framer-motion"
import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Card } from "./ui/card"

interface AnimatedCardProps {
  children: ReactNode
  className?: string
  index?: number
  onClick?: () => void
}

export function AnimatedCard({ children, className, index = 0, onClick }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        ease: [0.23, 1, 0.32, 1], // Custom spring-like easing
        delay: index * 0.05 
      }}
      whileHover={{ y: -4, scale: 1.02 }}
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-shadow duration-300 shadow-sm hover:shadow-hover",
        className
      )}
    >
      <Card className="h-full border-none overflow-hidden bg-card">
        {children}
      </Card>
    </motion.div>
  )
}
