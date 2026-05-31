# HostReservationQueue.tsx

- **Que hace**: Cola de reservas del dia con badges de estado, acciones rapidad (sentar, no asistio, completar), confirm dialog
- **Datos**: reservations[] con status, customer info; onAction callback
- **Dependencias**: StatusBadge, EmptyState, ConfirmDialog, SectionHeading, usePrefersReducedMotion, Framer Motion
- **Pitfalls**: HOST_ACTION_MAP define acciones solo para confirmed y seated; estados destructivos son cancelled y no_show
