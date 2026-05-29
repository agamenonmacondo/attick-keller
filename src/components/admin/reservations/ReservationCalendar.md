# ReservationCalendar.tsx

- **Que hace**: Calendario mensual tipo heatmap con conteo de reservas por dia, navegacion prev/next mes
- **Datos**: days como Record<string, number> (fecha -> cantidad reservas)
- **Dependencias**: Framer Motion, Phosphor icons, useTheme, addDays/getLocalDate
- **Pitfalls**: getHeatClasses cambia segun tema dark/light; inicio de semana = Lunes (no Domingo)
