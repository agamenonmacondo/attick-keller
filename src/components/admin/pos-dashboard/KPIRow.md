# KPIRow.tsx

- **Que hace**: Grid de 10 KPICards principales (revenue, cheques, ticket promedio, propinas, personas, party size, tarjeta, efectivo, service time)
- **Datos**: Recibe objeto `kpis` con todos los campos numéricos
- **Dependencias**: `KPICard`, `formatCOPDisplay`, Phosphor icons específicos por KPI
- **Pitfalls**: Si se agrega un KPI nuevo hay que actualizar este componente y los tipos
