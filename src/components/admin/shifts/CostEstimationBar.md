# CostEstimationBar.tsx

- **Que hace**: Tab "Costos" (Nomina) — calcula y muestra el costo empresa real de cada empleado con desglose (base, recargo nocturno, dominical, horas extra). Incluye grafico de barras apiladas
- **Datos**: Props `staff`, `shiftTypes`, `grid`, `weekStr`, `area`. Calcula con `calcularCostoTurnoEmpresa()` (salario + prestaciones + aportes × ~1.66)
- **Dependencias**: Recharts (BarChart), `calcularCostoTurnoEmpresa`, `formatCOP`, `LEGAL_PARAMS`
- **Secciones**:
  1. KPIs: Costo total semana, Horas totales (HO/HN/HE), Promedio/empleado, Desglose (Base, RN, RD, HE)
  2. Resumen por area (solo modo "todos"): tarjetas Cocina/Barra/Servicio con empleados, horas, base, recargos, total
  3. Grafico de barras apiladas: Base, R.Nocturno, R.Dominical, HE/Extra por empleado
  4. Tabla desktop: Colaborador, HO, HN, HE, Total horas, Base, R.Noc, R.Dom, HE$, Costo Est.
  5. Tarjetas mobile: Misma data en cards por empleado
- **Pitfalls**:
  - Usa `calcularCostoTurnoEmpresa()` que sanitiza salarios > 50M a SMLV
  - `SUNDAY_DAY_INDEX = 0` (dia 0 = Domingo en day_index de BD)
  - El grafico usa `stackId="cost"` para barras apiladas. Si se cambian los dataKeys, actualizar tambien los colores del Bar

| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-06-02 | Ninja | Migrado a calcularCostoTurnoEmpresa(). Simplificado: eliminada logica duplicada de scaleFactor |
