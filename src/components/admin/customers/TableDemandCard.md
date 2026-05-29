# TableDemandCard.tsx

- **Que hace**: Grafico de barras de demanda por hora mostrando reservas vs capacidad del restaurante usando recharts
- **Datos**: Hook `useTableDemand` (API propia de demanda horaria)
- **Dependencias**: recharts (BarChart, Bar, XAxis, etc.), AnimatedCard, useTheme
- **Pitfalls**: Usa `useTheme` para invertir colores en dark mode — si el theme no esta disponible, fallback a colores claros; la capacidad horaria default es 210 asientos con 2 turnos