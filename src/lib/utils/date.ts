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
  // Get the current date parts in Colombia timezone
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

  // Construct a Date from Colombia-local date parts
  // This Date, when you call getHours/getMinutes/etc, gives Colombia local time
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
 * Get current time in Colombia as HH:MM string.
 */
export function getColombiaTime(): string {
  const now = getColombiaNow()
  return `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`
}