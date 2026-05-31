# TrendChart.tsx

- **Que hace**: Grafico de linea mostrando tendencias semanales de clientes activos, nuevos y no-shows usando recharts
- **Datos**: Hook `useWeeklyTrends` (API de tendencias semanales)
- **Dependencias**: recharts (LineChart, Line, etc.), AnimatedCard, useTheme
- **Pitfalls**: Los colores estan definidos como CSS custom properties (`var(--color-accent)`, etc.) — recharts los interpreta como string y los pasa al SVG directamente