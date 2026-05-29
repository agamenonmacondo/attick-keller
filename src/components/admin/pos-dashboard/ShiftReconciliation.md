# ShiftReconciliation.tsx

- **Que hace**: Tabla de cierres de turno (últimos 10): station, cajero, efectivo/tarjeta/crédito, estado abierto/cerrado
- **Datos**: Array de shifts con `isClosed`, `cashTotal`, `cardTotal`, `creditTotal`
- **Dependencias**: `SectionHeading`, `formatCOPDisplay`, Phosphor `LockOpen`/`LockSimple`
- **Pitfalls**: `formatShortDateTime` parsea ISO strings; solo muestra últimos 10
