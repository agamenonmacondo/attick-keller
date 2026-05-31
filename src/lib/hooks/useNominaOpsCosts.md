# useNominaOpsCosts.ts

- **Que hace**: Fetches nómina ops costs breakdown (devengado, deducciones, provisiones, HE/recargos, propinas, ventas, ratios vs revenue)
- **Datos**: GET `/api/admin/nomina/ops-costs?periodo=&sede=`
- **Returns**: `{ data, loading, error }` — data typed as OpsCostData
- **Pitfalls**: Default sede='C75'; no refetch — re-fetches on periodo/sede change