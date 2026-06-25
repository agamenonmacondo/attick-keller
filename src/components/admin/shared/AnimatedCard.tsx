'use client'

import { useEffect, useRef, useState } from 'react'

interface AnimatedCardProps {
  children: React.ReactNode
  delay?: number
  className?: string
  hover?: boolean
}

export function AnimatedCard({ children, delay = 0, className = '', hover }: AnimatedCardProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay * 1000)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div
      ref={ref}
      className={`bg-[var(--bg-card)] rounded-xl shadow-[var(--shadow-card)] border border-[var(--border-default)] transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      } ${hover ? 'hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5' : ''} ${className}`}
    >
      {children}
    </div>
  )
}