# useRodriData.ts

- **Que hace**: Fetches all Rodrigo/Seadotec DB data (employees, teams, turnos config, schedules, params, productMix, ventas) in one call. Also exports calcHours() and calcCost() for Colombian labor hour computation.
- **Datos**: GET `/api/admin/rodri?action=all`
- **Returns**: `{ loading, error, employees, teams, turnosConfig, schedules, params, productMix, ventas, refetch }`
- **Exports**: Employee, Team, TurnoConfig, Schedule, Param, ProductMixItem, ProductItem, Venta, CalcHours types; calcHours(), calcCost(), formatCOP() functions
- **Pitfalls**: Single fetch for all data; calcHours uses Colombian night hours (7pm-6am) and jornada of 44h/6 days