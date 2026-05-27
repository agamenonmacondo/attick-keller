# Auditoria: Componentes del dashboard POS que no muestran datos

## Resumen ejecutivo

Se identificaron **3 causas raiz** que explican por que TopProductsTable, CategoryBreakdown, TopProductByCategoryChart, CategoryCompanionsCard, CategoryPerformersCard y el DrillDownPanel muestran "Sin datos" mientras ZoneRevenueChart SI funciona correctamente.

---

## Hallazgo #1 (PRINCIPAL): `setData(null)` oculta TODOS los componentes durante el re-fetch

**Archivo:** `src/lib/hooks/usePOSDashboard.ts:221`

```ts
setData(null) // Clear stale data so components don't show old day data during month load
```

**Mecanismo:** Cada vez que cambian los filtros (categoria, zona, modo consolidado, click en dia del calendario), el hook ejecuta `setData(null)` ANTES del fetch. En `POSDashboardPanel.tsx:236`, el guard `{data && (<> ... </>)}` oculta TODOS los componentes hasta que el fetch termina.

**Por que ZoneRevenueChart "si funciona"?** ZoneRevenueChart NO es inmune a esto. Simplemente tarda lo mismo que los demas en desaparecer/reaparecer. Pero cuando los datos vuelven, `byZone` siempre tiene contenido (viene de `salesForZone` que agrupa ventas por zona — dato directo de `pos_sales.derived_zone_name`, sin dependencia de lookups a `pos_products`). Los otros componentes dependen de `pos_sale_items` + `pos_products` y pueden llegar vacios si el lookup falla (ver Hallazgo #3).

**Fix:** No eliminar data antes del fetch. Mostrar un indicador de carga overlay sin ocultar los datos anteriores:

```ts
// En usePOSDashboard.ts, dentro de fetchDashboard():
async function fetchDashboard() {
  setLoading(true)
  setError(null)
  // ELIMINAR esta linea:
  // setData(null)
  try {
    // ... fetch ...
    if (!cancelled) {
      setData(d)
      setError(null)
    }
  } // ...
}
```

---

## Hallazgo #2: `TopProductsTable` cambia a `productsByCategory[selectedCategory]` y puede mostrar array vacio

**Archivo:** `src/components/admin/pos-dashboard/TopProductsTable.tsx:36-66`

```ts
const isCategoryFiltered = selectedCategory && selectedCategory !== 'all' && productsByCategory
const categoryProducts = isCategoryFiltered ? (productsByCategory[selectedCategory] || []) : null

const displayData = categoryProducts
  ? categoryProducts.map(p => ({ ... }))
  : data.map(p => ({ ... }))

if (displayData.length === 0) {
  return <p>Sin datos</p>  // <-- AQUI se muestra "Sin datos"
}
```

**Mecanismo:** Cuando el usuario selecciona una categoria (clic en CategoryBreakdown):
1. `handleCategoryClick` setea `filters.category = categoryId`
2. El hook re-fetchea con `category=<categoryId>`
3. `data.productsByCategory` contiene TODAS las categorias (construido ANTES del filtro en la API, linea 448-463 de route.ts)
4. `TopProductsTable` detecta `selectedCategory !== 'all'` y busca `productsByCategory[selectedCategory]`

**Problema potencial:** Si `selectedCategory` (que viene de `filters.category`) usa un formato de ID diferente al de las keys de `productsByCategory`, el lookup devuelve `undefined` → `|| []` → array vacio → "Sin datos".

La API usa `String(catId)` como key (route.ts:462) donde `catId` es `info.groupId` (`pos_group_id`). El `selectedCategory` viene del click en CategoryBreakdown que usa `d.categoryId` que es `catKey = info.groupId || catName` (route.ts:367). En teoria coinciden, pero si hay diferencias de trim/espacios, el lookup falla silenciosamente.

**Fix:** Agregar un log de diagnostico y normalizar keys:

```ts
// En TopProductsTable, linea 36-38
const isCategoryFiltered = selectedCategory && selectedCategory !== 'all' && productsByCategory
const categoryProducts = isCategoryFiltered ? (productsByCategory[selectedCategory] || []) : null

// AGREGAR diagnostico:
if (isCategoryFiltered && categoryProducts && categoryProducts.length === 0) {
  console.warn('[TopProductsTable] Category selected but no products found:', {
    selectedCategory,
    availableKeys: Object.keys(productsByCategory),
  })
}
```

Y en la API (route.ts), normalizar las keys de `productsByCategory` con trim:

```ts
// route.ts linea 462, cambiar:
productsByCategory[String(catId)] = products
// por:
productsByCategory[String(catId).trim()] = products
```

---

## Hallazgo #3: Los lookups de producto pueden fallar silenciosamente → arrays vacios en toda la respuesta

**Archivo:** `src/app/api/admin/pos-dashboard/route.ts:283-305, 330-343`

**Mecanismo:** La API obtiene `allItems` de `pos_sale_items`, trimea `pos_product_id`, y luego busca cada ID en `pos_products`. Si un `pos_product_id` no existe en `pos_products`:

```ts
// route.ts:332-334
for (const item of allItems) {
  const info = productInfo.get(item.pos_product_id)
  if (!info) continue  // <-- SILENT SKIP: el item se ignora completamente
  // ...
}
```

Si TODOS los items tienen product IDs que no matchean `pos_products` (por ejemplo, IDs con padding de espacios que no se resolvieron con trim, o IDs que simplemente no existen en la tabla), entonces:

| Campo de la API | Estado | Efecto en componente |
|---|---|---|
| `byZone` | Poblado (viene de sales, no de items) | ZoneRevenueChart FUNCIONA |
| `topProducts` | Array vacio | TopProductsTable: "Sin datos" |
| `topCategories` | Array vacio | CategoryBreakdown: "Sin datos" |
| `topProductByCategory` | Array vacio | TopProductByCategoryChart: "Sin datos" |
| `categoryCompanions` | Array vacio | CategoryCompanionsCard: "Sin datos" |
| `productsByCategory` | `{}` | TopProductsTable en modo categoria: "Sin datos" |
| `topPerformersByCategory` | `{}` | CategoryPerformersCard: "Sin datos" |
| `bottomPerformersByCategory` | `{}` | CategoryPerformersCard: "Sin datos" |

Esto explica EXACTAMENTE los sintomas reportados: ZoneRevenueChart funciona (usa `byZone` que depende de `pos_sales`, no de `pos_products`) y TODOS los componentes de producto/categoria fallan (dependen de `pos_sale_items` + `pos_products`).

**Fix:** Agregar diagnostico en la API para detectar el mismatch:

```ts
// En route.ts, despues de linea 305 (donde se llena productInfo)
const totalItems = allItems.length
const matchedItems = allItems.filter(i => productInfo.has(i.pos_product_id)).length
console.log('[POS-Dashboard API] Product lookup stats:', {
  totalItems,
  matchedItems,
  uniqueProductIdsInItems: productIdsInItems.length,
  uniqueProductIdsInProducts: productInfo.size,
  unmatchedRate: totalItems > 0 ? ((totalItems - matchedItems) / totalItems * 100).toFixed(1) + '%' : '0%',
})

// Si hay muchos unmatched, loguear los primeros IDs para debuggear:
if (matchedItems < totalItems) {
  const unmatched = [...new Set(allItems.filter(i => !productInfo.has(i.pos_product_id)).map(i => i.pos_product_id))]
  console.warn('[POS-Dashboard API] Unmatched product IDs (first 10):', unmatched.slice(0, 10))
}
```

Ademas, verificar en la BD si los `pos_product_id` de `pos_sale_items` existen en `pos_products`:
```sql
SELECT COUNT(DISTINCT si.pos_product_id) AS unique_in_items,
       COUNT(DISTINCT p.pos_product_id) AS unique_in_products
FROM pos_sale_items si
LEFT JOIN pos_products p ON TRIM(si.pos_product_id) = p.pos_product_id;
```

---

## Hallazgo #4: DrillDownPanel — el fetch de detalle usa `filters.from/to` que pueden ser undefined

**Archivo:** `src/lib/hooks/usePOSDashboard.ts:292-318`

```ts
const fetchDrillDown = useCallback(async (type, id, label) => {
  const from = filters.from || ''    // <-- undefined → ''
  const to = filters.to || ''        // <-- undefined → ''
  // ...
  p.set('from', from)
  p.set('to', to)
  const res = await fetch(`/api/admin/pos-dashboard/detail?${p.toString()}&_t=${Date.now()}`)
```

**Mecanismo:** En modo "Consolidado", `from` y `to` son `undefined`. Se convierten a `''` y se envian como query params vacios. La API de detalle (`detail/route.ts:137-156`) auto-detecta el rango de fechas cuando `from` o `to` estan vacios, asi que esto DEBERIA funcionar.

Pero hay un edge case: si la API de detalle falla y `drillDownError` se setea, el `DrillDownPanel` muestra el error pero no datos. El componente requiere `{data && !loading && !error && (...)}` para renderizar el contenido (DrillDownPanel.tsx:860).

**Fix:** Esto es correcto. El unico riesgo es si el auto-detect de fechas en la API de detalle usa una logica diferente a la API principal:

- API principal (route.ts:66-80): busca el `opened_at` mas reciente de `pos_sales` donde `is_paid=true, is_cancelled=false`
- API detalle (detail/route.ts:137-156): busca el `opened_at` mas reciente de `pos_sales` donde `is_paid=true, is_cancelled=false`

Ambas usan la misma logica. OK.

---

## Resumen de hallazgos y severidad

| # | Causa Raiz | Severidad | Componentes afectados |
|---|---|---|---|
| 1 | `setData(null)` oculta componentes durante re-fetch | **ALTA** | Todos (incluyendo ZoneRevenueChart, pero es menos notorio porque byZone siempre se repuebla rapido) |
| 2 | `productsByCategory[selectedCategory]` key mismatch potencial | **MEDIA** | TopProductsTable en modo categoria |
| 3 | Product IDs en `pos_sale_items` no matchean `pos_products` | **CRITICA** | TopProductsTable, CategoryBreakdown, TopProductByCategoryChart, CategoryCompanionsCard, CategoryPerformersCard |
| 4 | `filters.from/to` undefined en drill-down fetch | **BAJA** | DrillDownPanel (funciona porque la API auto-detecta) |

## Diagrama de flujo de datos

```
pos_sales ──→ salesForKPIs ──→ byZone ──→ ZoneRevenueChart ✅ (sin dependencia de pos_products)
           └─→ salesForZone ──→ hourlyRevenue, dailyTrend, kpis, staffPerformance ✅

pos_sales ──→ allSaleIds ──→ pos_sale_items ──→ allItems
                                                  │
                                                  ├─ productInfo.get(id) ──→ SI ──→ topProducts, topCategories,
                                                  │                              topProductByCategory,
                                                  │                              productsByCategory,
                                                  │                              categoryCompanions,
                                                  │                              top/bottomPerformers ✅
                                                  │
                                                  └─ productInfo.get(id) ──→ NO ──→ skip ──→ arrays vacios ❌
                                                     (producto no existe en pos_products)
```

## Recomendacion

1. **Inmediato:** Agregar el diagnostico del Hallazgo #3 a la API para confirmar si hay productos sin match
2. **Inmediato:** Remover `setData(null)` del hook (Hallazgo #1) para evitar el flash de componentes vacios
3. **Seguimiento:** Agregar logs en TopProductsTable (Hallazgo #2) para detectar key mismatches en produccion
4. **DB:** Verificar integridad referencial entre `pos_sale_items.pos_product_id` y `pos_products.pos_product_id`
