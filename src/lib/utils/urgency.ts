/**
 * Urgency computation for table display
 * Determines how soon a table's next reservation starts
 */

export type UrgencyLevel = 'urgent' | 'warning' | 'info' | 'none'

export type ReservationTimeline = {
  id: string
  status: 'pending' | 'confirmed' | 'pre_paid' | 'seated' | 'completed' | 'no_show' | 'cancelled'
  party_size: number
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  special_requests: string | null
  time_start: string   // "18:00"
  time_end: string     // "20:00"
  is_current: boolean  // reservation is happening now
  is_past: boolean     // reservation has ended
  is_upcoming: boolean // reservation hasn't started yet
}

/**
 * Compute urgency level based on minutes until next reservation
 * - urgent: ≤15 minutes
 * - warning: 16-30 minutes
 * - info: 31-60 minutes
 * - none: >60 minutes or no upcoming reservation
 */
export function computeUrgency(
  currentTimeHHMM: string,
  nextReservationStart: string | null
): UrgencyLevel {
  if (!nextReservationStart) return 'none'

  const currentMins = timeToMinutes(currentTimeHHMM)
  const nextMins = timeToMinutes(nextReservationStart)
  const diff = nextMins - currentMins

  if (diff <= 15) return 'urgent'
  if (diff <= 30) return 'warning'
  if (diff <= 60) return 'info'
  return 'none'
}

/**
 * Classify a reservation's time relationship to "now"
 */
export function classifyReservationTime(
  timeStart: string,
  timeEnd: string,
  currentTimeHHMM: string
): { is_current: boolean; is_past: boolean; is_upcoming: boolean } {
  const now = timeToMinutes(currentTimeHHMM)
  const start = timeToMinutes(timeStart)
  const end = timeToMinutes(timeEnd)

  return {
    is_current: now >= start && now < end,
    is_past: now >= end,
    is_upcoming: now < start,
  }
}

/**
 * Get the urgency badge label
 */
export function getUrgencyBadge(level: UrgencyLevel): string {
  switch (level) {
    case 'urgent': return '15m'
    case 'warning': return '30m'
    case 'info': return '1h'
    case 'none': return ''
  }
}

// Helper - same as in time.ts but local to avoid circular deps in server code
function timeToMinutes(time: string): number {
  const parts = time.split(':').map(Number)
  return parts[0] * 60 + (parts[1] || 0)
}

/**
 * CSS classes for urgency level
 */
export const URGENCY_STYLES: Record<UrgencyLevel, { border: string; dot: string; badge: string; pulse: string }> = {
  urgent: {
    border: 'border-[#C62828]',
    dot: 'bg-[#C62828]',
    badge: 'bg-[#C62828] text-white',
    pulse: 'animate-pulse',
  },
  warning: {
    border: 'border-[#E65100]',
    dot: 'bg-[#E65100]',
    badge: 'bg-[#E65100] text-white',
    pulse: '',
  },
  info: {
    border: 'border-[#1565C0]',
    dot: 'bg-[#1565C0]',
    badge: 'bg-[#1565C0] text-white',
    pulse: '',
  },
  none: {
    border: '',
    dot: '',
    badge: '',
    pulse: '',
  },
}