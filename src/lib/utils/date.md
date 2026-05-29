# date.ts

- **Que hace**: Utilidades de fecha con zona horaria Colombia (UTC-5)
- **Datos**: Funciones: formatDateCO, parseDateCO, getMonday, isToday, addDays
- **Dependencias**: Usado por reservas, ocupacion, turnos, nomina
- **Pitfalls**: SIEMPRE usar estas funciones en vez de Date nativo para evitar problemas de zona horaria
