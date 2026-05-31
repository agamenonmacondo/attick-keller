# costCalculator.ts

- **Que hace**: Calcula costos laborales colombianos: salario mensual → hora, recargos, provisiones. Exporta `calcularCostoTurno`, `calcularValorHora`, `getWeekStr`, `getWeekDates`, `dayIndexToDateIndex`
- **Datos**: Funciones puras, no consulta BD directamente
- **Dependencias**: Usado por NominaPanel, POSCostPanel, shift-schedules API, shift-assignments API, ShiftSchedulePanel
- **Pitfalls**: 
  - Asume ley colombiana (auxilio transporte, cesantias, primas, vacaciones). Los porcentajes estan hardcodeados — sincronizar con LEGAL_PARAMS
  - `calcularCostoTurno` devuelve `{total, base, overtime, ...}`. En shift-assignments/route.ts se usa `.total` — si el salario es 0 o invalido, retorna `{total: 0}`
  - **Salarios > 50M**: Frontend sanitiza a 0 antes de enviar a la API. API tambien sanitiza. Si no se sanitiza, valores como 172B causan `numeric field overflow` en PostgreSQL

| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-05-30 | Ninja | Documentar sanitizacion de salarios y peligro de numeric overflow |
