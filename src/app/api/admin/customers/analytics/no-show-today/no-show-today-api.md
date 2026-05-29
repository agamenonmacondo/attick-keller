# customers/analytics/no-show-today/route.ts

- **Que hace**: Lista reservas no-show del dia actual con datos del cliente
- **Datos**: `reservations` (status=no_show, fecha=hoy), `customers`
- **Auth**: `getAdminUser` — cualquier rol admin
- **Pitfalls**: Usa fecha del servidor (Colombia UTC-5) via `getColombiaNow()`, no la fecha del cliente