# ReservationDetail.tsx

- **Que hace**: Panel lateral (slide-in) con detalle de reserva: datos del cliente, estado, zona, acciones de cambio de estado
- **Datos**: Reserva individual con customer, zona, estado. PATCH a /api/admin/reservations/:id
- **Dependencias**: StatusBadge, SectionHeading, whatsappLink/emailLink, SERVICE_HOURS, Framer Motion
- **Pitfalls**: ACTION_MAP define botones por estado; whatsappLink hardcodea prefijo 57 Colombia
