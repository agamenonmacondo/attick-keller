# ReservationTimeline.tsx

- **Que hace**: Timeline vertical por hora con slots SERVICE_HOURS, agrupando reservas por hora de inicio con badges de estado
- **Datos**: reservations[], loading, detailId, onSelect callback
- **Dependencias**: StatusBadge/getStatusConfig, formatTime, Framer Motion, usePrefersReducedMotion
- **Pitfalls**: Depende de SERVICE_HOURS para generar slots; si reserva esta fuera de horas no se agrupa
