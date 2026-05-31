# NominaPanel.tsx

- **Que hace**: Panel operativo de nomina — resumen de horas trabajadas, distribucion por tipo (HO/HED/HEN/HDD/HDN/RN), personal por dia, promedio por dia de semana y tabla de operarios con busqueda y drill-down
- **Datos**: Hook `useNomina(from, to)` — rango fijo Abril 2026; drill-down via `fetchStaffDetail(id)`; tipos `NominaResumen`, `NominaStaffSummary`, `NominaStaffDetail`, `NominaStaffPosData`, `DailyBreakdown`, `WeekdayAvg`
- **Dependencias**: AnimatedCard, Phosphor icons, formatCOP helper local
- **Pitfalls**: Rango de fecha hardcodeado `'2026-04-01', '2026-04-30'` — debe parametrizarse; `formatCOP` esta duplicado en NominaContablePanel y NominaUnifiedPanel