# PaymentMethodsChart.tsx

- **Que hace**: Donut chart (PieChart) de métodos de pago con merge de métodos >6 en "Otros"
- **Datos**: Array `{method, amount, count, pct}` desde `usePOSDashboard`
- **Dependencias**: Recharts `PieChart`, `SectionHeading`, `formatCOPDisplay`
- **Pitfalls**: La leyenda renderiza items formateados manualmente; si `data.length === 0` muestra placeholder
