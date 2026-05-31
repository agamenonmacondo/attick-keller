# SPEC: Drill-Down Filter Propagation

**Fecha:** 2026-05-27
**Estado:** Draft
**Prioridad:** P1

## Problema

Los drill-downs (producto, mesero, categoría, hora, zona) **no respetan los filtros activos del dashboard** (zona, categoría, rango de fecha). Siempre muestran datos consolidados del periodo, sin importar qué filtros tenga el usuario.

Específicamente:
- Si seleccionas un día (vista día), los drill-downs muestran datos del mes completo
- Si filtras por zona "Attic", los drill-downs muestran TODAS las zonas
- Si filtras por categoría "Cervezas", los drill-downs muestran TODAS las categorías

## Causa Raíz

**3 capas están involucradas:**

### 1. Hook `usePOSDashboard.ts` → `fetchDrillDown()` (Líneas 285-311)

```typescript
const fetchDrillDown = useCallback(async (type, id, label) => {
  const p = new URLSearchParams()
  p.set('type', type)
  p.set('id', id)
  p.set('from', filters.from || '')
  p.set('to', filters.to || '')
  // ❌ NO envía zone ni category
}, [filters.from, filters.to])  // ❌ No depende de zone/category
```

**Faltan:** `p.set('zone', ...)` y `p.set('category', ...)`

### 2. API `detail/route.ts` → GET handler (Líneas 115-184)

```typescript
const type = qparam(request, 'type')
const id = qparam(request, 'id')
const fromParam = qparam(request, 'from') || ''
const toParam = qparam(request, 'to') || ''
// ❌ NO parsea zone ni category
```

Luego pasa `(sb, id, fromDate, toDate)` a cada handler — sin zona ni categoría.

### 3. API Handlers — Cada uno ignora zona/categoría

| Handler      | Filtra fecha | Filtra zona | Filtra categoría |
|-------------|-------------|-------------|-----------------|
| handleProduct  | ✅ from/to  | ❌          | N/A (ya es producto) |
| handleStaff    | ✅ from/to  | ❌          | ❌               |
| handleCategory | ✅ from/to  | ❌          | N/A (ya es categoría) |
| handleHour     | ✅ from/to  | ❌          | ❌               |
| handleZone     | ✅ from/to  | N/A (ya es zona) | ❌          |

## Datos Técnicos Detallados

### Flujo actual (roto)

```
Usuario click en producto
  → handleProductDrillDown(productId, productName)
    → fetchDrillDown('product', id, label)
      → URL: /api/admin/pos-dashboard/detail?type=product&id=01001&from=2026-05-01&to=2026-05-31
        → handleProduct(sb, '01001', fromDate, toDate)
          → Query pos_sale_items por productId (SIN zona)
          → Query pos_sales por saleIds + fecha (SIN zona)
          → Retorna TODAS las zonas
```

### Flujo deseado (corregido)

```
Usuario click en producto con zona=Attic, categoría=all, día=2026-05-15
  → handleProductDrillDown(productId, productName)
    → fetchDrillDown('product', id, label)
      → URL: /api/admin/pos-dashboard/detail?type=product&id=01001&from=2026-05-15&to=2026-05-15&zone=Attic&category=all
        → handleProduct(sb, '01001', fromDate, toDate, 'Attic', 'all')
          → Query pos_sale_items por productId
          → Query pos_sales por saleIds + fecha + zona (si aplica)
          → Retorna datos filtrados
```

## Plan de Implementación

### T1: Hook — Enviar filtros de zona y categoría

**Archivo:** `src/lib/hooks/usePOSDashboard.ts`

```typescript
// Antes:
p.set('from', filters.from || '')
p.set('to', filters.to || '')
// Solo depende de: [filters.from, filters.to]

// Después:
p.set('from', filters.from || '')
p.set('to', filters.to || '')
p.set('zone', filters.zone || 'all')
p.set('category', filters.category || 'all')
// Depender de: [filters.from, filters.to, filters.zone, filters.category]
```

### T2: API — Parsear nuevos parámetros y pasarlos a handlers

**Archivo:** `src/app/api/admin/pos-dashboard/detail/route.ts`

