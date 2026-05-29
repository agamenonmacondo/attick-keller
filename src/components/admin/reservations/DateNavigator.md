# DateNavigator.tsx

- **Que hace**: Navegador de fecha con flechas prev/next, quick pills de -2 a +2 dias, y marcadores de dias con reservas
- **Datos**: Props selectedDate, onDateChange, datesWithReservations (fechas con puntos)
- **Dependencias**: Phosphor CaretLeft/CaretRight, formatDate/addDays/getLocalDate
- **Pitfalls**: Usa getLocalDate() como hoy; quick pills cambian si no hay reservas ese dia
