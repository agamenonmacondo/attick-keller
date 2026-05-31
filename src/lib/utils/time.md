# time.ts

- **Que hace**: Utilidades de tiempo con zona horaria Colombia (UTC-5)
- **Datos**: Funciones: getCurrentTimeCO, isWithinServiceHours, getTimeSlotMinutes
- **Dependencias**: Usado por ocupacion, host dashboard
- **Pitfalls**: UsaIntl.DateTimeFormat con timeZone 'America/Bogota' — puede differir del server time
