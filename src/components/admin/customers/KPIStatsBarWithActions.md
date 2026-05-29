# KPIStatsBarWithActions.md

- **Que hace**: Barra de KPIs con acciones CTAs: total clientes, recurrentes, 30 dias, no-show rate, gasto promedio, VIP inactivos — usa `AnalyticsOverview` del hook
- **Datos**: Hook `useCustomerAnalytics` tipo `AnalyticsOverview`; recibe objeto `overview` y `loading` via props
- **Dependencias**: AnimatedCard, Phosphor icons
- **Pitfalls**: Muestra skeleton con animacion pulse mientras `loading || !overview`; los valores de `overview` pueden ser null si el endpoint falla