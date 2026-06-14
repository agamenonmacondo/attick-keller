/**
 * Get today's date in Colombia timezone (America/Bogota, UTC-5).
 * Uses Intl.DateTimeFormat with explicit IANA timezone for correctness
 * regardless of the user's local timezone or server timezone.
 */
export function getColombiaDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/**
 * Get a Date object representing the current moment in Colombia timezone.
 * The returned Date's internal UTC values are adjusted so that
 * toISOString() / getHours() etc. reflect Colombia local time.
 */
export function getColombiaNow(): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(new Date())

  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '0'

  return new Date(
    Date.UTC(
      parseInt(get('year')),
      parseInt(get('month')) - 1,
      parseInt(get('day')),
      parseInt(get('hour')),
      parseInt(get('minute')),
      parseInt(get('second')),
    )
  )
}

/**
 * Extract Colombia local hour from a DB timestamp.
 * DB stores Colombia local time with +00 offset (e.g. "2026-06-13T19:00:00+00").
 * Use getUTCHours() to get the raw hour without system timezone interference.
 * Usage: colombiaHour("2026-06-13T19:00:00+00") → 19 (7 PM Colombia)
 */
export function colombiaHour(isoString: string | null | undefined): number | null {
  if (!isoString) return null
  return new Date(isoString).getUTCHours()
}

/**
 * Extract Colombia local date (YYYY-MM-DD) from a DB timestamp.
 * DB stores Colombia local time with +00 offset.
 * Use getUTC*() to avoid system timezone double-shifting.
 * IMPORTANT: This returns the CALENDAR date, NOT the operational day.
 * For operational day grouping, use operationalDayOffset() instead.
 */
export function colombiaDate(isoString: string | null | undefined): string | null {
  if (!isoString) return null
  const d = new Date(isoString)
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Get current time in Colombia as HH:MM string.
 */
export function getColombiaTime(): string {
  const now = getColombiaNow()
  return `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`
}
