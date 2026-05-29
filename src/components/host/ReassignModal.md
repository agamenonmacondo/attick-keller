# ReassignModal.tsx

- **Que hace**: Modal para reasignar una reserva a otra mesa, lista mesas disponibles ordenadas por prioridad de zona
- **Datos**: Props reservation, currentTableName, currentZoneName, zones[], callbacks; PATCH /api/admin/reservations/:id con nueva table_id
- **Dependencias**: Framer Motion, cn, timeToMinutes, Phosphor icons, Zone type de useHostOccupancy
- **Pitfalls**: hasTimeConflict usa buffer de 30min; ZONE_PRIORITY hardcoded (Tipi=100, Taller=80, etc.); boton deshabilitado si no hay mesas disponibles
