# StatusBadge.tsx

- **Que hace**: Badge de estado de reserva con colores y labels especificos por estado (pending/confirmed/seated/etc.)
- **Datos**: Props status (ReservationStatus), className; exporta STATUS_CONFIG y getStatusConfig
- **Dependencias**: cn
- **Pitfalls**: STATUS_CONFIG es exportado y usado en otros componentes (ReservationTimeline, host/ReservationDetail); 7 estados hardcoded
