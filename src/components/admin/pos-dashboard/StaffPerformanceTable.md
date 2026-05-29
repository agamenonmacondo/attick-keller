# StaffPerformanceTable.tsx

- **Que hace**: Tabla de rendimiento de staff (meseros/cajeros/todos) filtrable con drill-down por persona
- **Datos**: Array `{staffId, staffName, staffType, cheques, revenue, propinaTotal}` desde `usePOSDashboard`
- **Dependencias**: `SectionHeading`, `formatCOPDisplay`, Phosphor icons
- **Pitfalls**: `staffType === 1` es mesero, `=== 3` es cajero — mapeo numérico hardcoded
