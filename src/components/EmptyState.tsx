'use client'

import { motion } from "framer-motion"
import { ReactNode } from "react"
import { LucideIcon } from "lucide-react"
import { Button } from "./ui/button"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  primaryAction?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, primaryAction, secondaryAction }: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className="flex flex-col items-center justify-center text-center p-12 max-w-md mx-auto"
    >
      <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6 shadow-soft">
        <Icon className="w-10 h-10 stroke-[1.5]" />
      </div>
      <h3 className="text-2xl font-bold tracking-tight text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-base mb-8 leading-relaxed">
        {description}
      </p>
      
      <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
        {primaryAction && (
          <Button onClick={primaryAction.onClick} size="lg" className="rounded-xl shadow-sm">
            {primaryAction.label}
          </Button>
        )}
        {secondaryAction && (
          <Button onClick={secondaryAction.onClick} variant="secondary" size="lg" className="rounded-xl">
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </motion.div>
  )
}
