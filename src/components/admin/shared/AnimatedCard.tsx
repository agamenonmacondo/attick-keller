'use client'

import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion'
import { cn } from '@/lib/utils/cn'

// Design system spring physics
const SPRING = { stiffness: 100, damping: 20, mass: 1 }
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]

interface AnimatedCardProps {
  children: ReactNode
  className?: string
  delay?: number
  hover?: boolean
}

export function AnimatedCard({ children, className, delay = 0, hover = false }: AnimatedCardProps) {
  const prefersReduced = usePrefersReducedMotion()

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        type: 'spring',
        ...SPRING,
        delay,
        duration: prefersReduced ? 0 : undefined,
      }}
      whileHover={hover ? { y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' } : undefined}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}

export { SPRING }