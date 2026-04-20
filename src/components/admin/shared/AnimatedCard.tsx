'use client'

import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion'
import { cn } from '@/lib/utils/cn'

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]

interface AnimatedCardProps {
  children: ReactNode
  className?: string
  delay?: number
}

export function AnimatedCard({ children, className, delay = 0 }: AnimatedCardProps) {
  const prefersReduced = usePrefersReducedMotion()

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, transform: 'scale(0.95)' }}
      animate={{ opacity: 1, transform: 'scale(1)' }}
      transition={{
        duration: 0.2,
        ease: EASE_OUT,
        delay,
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}