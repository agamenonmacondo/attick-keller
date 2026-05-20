import { type ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

type ReservationStatus =
  | 'pending'
  | 'pre_paid'
  | 'confirmed'
  | 'seated'
  | 'completed'
  | 'cancelled'
  | 'no_show'

interface StatusConfig {
  label: string
  bg: string
  text: string
  dot: string
}

export const STATUS_CONFIG: Record<ReservationStatus, StatusConfig> = {
  pending: {
    label: 'Pendiente',
    bg: 'bg-[var(--color-warning)]/10',
    text: 'text-[var(--color-warning)]',
    dot: 'bg-[var(--color-warning)]',
  },
  pre_paid: {
    label: 'Pre-pagado',
    bg: 'bg-[var(--color-accent)]/10',
    text: 'text-[var(--color-accent)]',
    dot: 'bg-[var(--color-accent)]',
  },
  confirmed: {
    label: 'Confirmado',
    bg: 'bg-[var(--color-success)]/10',
    text: 'text-[var(--color-success)]',
    dot: 'bg-[var(--color-success)]',
  },
  seated: {
    label: 'Sentado',
    bg: 'bg-[var(--color-ak-borgona)]/10',
    text: 'text-[var(--color-ak-borgona)]',
    dot: 'bg-[var(--color-ak-borgona)]',
  },
  completed: {
    label: 'Completado',
    bg: 'bg-[var(--text-muted)]/10',
    text: 'text-[var(--text-secondary)]',
    dot: 'bg-[var(--text-muted)]',
  },
  cancelled: {
    label: 'Cancelado',
    bg: 'bg-[var(--color-danger)]/10',
    text: 'text-[var(--color-danger)]',
    dot: 'bg-[var(--color-danger)]',
  },
  no_show: {
    label: 'No asistio',
    bg: 'bg-[var(--text-muted)]/10',
    text: 'text-[var(--text-secondary)]',
    dot: 'bg-[var(--text-muted)]',
  },
}

export function getStatusConfig(status: string): StatusConfig {
  return STATUS_CONFIG[status as ReservationStatus] ?? STATUS_CONFIG.pending
}

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
  showDot?: boolean
  className?: string
}

export function StatusBadge({ status, size = 'sm', showDot = true, className }: StatusBadgeProps) {
  const config = getStatusConfig(status)

  const sizeClasses = size === 'md'
    ? 'px-3 py-1.5 text-sm'
    : 'px-2 py-0.5 text-xs'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.bg,
        config.text,
        sizeClasses,
        className,
      )}
    >
      {showDot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      )}
      {config.label}
    </span>
  )
}