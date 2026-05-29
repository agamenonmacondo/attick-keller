# CostEstimationBar.tsx

- **Que hace**: Bar chart de costos estimados por empleado con desglose (base, recargo nocturno, dominical, horas extra)
- **Datos**: Props staff, shiftTypes, grid (asignaciones), weekStr; calcula con calcularCostoTurno
- **Dependencias**: Recharts, calcularCostoTurno/calcularCostoSemanal/formatCOP/getWeekDates, LEGAL_PARAMS
- **Pitfalls**: dayIndexToDateIndex convierte indices (DOM=0 en JS vs LUN=0 en app); LEGAL_PARAMS importado de tipos
