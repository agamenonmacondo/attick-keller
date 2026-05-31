import { cn } from '@/lib/utils/cn'

const TIER_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  none: {
    label: 'Nuevo',
    bg: 'bg-[var(--text-muted)]/10',
    text: 'text-[var(--text-secondary)]',
  },
  bronze: {
    label: 'Bronce',
    bg: 'bg-[var(--color-warning)]/10',
    text: 'text-[var(--color-warning)]',
  },
  bronce: {
    label: 'Bronce',
    bg: 'bg-[var(--color-warning)]/10',
    text: 'text-[var(--color-warning)]',
  },
  silver: {
    label: 'Plata',
    bg: 'bg-[var(--text-secondary)]/10',
    text: 'text-[var(--text-secondary)]',
  },
  plata: {
    label: 'Plata',
    bg: 'bg-[var(--text-secondary)]/10',
    text: 'text-[var(--text-secondary)]',
  },
  gold: {
    label: 'Oro',
    bg: 'bg-[var(--color-ak-dorado)]/15',
    text: 'text-[var(--color-ak-dorado)]',
  },
  oro: {
    label: 'Oro',
    bg: 'bg-[var(--color-ak-dorado)]/15',
    text: 'text-[var(--color-ak-dorado)]',
  },
}

interface TierBadgeProps {
  tier: string
  className?: string
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  const config = TIER_CONFIG[tier] ?? TIER_CONFIG.none

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        config.bg,
        config.text,
        className,
      )}
    >
      {config.label}
    </span>
  )
}