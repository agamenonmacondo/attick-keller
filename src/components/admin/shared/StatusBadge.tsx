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
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-400',
  },
  pre_paid: {
    label: 'Pre-pagado',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-400',
  },
  confirmed: {
    label: 'Confirmado',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-400',
  },
  seated: {
    label: 'Sentado',
    bg: 'bg-[#6B2737]/10',
    text: 'text-[#6B2737]',
    dot: 'bg-[#6B2737]',
  },
  completed: {
    label: 'Completado',
    bg: 'bg-zinc-50',
    text: 'text-zinc-600',
    dot: 'bg-zinc-400',
  },
  cancelled: {
    label: 'Cancelado',
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-400',
  },
  no_show: {
    label: 'No asistio',
    bg: 'bg-zinc-100',
    text: 'text-zinc-700',
    dot: 'bg-zinc-700',
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