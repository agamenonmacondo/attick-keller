# TableMap.tsx

- **Que hace**: Grid interactivo de mesas agrupadas por zona mostrando estado (libre/confirmado/pre-pagado/sentado), info de reserva y popover de acciones al hacer click
- **Datos**: Recibe `zones`, `unassignedTables`, `unassignedReservations` via props del hook `useAdminOccupancy`; callbacks `onAssign`/`onUnassign`
- **Dependencias**: AnimatedCard, SectionHeading, TableActionPopover, `cn` utility
- **Pitfalls**: Los status labels estan hardcoded en espanol (Libre, Confirmado, Pre-pagado, Sentado, Completado, No asistió) — si se agregan nuevos estados, hay que actualizar los mapeos de color/badge. La logica de `statusColor`/`statusBadgeBg`/`statusBadgeText` esta duplicada dentro del bloque de unassigned tables