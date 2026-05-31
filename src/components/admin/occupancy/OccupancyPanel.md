# OccupancyPanel.tsx

- **Que hace**: Panel raiz de ocupacion que orquesta calendario de reservas, gauge de ocupacion, breakdown por zona y mapa interactivo de mesas con asignacion
- **Datos**: Hooks `useAdminDashboard(selectedDate)`, `useAdminOccupancy(selectedDate)`, `useDatesWithReservations(selectedDate)`; PATCH `/api/admin/reservations/[id]` para asignar/desasignar mesas
- **Dependencias**: ReservationCalendar, OccupancyGauge, ZoneBreakdown, TableMap
- **Pitfalls**: Las reservas sin asignar se derivan del dashboard data filtrando `status in [confirmed, pre_paid, pending] && !table_id`; el refetch despues de asignar/desasignar llama ambos `dashRefetch()` y `occRefetch()`