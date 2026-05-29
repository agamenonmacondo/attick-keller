# ZoneRevenueChart.tsx

- **Que hace**: Barras horizontales de revenue por zona (Tipi, Attic, Chispas, Llevar, Interno, Keller) con click para filtrar y drill-down
- **Datos**: Array `{zone, revenue, cheques, ticketPromedio, propinaTotal, pct, avgServiceTime}` + optional `unknownZone`
- **Dependencias**: `SectionHeading`, `formatCOPDisplay`
- **Pitfalls**: `ZONE_COLORS` hardcodeado para 6 zonas; zonas no listadas usan `var(--text-secondary)`
