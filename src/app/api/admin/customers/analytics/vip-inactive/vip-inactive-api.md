# customers/analytics/vip-inactive/route.ts

- **Que hace**: Identifica clientes VIP sin visitas recientes (default 90 dias)
- **Datos**: `customers` (segment=VIP), `reservations` (ultimo visit)
- **Auth**: `getAdminUser` — cualquier rol admin
- **Pitfalls**: Param `days=N` (default 90). Usa left join manual: trae todos los VIP y filtra los que tienen ultima reserva > N dias