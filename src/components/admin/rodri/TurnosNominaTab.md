# TurnosNominaTab.tsx

- **Que hace**: Tab de turnos y nomina: grid semanal de empleados por turno, bar chart de horas/costo por dia, listado detallado
- **Datos**: data.schedules[], data.employees[] de useRodriData; calcHours/calcCost para cada turno
- **Dependencias**: Recharts, useRodriData, calcHours/calcCost/formatCOP
- **Pitfalls**: OFF_CODES filtra turnos no trabajados; TURNO_STYLE mapea codigos a colores; semana se selecciona entre disponibles
