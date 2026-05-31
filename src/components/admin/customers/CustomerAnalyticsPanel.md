# CustomerAnalyticsPanel.tsx

- **Que hace**: Vista analitica con KPIs de clientes, funnels de retencion, riesgo no-show, contactabilidad, reactivacion, tendencias y demanda de mesas
- **Datos**: Hook `useCustomerAnalytics` (API `/api/admin/customers/analytics`)
- **Dependencias**: KPIStatsBarWithActions, ReactivationCard, NoShowAlertCard, RetentionFunnel, SegmentBreakdown, ContactQualityCard, TrendChart, TableDemandCard, VIPInactiveCard
- **Pitfalls**: Si la migracion SQL no esta aplicada, muestra error con mensaje especifico; depende de que `overview` tenga todas las sub-secciones populadas