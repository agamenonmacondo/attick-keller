'use client'

import { cn } from '@/lib/utils/cn'
import { SERVICE_FILTERS, type ServiceType } from '@/lib/utils/serviceHours'
import { Coffee, ForkKnife, Wine, CalendarDots } from '@phosphor-icons/react/dist/ssr'

type PhosphorIcon = typeof Coffee

const ICON_MAP: Record<string, PhosphorIcon> = {
  all: CalendarDots,
  breakfast: Coffee,
  lunch: ForkKnife,
  dinner: Wine,
}

interface ServiceFilterProps {
  active: ServiceType | 'all'
  onChange: (service: ServiceType | 'all') => void
  counts?: Record<string, number>
}

export function ServiceFilter({ active, onChange, counts }: ServiceFilterProps) {
  return (
    <div className="flex gap-1 border-b border-[var(--color-ak-madera)]/20 dark:border-white/10">
      {SERVICE_FILTERS.map((filter) => {
        const Icon = ICON_MAP[filter.icon] || CalendarDots
        const isActive = active === filter.id
        const count = counts?.[filter.id] ?? 0

        return (
          <button
            key={filter.id}
            onClick={() => onChange(filter.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all border-b-2 -mb-px',
              isActive
                ? 'border-[var(--color-ak-borgona)] text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-dorado)] dark:border-[var(--color-ak-dorado)]'
                : 'border-transparent text-[var(--color-ak-madera)]/60 dark:text-white/50 hover:text-[var(--color-ak-madera)] dark:hover:text-white/80'
            )}
          >
            <Icon size={16} weight={isActive ? 'fill' : 'regular'} />
            <span>{filter.label}</span>
            {count > 0 && (
              <span className={cn(
                'ml-1 px-1.5 py-0.5 text-xs rounded-full',
                isActive
                  ? 'bg-[var(--color-ak-borgona)]/15 dark:bg-[var(--color-ak-dorado)]/20 text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-dorado)]'
                  : 'bg-[var(--color-ak-madera)]/10 dark:bg-white/10 text-[var(--color-ak-madera)]/60 dark:text-white/40'
              )}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}