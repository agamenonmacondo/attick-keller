/**
 * Format a time string to 12-hour Colombia format
 * "18:30:00" → "6:30 PM"
 * "09:00:00" → "9:00 AM"
 * "18:30"     → "6:30 PM"
 */
export function formatTime12(time: string | null | undefined): string {
  if (!time) return ''
  const clean = time.substring(0, 5) // handle "HH:MM:SS" or "HH:MM"
  const [h, m] = clean.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return time
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
}

/**
 * Format a time range to short 12-hour Colombia format
 * "18:30:00" - "20:30:00" → "6:30 – 8:30 PM"
 * "09:00:00" - "11:00:00" → "9:00 – 11:00 AM"
 * "09:00:00" - "14:00:00" → "9:00 AM – 2:00 PM"  (crosses noon)
 */
export function formatTimeRange12(start: string | null | undefined, end: string | null | undefined): string {
  if (!start) return ''
  const s = formatTime12(start)
  if (!end) return s
 
  // If same period (AM/PM), show once
  const startPeriod = start.substring(0, 2).padStart(2, '0')
  const endPeriod = end.substring(0, 2).padStart(2, '0')
  
  // Both start times share same AM/PM
  const sHour = parseInt(start.substring(0, 2))
  const eHour = parseInt(end.substring(0, 2))
  const samePeriod = (sHour < 12 && eHour < 12) || (sHour >= 12 && eHour >= 12)
  
  if (samePeriod) {
    // "6:30 – 8:30 PM"
    const sShort = s.replace(/ (AM|PM)$/, '')
    return `${sShort} – ${formatTime12(end)}`
  }
  
  // "9:00 AM – 2:00 PM"
  return `${s} – ${formatTime12(end)}`
}