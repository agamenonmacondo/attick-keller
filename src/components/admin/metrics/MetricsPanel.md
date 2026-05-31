# MetricsPanel.tsx

- **Que hace**: Panel raiz de metricas que orquesta todos los sub-componentes: conversion, no-show, party size, picos, tendencias y fuentes
- **Datos**: Hook `useAdminMetrics` (API `/api/admin/metrics`)
- **Dependencias**: PeakHoursChart, SourceBreakdown, ConversionCard, NoShowCard, PartySizeCard, DailyTrendChart, AnimatedCard
- **Pitfalls**: Si `data` es null despues del loading, retorna null sin mensaje de error — depende del hook para manejar errores