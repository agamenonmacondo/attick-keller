# ReservationsPanel.tsx

- **Que hace**: Panel principal de reservas: combina calendar, stats, filtros, timeline, detail y form. Orquesta fetch y state
- **Datos**: useAdminDashboard, useAdminReservations, useDatesWithReservations; PATCH a /api/admin/reservations/:id
- **Dependencias**: Todos los subcomponentes de reservations + ConfirmDialog
- **Pitfalls**: handleStatusChange usa ConfirmDialog para acciones destructivas; refetch es manual tras cambios
