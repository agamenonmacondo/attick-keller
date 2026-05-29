# POSDashboardPanel

## Proposito

Panel principal del dashboard de operaciones POS. Muestra metricas de ventas, costos y catalogo en 3 tabs:
- **Operacion**: Calendario heatmap, KPIs diarios, graficas de zona/hora/productos, rendimiento de personal, metodos de pago, segmentacion de clientes, turno conciliacion, y carga de datos
- **Costos**: Panel de costos POS con calendario, compras diarias, margenes, desglose por proveedor/categoria
- **Catalogo**: Tabla de costos por producto con drill-down de receta e insumos

Es el componente mas complejo del dashboard — orquesta hooks, filtros, tabs, drill-down, y mas de 15 sub-componentes.

## Datos

### APIs consumidas
- `usePOSDashboard(filters)` — Hook principal: `GET /api/admin/pos-dashboard?from=X&to=Y&category=Z&zone=W`
- `usePOSCosts(filters)` — Hook de costos: `GET /api/admin/pos-costs?from=X&to=Y&group=Z`
- `usePOSCalendar(zone)` — Hook de calendario: datos de tendencia diaria para heatmap
- `useProductCostCatalog()` — Hook de catalogo: `GET /api/admin/product-cost-catalog`

### Datos derivados client-side
- `periodAverages` — Promedios del periodo actual calculados a partir de `data.dailyTrend` y `data.kpis`
- `effectiveFilters` — Si `viewMode === 'month'`, se borran `from`/`to` para que el servidor devuelva todo el mes
- `isSingleDay` — Determina si mostrar DayPerformanceCard con comparacion detallada

### Tablas Supabase (indirectas via hooks/APIs)
- `pos_sales`, `pos_sale_items`, `pos_sale_payments` — Ventas y pagos
- `pos_purchase_items`, `pos_purchases` — Compras/costos
- `pos_ingredients`, `pos_ingredient_costs` — Ingredientes y costos
- `menu_items` — Productos del menu

## Dependencias

### Lo usa
- `AdminShell.tsx` — Renderiza `<POSDashboardPanel />` como tab principal del admin

### Usa a (sub-componentes)
- `usePOSDashboard`, `usePOSCosts`, `usePOSCalendar`, `useProductCostCatalog` — Hooks de datos
- `POSFiltersBar` — Barra de filtros (zona, categoria, rango de fechas)
- `POSCostPanel` — Tab de costos completo
- `RevenueHeatmapCalendar` — Calendario interactivo con heatmap de metricas
- `DayKPIBar` — Barra de KPIs del dia
- `DayPerformanceCard` — Desempeno detallado de un dia
- `ZoneRevenueChart` — Grafica de ingresos por zona
- `HourlyRevenueChart` — Grafica de ingresos por hora
- `TopProductsTable` — Tabla de productos top
- `CategoryBreakdown` — Desglose por categoria
- `StaffPerformanceTable` — Tabla de rendimiento de personal
- `PaymentMethodsChart` — Grafica de metodos de pago
- `ClientTiersCard`, `ClientSplitCard` — Segmentacion de clientes
- `TopProductByCategoryChart` — Top producto por categoria
- `CategoryCompanionsCard` — Productos que se compran juntos
- `CategoryPerformersCard` — Top/Bottom performers por categoria
- `ShiftReconciliation` — Conciliacion de turnos
- `DataUploadSection` — Carga de archivos CSV
- `DrillDownPanel` — Panel de drill-down (producto, personal, categoria, hora, zona)
- `ProductCostTable`, `ProductRecipeDetail` — Tabla y detalle de catalogo de costos
- `AnimatedCard` — Wrapper con animacion de entrada

## Pitfalls

- **3 hooks activos simultaneamente**: `usePOSDashboard`, `usePOSCosts`, y `useProductCostCatalog` se montan siempre, aunque solo se vea un tab. Esto genera llamados API innecesarios para tabs ocultos. Considerar lazy-loading o montar solo el hook del tab activo.
- **`effectiveFilters` borra fechas en modo mes**: Al cambiar a `viewMode='month'`, se borran `from` y `to`. Pero el hook `usePOSCalendar(filters.zone)` NO recibe `effectiveFilters`, recibe `filters.zone` directamente. Verificar que esto sea consistente.
- **Drill-down state global**: `drillDown`, `drillDownData` etc. vienen de `usePOSDashboard`. Al cambiar filtros, el drill-down podria quedar desincronizado si no se limpia.
- **Muchos componentes animados**: `AnimatedCard` con delays escalonados (0, 0.06, 0.12...). Si el navegador es lento, la animacion puede verse entrecortada. No hay forma de deshabilitar animaciones.
- **`periodAverages` recalcula en cada render**: Depende de `data` completo. Si `data` cambia por cualquier motivo (nuevo drill-down, refetch), se recalcula todo. No es pesado pero podria optimizarse con `useMemo` mas granular.
- **`calendarTrend` vs `data.dailyTrend`**: El calendario usa `calendarTrend` de `usePOSCalendar` (todas las fechas), mientras el dashboard usa `data.dailyTrend` (filtrado). Son datos diferentes — el calendrador muestra todo el mes sin filtro de fecha.
- **Error handling limitado**: Si el hook `usePOSDashboard` falla, se muestra un boton "Reintentar" pero sin detalles del error. Los tabs de costos y catalogo manejan errores internamente via `costsError` y `catalogError`.

## Historial
| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-05-29 | Ninja | feat: catalogo de costos por producto — tabla buscable + drill-down de receta |
| 2026-05-29 | Ninja | fix: 6 bugs panel costos — undefined dates, COP format, outlier margins, calendar z-index, category names, column widths |
| 2026-05-28 | Ninja | fix: cost panel uses own dailyPurchases for calendar, not sales data; fix purchase_items column names |
| 2026-05-28 | Ninja | feat: cost dashboard — calendar heatmap, day-level KPIs, supplier/category/margin tables, paginated API |
| 2026-05-27 | Ninja | feat: POS cost dashboard panel — purchases, margins, COGS by day/month |
| 2026-05-27 | Ninja | fix: add pos_product_id to select in handleProduct drill-down query |
| 2026-05-26 | Ninja | feat: independent calendar for POS dashboard — shows all months, click day to filter |
| 2026-05-26 | Ninja | fix: auto-detect date range for POS dashboard, add month selector, populate derived_zone_name |