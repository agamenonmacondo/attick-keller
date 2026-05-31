# HostWalkInForm.tsx

- **Que hace**: Formulario modal para crear walk-in (sin reserva) con nombre, telefono, party size, zona y mesa sugerida
- **Datos**: Props zones[], onClose, onCreated; POST a /api/admin/reservations con status=confirmed
- **Dependencias**: Phosphor icons, getColombiaTime, getColombiaDate, timeToMinutes, ReservationTimeline type
- **Pitfalls**: isTableAvailable verifica solapamiento de reservas; ventana de 2 horas por defecto para walk-in; scoreTable ordena mesas por fit
