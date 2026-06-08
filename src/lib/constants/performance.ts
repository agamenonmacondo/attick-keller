export const FRANJAS = {
  almuerzo: { label: 'Almuerzo', hours: [12, 13, 14, 15], capacity: 45, timeRange: '12-16h' },
  tarde:    { label: 'Tarde', hours: [17, 18, 19], capacity: 45, timeRange: '17-19h' },
  cena:     { label: 'Cena', hours: [20, 21, 22, 23], capacity: 45, timeRange: '20-23h' },
} as const

export const CAPACIDAD_MAXIMA_DIA = 135

export type DayType = 'alto' | 'medio' | 'bajo'

export function getDayType(dateStr: string): DayType {
  const day = new Date(dateStr + 'T12:00:00').getDay()
  if (day === 5 || day === 6) return 'alto'
  if (day === 2 || day === 3 || day === 4) return 'medio'
  return 'bajo'
}

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  alto: 'Alto',
  medio: 'Medio',
  bajo: 'Bajo',
}

export const PROMEDIOS_HISTORICOS: Record<DayType, { almuerzo: number; tarde: number; cena: number }> = {
  alto:  { almuerzo: 32, tarde: 37, cena: 67 },
  medio: { almuerzo: 15, tarde: 26, cena: 23 },
  bajo:  { almuerzo: 17, tarde: 12, cena: 3 },
}
