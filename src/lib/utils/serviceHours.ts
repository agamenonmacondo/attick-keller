/** Service hours and service type classification */

export const SERVICE_HOURS = [
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
] as const

export type ServiceHour = typeof SERVICE_HOURS[number]

export type ServiceType = 'breakfast' | 'lunch' | 'dinner'

export interface ServiceFilter {
  id: ServiceType | 'all'
  label: string
  icon: string
  timeRange: [string, string] // [start, end] in HH:mm
}

/**
 * Service filter definitions for UI tabs/pills.
 * Time ranges match A&K operating hours.
 */
export const SERVICE_FILTERS: ServiceFilter[] = [
  { id: 'all', label: 'Todos', icon: 'CalendarDots', timeRange: ['00:00', '23:59'] },
  { id: 'breakfast', label: 'Desayuno', icon: 'Coffee', timeRange: ['08:00', '11:30'] },
  { id: 'lunch', label: 'Almuerzo', icon: 'ForkKnife', timeRange: ['12:00', '16:30'] },
  { id: 'dinner', label: 'Cena', icon: 'Wine', timeRange: ['17:00', '23:30'] },
]

/**
 * Determine service type based on reservation start time.
 * - breakfast: before 12:00 (8:00 - 11:30)
 * - lunch: 12:00 - 16:30
 * - dinner: after 16:30 (17:00 - 23:30)
 */
export function getServiceType(timeStart: string): ServiceType {
  const hour = parseInt(timeStart.split(':')[0], 10)
  if (hour < 12) return 'breakfast'
  if (hour < 17) return 'lunch'
  return 'dinner'
}

/**
 * Check if a time falls within a service type range.
 */
export function isTimeInService(time: string, serviceId: ServiceType | 'all'): boolean {
  if (serviceId === 'all') return true
  const filter = SERVICE_FILTERS.find(f => f.id === serviceId)
  if (!filter) return true
  return time >= filter.timeRange[0] && time <= filter.timeRange[1]
}

/**
 * Get all valid time slots for a service type.
 */
export function getTimeSlotsForService(serviceId: ServiceType | 'all'): string[] {
  if (serviceId === 'all') return [...SERVICE_HOURS]
  const filter = SERVICE_FILTERS.find(f => f.id === serviceId)
  if (!filter) return [...SERVICE_HOURS]
  return SERVICE_HOURS.filter(t => t >= filter.timeRange[0] && t <= filter.timeRange[1])
}