```typescript
// Agregar al parseo de params:
const zoneParam = qparam(request, 'zone') || 'all'
const categoryParam = qparam(request, 'category') || 'all'

// Pasar a cada handler:
handleProduct(sb, id, fromDate, toDate, zoneParam, categoryParam)
handleStaff(sb, id, fromDate, toDate, zoneParam, categoryParam)
// etc.
```

### T3: Handlers — Aplicar filtros en cada query

Esto es lo más extenso. Cada handler necesita:

#### 3a. handleProduct — Filtrar ventas por zona

```typescript
// Después de obtener allSales, antes de calcular métricas:
let filteredSales = activeSales
if (zoneParam && zoneParam !== 'all') {
  filteredSales = activeSales.filter(s =>
    (s.derived_zone_name || 'Desconocido') === zoneParam
  )
}
// Usar filteredSales en vez de activeSales para summary, byZone, byHour
// Mantener allSales SIN filtro de zona para companions (productos acompañantes)
```

Nota: `byZone` breakdown se mantiene mostrando TODAS las zonas (el drill-down de producto
te interesa ver la distribución por zona del producto), pero el summary y los companions
solo deben contar lo de la zona filtrada.

#### 3b. handleStaff — Filtrar por zona y categoría

```typescript
// Zona: filtrar pos_sales por derived_zone_name
if (zoneParam && zoneParam !== 'all') {
  allSales = allSales.filter(s => s.derived_zone_name === zoneParam)
}
// Categoría: filtrar items por pos_product_group_id
// (necesita join con pos_products y pos_product_groups)
```

#### 3c. handleCategory — Filtrar por zona

```typescript
// Similar a product: filtrar pos_sales por derived_zone_name
if (zoneParam && zoneParam !== 'all') {
  // Filtrar allSales por zona antes de calcular métricas
}
```

#### 3d. handleHour — Filtrar por zona y categoría

```typescript
// Filtrar ventas por zona
if (zoneParam && zoneParam !== 'all') {
  allSales = allSales.filter(s => s.derived_zone_name === zoneParam)
}
// Filtrar items por categoría (necesita join)
```

#### 3e. handleZone — Filtrar por categoría

```typescript
// La zona ya está implícita en el handler
// Filtrar items por categoría
if (categoryParam && categoryParam !== 'all') {
  // Solo contar items de productos en la categoría filtrada
}
```

### T4: Filtro de categoría en handlers que lo necesitan

Para filtrar por categoría en los handlers, se necesita un join con `pos_products.pos_product_group_id`.

```typescript
// Patrón para filtrar items por categoría:
if (categoryParam && categoryParam !== 'all') {
  // Obtener productos de la categoría
  const { data: catProducts } = await sb
    .from('pos_products')
    .select('pos_product_id')
    .eq('pos_product_group_id', categoryParam)

  const catProductIds = new Set(catProducts?.map(p => p.pos_product_id.trim()) || [])

  // Filtrar items
  validItems = validItems.filter(i =>
    catProductIds.has((i.pos_product_id || '').trim())
  )
}
```

## Orden de Prioridad

1. **P1 CRÍTICO:** T1 + T2 + T3a — Producto drill-down respeta zona (el más usado)
2. **P1 CRÍTICO:** T3b — Staff drill-down respeta zona
3. **P2 ALTO:** T3c — Category drill-down respeta zona
4. **P2 ALTO:** T3d — Hour drill-down respeta zona
5. **P2 ALTO:** T3e — Zone drill-down respeta categoría
6. **P3 MEDIO:** T4 — Filtro de categoría en todos los drill-downs

## Notas Adicionales

- El bug de `pos_product_id` sin padding (que arreglamos antes) ya está corregido
- El filtro de FECHA sí funciona (from/to se pasan correctamente)
- El bug es exclusivamente de zona y categoría
- Cuando el usuario está en vista "consolidado" (sin día específico), from/to se vacían y el API auto-detecta el mes más reciente — eso funciona bien
- Los summary rows (totalRevenue, totalQty, etc.) DEBEN reflejar los filtros activos, no datos globales