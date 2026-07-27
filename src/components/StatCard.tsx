'use client'

import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"
import { Card, CardContent } from "./ui/card"

interface StatCardProps {
  title: string
  value: string
  icon: LucideIcon
  colorClass: string
  index?: number
}

export function StatCard({ title, value, icon: Icon, colorClass, index = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.23, 1, 0.32, 1] }}
    >
      <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <h4 className="text-3xl font-bold text-foreground tracking-tight">{value}</h4>
          </div>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colorClass}`}>
            <Icon className="w-7 h-7" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
