# NoShowAlertCard.tsx

- **Que hace**: Tarjeta de alertas no-show para el dia de hoy — lista clientes con riesgo bajo/medio/alto y permite marcar como no-show o contactar
- **Datos**: Hook `useNoShowToday` (API `/api/admin/no-show-today`)
- **Dependencias**: AnimatedCard
- **Pitfalls**: La accion de "No asistio" llama a PATCH `/api/admin/reservations/[id]` con `{status: 'no_show'}` directamente sin confirmacion adicional