# Session Progress Log

## Current State

**Last Updated:** 2026-05-27
**Active Feature:** feat-011 — Drill-Down Filter Propagation

## Status

### What's Done

- [x] feat-001: Analytics Insights Dashboard — deployado en produccion
- [x] feat-005: Data Coverage Audit — auditoria completada
- [x] feat-002 P1 fixes: Top Products filtra por categoria, zona Desconocido fuera del grafico
- [x] FIX: `pos_product_id` faltaba en SELECT de `handleProduct` — causaba drill-down vacío para todos los productos
- [x] feat-011 SPEC: Documentacion completa del bug de filtros no propagados en drill-downs

### What's In Progress

- [ ] feat-010: Bug "sin datos al seleccionar categoria" — debug logs activos, esperando revision de consola
- [ ] feat-004: Drill-Down — funciona pero NO respeta filtros de zona/categoria
- [ ] feat-011: Drill-Down Filter Propagation — spec creado, implementacion pendiente

### What's Next (prioridad)

1. **feat-011 Implementacion:** Modificar 3 capas (hook, API route, handlers)
2. **feat-010:** Resolver bug de "sin datos" (revision de consola)
3. **feat-007:** P2 - Fix datos incorrectos

## Root Cause Analysis: feat-011

Los drill-downs no respetan los filtros activos del dashboard (zona, categoria, fecha).

**3 capas afectadas:**

1. **Hook `usePOSDashboard.ts`** — `fetchDrillDown()` no envía `zone` ni `category` como parámetros URL
2. **API `detail/route.ts`** — GET handler no parsea `zone` ni `category`
3. **Handlers** — Cada handler (product, staff, category, hour, zone) no aplica filtros de zona/categoría

**Detalle del fix:**
- `fetchDrillDown`: agregar `p.set('zone', ...)` y `p.set('category', ...)`
- API: parsear `zoneParam` y `categoryParam`, pasarlos a cada handler
- Handlers: filtrar `allSales` por zona, filtrar `validItems` por categoría

Ver spec completo: `specs/drill-down-filter-propagation/spec.md`

## Bug Fixed This Session

**pos_product_id missing in SELECT (commit eac4ac0)**

En `detail/route.ts` línea 209, la query a `pos_sale_items` en `handleProduct()` hacía:
```ts
.select('pos_sale_id, quantity, unit_price')  // FALTABA pos_product_id
```

Pero luego en línea 218 filtraba client-side:
```ts
items.filter((i: any) => (i.pos_product_id || '').trim() === trimmedProductId)
```

Como `pos_product_id` no estaba en el SELECT, siempre era `undefined`, y el filtro eliminaba TODOS los items. Resultado: drill-down vacío.

**Fix:** Agregar `pos_product_id` al SELECT.

## Files Modified This Session

- `src/app/api/admin/pos-dashboard/detail/route.ts` — fix pos_product_id en SELECT de handleProduct
- `specs/drill-down-filter-propagation/spec.md` — spec completo del bug de filtros
- `feature_list.json` — actualizado con feat-011
- `progress.md` — este archivo

## Blockers / Risks

- [ ] feat-010: Bug "sin datos" necesita revision de consola en browser de Alejandro
- [ ] Vercel token requiere renovacion periodica
- [ ] feat-011: Cambio de 3 capas simultáneas — riesgo de regresión si no se prueba bien

## Notes for Next Session

- El fix de pos_product_id ya está deployado en master. Vercel deployó automáticamente.
- Para implementar feat-011, seguir el spec en `specs/drill-down-filter-propagation/spec.md`
- Orden recomendado: T1 (hook) → T2 (API parse) → T3a (product) → T3b (staff) → T3c-d-e (cat, hour, zone)
- Cada T debe verificarse en browser antes de continuar al siguiente
- El sitio esta deployado en https://web-rosy-nine-64.vercel.app/admin