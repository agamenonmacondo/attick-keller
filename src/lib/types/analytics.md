# analytics.ts

- **Que hace**: Define interfaces para analytics de clientes y reservas
- **Datos**: Tipos: ReactivationData, NoShowTodayAlert, WeeklyTrend, TableDemandComparison, VIPInactive, CustomerAnalyticsOverview, RetentionData, SegmentCounts
- **Dependencias**: Usado por useCustomerAnalytics, useNoShowToday, useVIPInactive, useWeeklyTrends, useTableDemand
- **Pitfalls**: LEGAL_PARAMS para ley colombiana definido en shifts.ts, no aqui
