# Plan de Mejora — Módulo Operación (POS Dashboard)
## Attick & Keller

Eres un arquitecto de software senior. Tu tarea es leer la auditoría y TODOS los archivos fuente del dashboard, y generar un PLAN DETALLADO de corrección.

## CONTEXTO

Lee primero el archivo de auditoría: `specs/006-dashboard-audit/audit.md`

Luego lee TODOS estos archivos para entender el código actual:
- `src/app/api/admin/pos-dashboard/route.ts` (API principal)
- `src/app/api/admin/pos-dashboard/detail/route.ts` (API drill-down)
- `src/lib/hooks/usePOSDashboard.ts` (hook)
- `src/components/admin/pos-dashboard/POSDashboardPanel.tsx` (panel principal)
- `src/components/admin/pos-dashboard/TopProductsTable.tsx`
- `src/components/admin/pos-dashboard/CategoryBreakdown.tsx`
- `src/components/admin/pos-dashboard/TopProductByCategoryChart.tsx`
- `src/components/admin/pos-dashboard/DrillDownPanel.tsx`
- `src/components/admin/pos-dashboard/RevenueHeatmapCalendar.tsx`
- `src/components/admin/pos-dashboard/KPICard.tsx`
- `src/components/admin/pos-dashboard/POSFiltersBar.tsx`
- `src/components/admin/pos-dashboard/ZonesRevenueChart.tsx`

## INSTRUCCIONES

Después de leer todo, genera un plan en `specs/006-dashboard-audit/improvement-plan.md` con:

### Para cada bug/gap de la auditoría:
1. **Archivo(s) a modificar** — exactos con ruta
2. **Cambio específico** — qué líneas, qué lógica agregar/cambiar
3. **Código de ejemplo** — snippets concretos del cambio (no pseudocódigo, código TypeScript real)
4. **Dependencias** — si un cambio requiere otro antes
5. **Orden de ejecución** — numerado, paso a paso

### Prioridades (implementar en este orden):

**P1 — Críticos (2-3 horas):**
1. BUG-01: Top Products NO filtra por categoría — cuando se selecciona "Pizzas" debe mostrar solo pizzas
2. BUG-02: Drill-down por categoría no muestra TODOS los productos — debe hacer left-join para mostrar productos sin ventas con qty=0, revenue=0
3. BUG-03: Zona "Desconocido" — excluir del gráfico de zonas, mostrar como KPI separado

**P2 — Datos incorrectos (2-3 horas):**
4. BUG-04: unit_price NULL/0 fallback
5. BUG-09: avgTicket puede incluir propinas
6. BUG-13: party_size incluye ceros
7. BUG-11: Formato moneda inconsistente

**P3 — UX (3-4 horas):**
8. UX-02: Indicador visual de filtros activos
9. UX-03: Tooltip en Heatmap
10. UX-05: Filtrar categorías con 0 ventas
11. BUG-12: Heatmap no muestra días sin ventas

### Formato del plan:
```markdown
## Paso N: [Título]
- **Archivos:** lista de archivos
- **Cambio:** descripción
- **Código:** snippet
- **Verificación:** cómo probar
```

NO generes código de implementación completo. Solo el plan con snippets clave.
El plan debe ser ejecutable paso a paso sin ambigüedades.