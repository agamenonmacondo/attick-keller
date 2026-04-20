'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion'

interface AnimatedCounterProps {
  value: number
  className?: string
}

export function AnimatedCounter({ value, className }: AnimatedCounterProps) {
  const [displayed, setDisplayed] = useState(value)
  const prevValue = useRef(value)
  const prefersReduced = usePrefersReducedMotion()

  useEffect(() => {
    if (prefersReduced) {
      setDisplayed(value)
      return
    }
    const from = prevValue.current
    const diff = value - from
    if (diff === 0) return

    const duration = 160
    const start = performance.now()

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(from + diff * eased))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    prevValue.current = value
  }, [value, prefersReduced])

  return (
    <span className={cn('inline-block tabular-nums', className)}>
      {displayed}
    </span>
  )
}