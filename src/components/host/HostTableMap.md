# HostTableMap.tsx

- **Que hace**: Mapa interactivo de mesas por zona con colores por estado (libre, ocupado, reservado), sugerencias de mesa y drill-down
- **Datos**: zones[] con mesas, reservations por mesa; useTableSuggestion para sugerir mesa
- **Dependencias**: EmptyState, SectionHeading, usePrefersReducedMotion, useTableSuggestion, timeToMinutes, formatTime12, getUrgencyBadge, ReservationDetail, Framer Motion
- **Pitfalls**: urgency_level para reservas proximas; combine_group para mesas combinables; expandir reserva muestra ReservationDetail inline
