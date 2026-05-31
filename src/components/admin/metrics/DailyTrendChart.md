# DailyTrendChart.tsx

- **Que hace**: Grafico de barras inline mostrando tendencia diaria de reservas (totales vs confirmadas) de los ultimos 14 dias
- **Datos**: Recibe `trend` (Array<{date, total, confirmed}>) via props del hook `useAdminMetrics`
- **Dependencias**: SectionHeading, `getLocalDate`
- **Pitfalls**: La barra de hoy usa `getLocalDate()` para comparar — si el timezone del servidor y cliente difieren, la marca "hoy" puede no coincidir