'use client'

import { useState, useEffect } from 'react'
import { Timer } from '@phosphor-icons/react/dist/ssr'
import type { ReservationTimeline } from '@/lib/hooks/useHostOccupancy'

interface SeatedTimerProps {
  reservation: ReservationTimeline
  compact?: boolean // Small version for table map popover
}

// Color thresholds based on time seated
// Green: < 45 min (normal dining pace)
// Yellow: 45-90 min (approaching limit)
// Red: > 90 min (overstaying)
const GREEN_THRESHOLD = 45 * 60 // 45 min in seconds
const YELLOW_THRESHOLD = 90 * 60 // 90 min in seconds

function getElapsedSeconds(seatedAt: string): number {
  const seatedDate = new Date(seatedAt)
  const now = new Date()
  return Math.max(0, Math.floor((now.getTime() - seatedDate.getTime()) / 1000))
}

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

function getColorClass(seatedAt: string): string {
  const elapsed = getElapsedSeconds(seatedAt)
  if (elapsed < GREEN_THRESHOLD) return 'text-emerald-400'
  if (elapsed < YELLOW_THRESHOLD) return 'text-amber-400'
  return 'text-red-400'
}

function getBgClass(seatedAt: string): string {
  const elapsed = getElapsedSeconds(seatedAt)
  if (elapsed < GREEN_THRESHOLD) return 'bg-emerald-400/10 border-emerald-400/20'
  if (elapsed < YELLOW_THRESHOLD) return 'bg-amber-400/10 border-amber-400/20'
  return 'bg-red-400/10 border-red-red-400/20'
}

export function SeatedTimer({ reservation, compact = false }: SeatedTimerProps) {
  const seatedAt = reservation.seated_at
  const isSeated = reservation.status === 'seated' && !!seatedAt

  const [elapsed, setElapsed] = useState(() =>
    isSeated ? getElapsedSeconds(seatedAt) : 0
  )

  useEffect(() => {
    if (!isSeated) return

    // Update every second for live timer
    const interval = setInterval(() => {
      setElapsed(getElapsedSeconds(seatedAt))
    }, 1000)

    return () => clearInterval(interval)
  }, [isSeated, seatedAt])

  if (!isSeated) return null

  const colorClass = getColorClass(seatedAt)
  const bgClass = getBgClass(seatedAt)

  if (compact) {
    // Compact version for table map popover — just the timer badge
    return (
      <div className={`inline-flex items-center gap-1 text-xs font-mono font-bold ${colorClass}`}>
        <Timer size={12} weight="bold" />
        <span>{formatTime(elapsed)}</span>
      </div>
    )
  }

  // Full version for reservation detail / queue cards
  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${bgClass}`}>
      <Timer size={16} weight="bold" className={colorClass} />
      <div className="flex flex-col">
        <span className={`text-xs font-mono font-bold tracking-wider ${colorClass}`}>
          {formatTime(elapsed)}
        </span>
        <span className="text-[10px] text-zinc-500 leading-tight">
          {elapsed < GREEN_THRESHOLD ? 'Tiempo normal' : elapsed < YELLOW_THRESHOLD ? 'Acercándose al límite' : 'Tiempo excedido'}
        </span>
      </div>
    </div>
  )
}