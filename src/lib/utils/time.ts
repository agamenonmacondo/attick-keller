/**
 * Time utilities for Colombia timezone (America/Bogota)
 * Server-side safe — uses Intl.DateTimeFormat, not timezoneOffset
 */

export function getColombiaDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function getColombiaTime(): string {
  // Returns HH:MM in Colombia timezone
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())

  const hour = parts.find(p => p.type === 'hour')?.value ?? '00'
  const minute = parts.find(p => p.type === 'minute')?.value ?? '00'
  return `${hour}:${minute}`
}

export function getColombiaNow(): Date {
  // Get the current Colombia time as a JS Date (for comparison)
  const now = new Date()
  const colombiaOffset = getColombiaOffsetMinutes()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc + colombiaOffset * 60000)
}

function getColombiaOffsetMinutes(): number {
  // Colombia is UTC-5 year-round (no DST)
  return -5 * 60
}

/**
 * Parse "HH:MM" to total minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/**
 * Get total minutes from HH:MM:SS or HH:MM format
 */
export function timeToMinutesLoose(time: string): number {
  const parts = time.split(':').map(Number)
  return parts[0] * 60 + (parts[1] || 0)
}

/**
 * Calculate difference in minutes between two times
 * Positive = currentTime is after refTime
 * Negative = currentTime is before refTime
 */
export function diffMinutes(currentTime: string, refTime: string): number {
  return timeToMinutes(currentTime) - timeToMinutes(refTime)
}

/**
 * Check if current time is within a time range [start, end)
 */
export function isTimeInRange(currentTime: string, start: string, end: string): boolean {
  const now = timeToMinutes(currentTime)
  const s = timeToMinutes(start)
  const e = timeToMinutes(end)
  return now >= s && now < e
}

/**
 * Format HH:MM or HH:MM:SS to Colombia 12-hour format "7:30 p.m."
 */
export function formatTimeColombia(time: string): string {
  const mins = timeToMinutesLoose(time)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const period = h >= 12 ? 'p.m.' : 'a.m.'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`
}

/**
 * Format a time range "7:30 p.m. – 9:30 p.m."
 */
export function formatTimeRangeColombia(start: string, end: string): string {
  return `${formatTimeColombia(start)} – ${formatTimeColombia(end)}`
}

/**
 * Add minutes to a time string "HH:MM" → returns "HH:MM"
 */
export function addMinutesToTime(time: string, minutes: number): string {
  const total = timeToMinutes(time) + minutes
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}