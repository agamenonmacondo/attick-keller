# costCalculator.ts

- **Que hace**: Calcula costos laborales colombianos: salario mensual → valor hora, recargos, costo empresa. Funciones puras, sin acceso a BD.
- **Exporta**:
  - `calcularCostoTurno(shiftType, salarioMensual, esDomingo)` → `ShiftCostEstimate` con recargos nocturno/dominical/HE. Usa SALARIO BRUTO como base.
  - `calcularCostoTurnoEmpresa(shiftType, rawSalario, esDomingo)` → **Wrapper seguro**: sanitiza salario (cap 50M, fallback SMLV), escala a costo empresa real (×~1.66). **Usar SIEMPRE esta en el sistema de turnos.**
  - `calcularCostoEmpresa(salarioMensual)` → desglose completo: salario + prestaciones (prima 8.33%, cesantias 8.33%, intereses 1%, vacaciones 4.17%) + aportes patronales (salud 8.5%, pension 12%, ARL 0.522%, caja 4%, SENA 2%, ICBF 3%) + auxilio transporte ($249.095 si ≤2 SMLV)
  - `calcularCostoSemanal(assignments, salarioMensual)` → suma semanal con desglose
  - `calcularHorasSegmento(entrada, salida)` → horas ordinarias/nocturnas para turnos partidos
  - `formatCOP(value)` → formato moneda colombiana sin decimales
  - `getWeekStr(date)`, `getWeekDates(weekStr)`, `dayIndexToDateIndex(dayIndex)`, `dateToDayIndex(date)`, `esDomingo(date)` → utilidades de calendario ISO
- **Dependencias**: `LEGAL_PARAMS` de types/shifts.ts, `ShiftType/ShiftCostEstimate` types
- **Pitfalls**:
  - Los porcentajes legales estan hardcodeados en `calcularCostoEmpresa()`. Si cambia la ley, editar ahi.
  - `calcularCostoTurno` (sin "Empresa") SOLO debe usarse internamente. Todo el frontend y API usan `calcularCostoTurnoEmpresa`.
  - Salarios > 50M se sanitizan a SMLV ($1.750.905 en 2026) para prevenir overflow en PostgreSQL.
  - Si rawSalario es 0 o null, usa SMLV como fallback.

| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-06-02 | Ninja | Agregado `calcularCostoTurnoEmpresa()` como unica fuente de verdad. 6 archivos migrados. |
| 2026-05-30 | Ninja | Documentar sanitizacion de salarios y peligro de numeric overflow |
