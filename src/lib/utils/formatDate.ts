export function formatDate(dateStr: string, style: 'short' | 'long' | 'weekday' = 'short'): string {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    switch (style) {
      case 'long':
        return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      case 'weekday':
        return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
      default:
        return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
    }
  } catch {
    return dateStr
  }
}

export function getLocalDate(d: Date = new Date()): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return getLocalDate(d)
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':')
  const hour = parseInt(h, 10)
  const period = hour >= 12 ? 'pm' : 'am'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${displayHour}:${m} ${period}`
}