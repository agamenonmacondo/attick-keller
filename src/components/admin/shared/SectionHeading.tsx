import { type ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

interface SectionHeadingProps {
  children: ReactNode
  className?: string
}

export function SectionHeading({ children, className }: SectionHeadingProps) {
  return (
    <h3
      className={cn(
        'text-xs uppercase tracking-wider text-[#8D6E63] font-medium mb-2',
        className,
      )}
    >
      {children}
    </h3>
  )
}