# HostShell.tsx

- **Que hace**: Shell principal del panel Host con tabs (mesas, reservas, plano), integracion de useHostDashboard y useHostOccupancy
- **Datos**: useHostDashboard, useHostOccupancy; PATCH /api/admin/reservations/:id
- **Dependencias**: Todos los subcomponentes de host, useAuth, usePrefersReducedMotion, Framer Motion
- **Pitfalls**: handleSeatNext busca la primera reserva confirmed y la PARCHA a seated; reassignTarget es estado complejo
