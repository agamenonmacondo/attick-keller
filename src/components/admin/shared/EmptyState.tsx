import { type ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  className?: string
}

export function EmptyState({ icon, title, description, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <div className="mb-3 text-[var(--text-secondary)] dark:text-[var(--color-ak-madera-light)]">{icon}</div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
      )}
    </div>
  )
}