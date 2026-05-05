/**
 * Get today's date in Colombia timezone (UTC-5).
 * This avoids the bug where new Date().toISOString() returns UTC,
 * causing reservations at 9pm Bogotá time to show under the next day.
 */
export function getColombiaDate(): string {
  const now = new Date()
  // Colombia is UTC-5: subtract 5 hours from UTC, then convert to local
  const colombiaOffsetMs = 5 * 60 * 60 * 1000
  const colombiaDate = new Date(now.getTime() - colombiaOffsetMs + now.getTimezoneOffset() * 60 * 1000)
  return colombiaDate.toISOString().split('T')[0]
}

/**
 * Get a Date object representing the current moment in Colombia timezone.
 */
export function getColombiaNow(): Date {
  const now = new Date()
  const colombiaOffsetMs = 5 * 60 * 60 * 1000
  return new Date(now.getTime() - colombiaOffsetMs + now.getTimezoneOffset() * 60 * 1000)
}