'use client'

import { useState, useEffect } from 'react'
import { Timer, Clock } from '@phosphor-icons/react/dist/ssr'
import type { ReservationTimeline } from '@/lib/hooks/useHostOccupancy'

interface SeatedTimerProps {
  reservation: ReservationTimeline
  compact?: boolean // Small version for table map card
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
  return 'bg-red-400/10 border-red-400/20'
}

export function SeatedTimer({ reservation, compact = false }: SeatedTimerProps) {
  const isSeated = reservation.status === 'seated'

  // Use seated_at if available, otherwise fall back to time_start (today's date)
  // time_start is "HH:MM:SS" — we combine with today's date in Colombia timezone
  const seatedAt = reservation.seated_at
  const estimatedSeatedAt = seatedAt || (() => {
    if (!reservation.time_start) return null
    // Build an ISO timestamp for today at time_start (Colombia = UTC-5)
    const today = new Date()
    const [h, m] = reservation.time_start.split(':').map(Number)
    const iso = new Date(Date.UTC(
      today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(),
      h - 5 + 24, m, 0 // UTC-5 offset
    )).toISOString()
    return iso
  })()

  if (!isSeated || !estimatedSeatedAt) return null

  const isEstimated = !seatedAt

  const [elapsed, setElapsed] = useState(() =>
    getElapsedSeconds(estimatedSeatedAt)
  )

  useEffect(() => {
    if (!estimatedSeatedAt) return

    // Update every second for live timer
    const interval = setInterval(() => {
      setElapsed(getElapsedSeconds(estimatedSeatedAt))
    }, 1000)

    return () => clearInterval(interval)
  }, [estimatedSeatedAt])

  const colorClass = getColorClass(estimatedSeatedAt)
  const bgClass = getBgClass(estimatedSeatedAt)

  if (compact) {
    // Compact version for table map card — just the timer badge
    return (
      <div className={`inline-flex items-center gap-1 text-xs font-mono font-bold ${colorClass}`}>
        {isEstimated ? <Clock size={12} weight="bold" /> : <Timer size={12} weight="bold" />}
        <span>{formatTime(elapsed)}</span>
        {isEstimated && (
          <span className="text-[8px] font-sans normal-case opacity-60">est.</span>
        )}
      </div>
    )
  }

  // Full version for reservation detail / queue cards
  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${bgClass}`}>
      {isEstimated ? <Clock size={16} weight="bold" className={colorClass} /> : <Timer size={16} weight="bold" className={colorClass} />}
      <div className="flex flex-col">
        <span className={`text-xs font-mono font-bold tracking-wider ${colorClass}`}>
          {formatTime(elapsed)}
          {isEstimated && <span className="text-[8px] font-sans normal-case ml-1 opacity-60">~est.</span>}
        </span>
        <span className="text-[10px] text-zinc-500 leading-tight">
          {elapsed < GREEN_THRESHOLD ? 'Tiempo normal' : elapsed < YELLOW_THRESHOLD ? 'Acercándose al límite' : 'Tiempo excedido'}
        </span>
      </div>
    </div>
  )
}