# useNomina.ts

- **Que hace**: Two hooks — `useNomina(from?, to?)` for biometric nómina summary + staff detail; `useNominaContable()` for contable (accounting) nómina with period/sede selectors and sub-tabs.
- **Datos (useNomina)**: GET `/api/admin/nomina?from=&to=` (summary), GET `?action=staff_detail&staff_id=` (detail)
- **Datos (useNominaContable)**: GET `/api/admin/nomina?action=contable` (periods list), GET `?action=contable&periodo=&sede=` (detail), sub-tabs load from `/he-recargos`, `/provisiones`, `/novedades`, `/propinas`
- **Returns (useNomina)**: `{ data, loading, error, refetch, selectedStaffId, staffDetail, detailLoading, detailError, fetchStaffDetail, closeDetail }`
- **Returns (useNominaContable)**: `{ periodos, selectedPeriodo, setSelectedPeriodo, selectedSede, setSelectedSede, sedesDisponibles, detalle, resumen, propinasPeriodo, heRecargos, heRecargosTotals, provisiones, provisionesTotals, novedades, subTab, setSubTab, loading, error }`
- **Pitfalls**: Massive file (464 lines) with many Contable types exported; default sede is 'C75'; contable sub-tabs lazy-load on tab switch