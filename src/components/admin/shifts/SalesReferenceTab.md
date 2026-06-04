# SalesReferenceTab.tsx

- **Que hace**: Pestaña Referencia — compara nomina (costo empresa real) contra datos historicos de ventas. Muestra KPIs semanales, tabla diaria con % nomina/ventas, y proyeccion mensual
- **Datos**: 
  - Props: `staff`, `shiftTypes`, `grid` (Record<employeeId, Record<dayIndex, shiftCode>>), `weekStr`, `area`
  - Hook externo: `useSalesAverages()` → API `/api/admin/sales-averages` → tabla `pos_sales`
  - Calculo de nomina: `calcularCostoTurnoEmpresa()` (salario + prestaciones + aportes × factor ~1.66)
- **Dependencias**: `calcularCostoTurnoEmpresa`, `formatCOP`, `useSalesAverages`
- **Secciones del UI**:
  1. KPI cards semanales: Ventas mediana, Nomina costo empresa, % Nomina/Ventas
  2. Proyeccion Mensual (×4.33): Nomina mensual, Ventas mensuales, % Nom/Ventas, Salario base, Provisiones, Factor real (nomina÷salario)
  3. Tabla diaria (desktop): Lun a Dom con Ventas Mediana, Q1, Q3, Tx/dia, Personas, Costo Empresa, % Nom/Ventas
  4. Tarjetas diarias (mobile): Misma data en formato de cards expandibles
- **Pitfalls**:
  - **sum_of_medians vs median_per_week**: La fila TOTAL usa `sum_of_medians` (suma real de medianas diarias), NO `median_per_week` (mediana de semanas historicas). Si se usa median_per_week el total no cuadra con las filas de arriba (fixeado Jun 2026)
  - `filteredStaff` usa `useMemo` compartido — filtra por `area` O `secondary_areas`
  - `DISPLAY_ORDER = [1,2,3,4,5,6,0]` para mostrar Lun primero y Dom al final
  - El % Nomina/Ventas usa colores: verde ≤20%, ambar 20-35%, rojo >35%

| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-06-02 | Ninja | Creacion del doc. Fix sum_of_medians, proyeccion mensual |
