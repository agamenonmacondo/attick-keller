/** Service hours — shared between ReservationTimeline and ReservationDetail edit form */
export const SERVICE_HOURS = [
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
] as const

export type ServiceHour = typeof SERVICE_HOURS[number]