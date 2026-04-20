import { cn } from '@/lib/utils/cn'

const TIER_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  none: {
    label: 'Nuevo',
    bg: 'bg-zinc-100',
    text: 'text-zinc-600',
  },
  bronce: {
    label: 'Bronce',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
  },
  plata: {
    label: 'Plata',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
  },
  oro: {
    label: 'Oro',
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
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