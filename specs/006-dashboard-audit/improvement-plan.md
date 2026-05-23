# Plan de Mejora — Módulo Operación (POS Dashboard)
## Attick & Keller

**Fecha:** 2026-05-22  
**Basado en:** `specs/006-dashboard-audit/audit.md` + análisis de código fuente  
**Estimación total:** ~8-10 horas

---

## P1 — CRÍTICOS (3-4 horas)

### Paso 1: BUG-01 — Top Products filtra por categoría seleccionada

**Archivos:**
- `src/app/api/admin/pos-dashboard/route.ts`
- `src/components/admin/pos-dashboard/TopProductsTable.tsx`

**Problema:** Cuando se selecciona "Pizzas", los KPIs se filtran correctamente pero `topProducts` sigue mostrando los 15 productos globales (vinos, cervezas, etc.). Además, cuando se filtra por categoría, los items de ventas que contienen pizzas TAMBIÉN incluyen items de otras categorías (una venta con pizza + vino muestra ambos).

**Cambio en API (`route.ts`):**

```typescript
// DESPUÉS de construir allItems (línea ~270), agregar filtrado por categoría:
if (categoryParam && categoryParam !== 'all') {
  // Filtrar items para SOLO incluir los de la categoría seleccionada
  const categoryProductIds = new Set(
    allProducts
      .filter((p: any) => String(p.pos_group_id) === categoryParam)
      .map((p: any) => String(p.pos_product_id))
  )
  allItems = allItems.filter((item: any) =>
    categoryProductIds.has(String(item.pos_product_id))
  )
}
```

**Cambio en `TopProductsTable.tsx`:**

Ya implementado parcialmente — cuando `selectedCategory !== 'all'`, muestra `productsByCategory[selectedCategory]`. Verificar que los datos llegan correctamente desde el API porque el fix anterior eliminó el import CSS roto que causaba build fail.

**Verificación:**
- Seleccionar "Pizzas" en el filtro → tabla debe mostrar solo productos de Pizzas
- Quitar filtro → debe volver a mostrar top 15 globales
- Verificar que el revenue total por categoría coincide

---

### Paso 2: BUG-02 — Drill-down por categoría muestra TODOS los productos (left-join)

**Archivos:**
- `src/app/api/admin/pos-dashboard/detail/route.ts`

**Problema:** Al hacer drill-down en "Pizzas", solo se muestran las pizzas que tuvieron ventas en el período. Las que no se vendieron simplemente no aparecen. El usuario necesita ver TODAS las pizzas con su desempeño, incluyendo las que tienen qty=0 y revenue=0.

**Cambio en `handleCategory` (`detail/route.ts`):**

```typescript
// ACTUAL (solo productos con ventas):
const topProducts = Object.entries(productRevenue)
  .map(([productId, data]: [string, any]) => ({
    productId,
    productName: productInfo[productId]?.name || productId,
    quantity: data.qty,
    revenue: data.revenue,
    avgPrice: data.qty > 0 ? Math.round(data.revenue / data.qty) : 0,
    cheques: data.cheques,
  }))
  .sort((a, b) => b.revenue - a.revenue)

// NUEVO (left-join: TODOS los productos de la categoría):
// 1. Obtener TODOS los productos de la categoría
const { data: categoryProducts } = await sb
  .from('pos_products')
  .select('pos_product_id, name, price')
  .eq('pos_group_id', categoryId)

const allCategoryProducts = categoryProducts || []

// 2. Merge con datos de ventas (productos sin ventas = 0)
const topProducts = allCategoryProducts.map((p: any) => {
  const data = productRevenue[String(p.pos_product_id)] || { qty: 0, revenue: 0, cheques: 0 }
  return {
    productId: String(p.pos_product_id),
    productName: p.name,
    quantity: data.qty,
    revenue: data.revenue,
    avgPrice: data.qty > 0 ? Math.round(data.revenue / data.qty) : Math.round(Number(p.price) || 0),
    cheques: data.cheques,
  }
}).sort((a, b) => b.revenue - a.revenue)
```

**Verificación:**
- Drill-down en "Pizzas" → debe mostrar las 9 pizzas, incluyendo las sin ventas (qty=0, revenue=0)
- Las pizzas sin ventas deben aparecer al final de la lista
- El conteo total debe coincidir con los productos de la categoría en `pos_products`

---

### Paso 3: BUG-03 — Zona "Desconocido" fuera del gráfico de zonas

**Archivos:**
- `src/app/api/admin/pos-dashboard/route.ts`
- `src/components/admin/pos-dashboard/ZoneRevenueChart.tsx`
- `src/components/admin/pos-dashboard/POSDashboardPanel.tsx`

**Cambio en API (`route.ts`):**

Separar "Desconocido" de las zonas regulares y agregarlo como KPI separado:

```typescript
// En la sección de byZone (línea ~490):
const byZone = Object.entries(zoneMap)
  .filter(([zone]) => zone !== 'Desconocido')
  .map(([zone, data]) => ({ zone, ...data }))
  .sort((a, b) => b.revenue - a.revenue)

// Agregar KPI separado:
const unknownZoneRevenue = zoneMap['Desconocido']?.revenue || 0
const unknownZoneCheques = zoneMap['Desconocido']?.cheques || 0

// Incluir en la respuesta:
return Response.json({
  ...existingFields,
  byZone,
  unknownZone: {
    revenue: unknownZoneRevenue,
    cheques: unknownZoneCheques,
    pct: totalRevenue > 0 ? Math.round((unknownZoneRevenue / totalRevenue) * 100) : 0,
  },
})
```

**Cambio en `ZoneRevenueChart.tsx`:**
- Filtrar "Desconocido" del array de datos si aun aparece
- Agregar prop `unknownZone` para mostrar nota al pie

**Cambio en `POSDashboardPanel.tsx`:**
- Mostrar `unknownZone` como un KPI card pequeño debajo del gráfico de zonas:
  ```
  Ventas sin zona asignada: $X (Y% del total)
  ```

**Verificación:**
- El gráfico de zonas NO debe mostrar "Desconocido"
- Debe haber un KPI o nota que diga "X% de ventas sin zona asignada"
- Los porcentajes del gráfico deben sumar ~100% (excluyendo desconocido)

---

## P2 — DATOS INCORRECTOS (2-3 horas)

### Paso 4: BUG-04 — Fallback para unit_price NULL/0

**Archivo:** `src/app/api/admin/pos-dashboard/route.ts`

**Cambio:** En el cálculo de revenue por producto, agregar fallback:

```typescript
// ACTUAL:
const unitPrice = Number(item.unit_price) || 0
const qty = Number(item.quantity) || 0
const revenue = qty * unitPrice

// NUEVO:
const unitPrice = Number(item.unit_price) || 
  (Number(item.total_price) && Number(item.quantity) 
    ? Number(item.total_price) / Number(item.quantity) 
    : Number(productInfo[String(item.pos_product_id)]?.price) || 0)
const qty = Number(item.quantity) || 0
const revenue = Number(item.total_price) || (qty * unitPrice)
```

Preferir `total_price` del item cuando esté disponible. Solo calcular como último recurso.

---

### Paso 5: BUG-09 — avgTicket sin propinas

**Archivo:** `src/app/api/admin/pos-dashboard/route.ts`

**Cambio:** Verificar si `total` incluye propinas. Si es así, restarlas:

```typescript
// ACTUAL:
const avgTicket = totalCheques > 0 ? totalRevenue / totalCheques : 0

// NUEVO (si total incluye tips):
const netRevenue = totalRevenue - totalPropina
const avgTicket = totalCheques > 0 ? netRevenue / totalCheques : 0

// Incluir ambos en la respuesta:
avgTicket,           // sin propinas
avgTicketWithTip,     // con propinas (actual)
```

**Verificación:** Comparar `avgTicket` con la suma manual de algunos cheques. Si `total` ya incluye `tip_amount`, el ticket promedio actual está inflado.

---

### Paso 6: BUG-13 — party_size excluye ceros

**Archivo:** `src/app/api/admin/pos-dashboard/route.ts`

```typescript
// ACTUAL:
const partySizeTotal = allSales.reduce((s, r) => s + (Number(r.party_size) || 0), 0)
const partySizeAvg = totalCheques > 0 ? partySizeTotal / totalCheques : 0

// NUEVO:
const salesWithPartySize = allSales.filter(s => Number(s.party_size) > 0)
const partySizeAvg = salesWithPartySize.length > 0
  ? salesWithPartySize.reduce((s, r) => s + Number(r.party_size), 0) / salesWithPartySize.length
  : 0

// Incluir en respuesta:
partySizeAvg,
partySizeCoverage: Math.round((salesWithPartySize.length / totalCheques) * 100), // % de cheques con party_size
```

---

### Paso 7: BUG-11 — Formato moneda unificado

**Archivo:** `src/components/admin/pos-dashboard/KPICard.tsx`

**Cambio:** Verificar que TODOS los componentes usen `formatCOPDisplay` o `formatCOPCompact` para valores monetarios. Revisar:
- `TopProductsTable.tsx` — revenue, avgPrice
- `TopProductByCategoryChart.tsx` — revenue
- `DrillDownPanel.tsx` — todos los valores monetarios
- `ZoneRevenueChart.tsx` — revenue
- `ShiftReconciliation.tsx` — revenue, tips

Buscar `\.toLocaleString` o formateo manual y reemplazar por `formatCOPDisplay`.

---

## P3 — UX (3-4 horas)

### Paso 8: UX-02 — Indicador visual de filtros activos

**Archivos:**
- `src/components/admin/pos-dashboard/POSDashboardPanel.tsx`
- `src/components/admin/pos-dashboard/KPIRow.tsx`

**Cambio:** Cuando hay un filtro activo (zona o categoría), mostrar un badge sobre los KPIs:

```tsx
{/* En POSDashboardPanel, antes de KPIRow */}
{(filters.zone !== 'all' || filters.category !== 'all') && (
  <div className="flex items-center gap-2 mb-2">
    <span className="px-2 py-0.5 text-[10px] rounded-full bg-[var(--color-primary)] text-white">
      Filtrado: {filters.zone !== 'all' ? `Zona ${filters.zone}` : ''} 
                 {filters.zone !== 'all' && filters.category !== 'all' ? ' · ' : ''}
                 {filters.category !== 'all' ? data.categoryList?.find(c => c.id === filters.category)?.name || filters.category : ''}
    </span>
    <button 
      onClick={() => { /* reset filters */ }}
      className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
    >
      Limpiar filtro
    </button>
  </div>
)}
```

---

### Paso 9: UX-03 — Tooltip en Heatmap

**Archivo:** `src/components/admin/pos-dashboard/RevenueHeatmapCalendar.tsx`

**Cambio:** Agregar tooltip al hover sobre cada día:

```tsx
// El componente ActivityCalendar ya soporta renderTooltip si se configura:
<ActivityCalendar
  data={calendarData}
  labels={{ months: EN_MESES, weekdays: EN_DIAS, totalCount: '{{count}} cheques' }}
  theme={calendarTheme}
  renderTooltip={(data: any) => {
    const d = calendarData.find(c => c.date === data.date)
    if (!d) return null
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded px-2 py-1 shadow-lg">
        <p className="text-xs font-medium">{data.date}</p>
        <p className="text-[10px]">{formatCOPDisplay(d?.count || 0)} · {d?.level === 0 ? 'Sin ventas' : `${d?.count} cheques`}</p>
      </div>
    )
  }}
/>
```

**Nota:** Verificar si `react-activity-calendar` soporta `renderTooltip`. Si no, usar wrapper div con `onMouseOver` y position absolute.

---

### Paso 10: BUG-12 — Heatmap muestra días sin ventas

**Archivo:** `src/app/api/admin/pos-dashboard/route.ts`

**Cambio:** En el cálculo de `dailyKpis`, generar entradas para TODOS los días del rango, no solo los que tienen ventas:

```typescript
// ACTUAL: solo días con ventas
const dailyKpis = Object.entries(dailyMap)
  .map(([date, data]) => ({ date, ...data }))
  .sort((a, b) => a.date.localeCompare(b.date))

// NUEVO: todos los días del rango
const start = new Date(from)
const end = new Date(to)
const allDays: string[] = []
for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
  allDays.push(d.toISOString().split('T')[0])
}

const dailyKpis = allDays.map(date => ({
  date,
  revenue: dailyMap[date]?.revenue || 0,
  cheques: dailyMap[date]?.cheques || 0,
  avgTicket: dailyMap[date]?.avgTicket || 0,
  propina: dailyMap[date]?.propina || 0,
}))
```

---

### Paso 11: UX-05 — Filtrar categorías con 0 ventas del período

**Archivo:** `src/app/api/admin/pos-dashboard/route.ts`

Ya implementado parcialmente — `categoriesWithProducts` filtra categorías sin productos. Verificar que también filtre categorías con 0 ventas en el período:

```typescript
// En categoriesWithProducts, agregar filtro de revenue > 0:
.filter(([, products]) => products.length > 0)
```

Ya está filtrando por productos con ventas. Agregar también filtro de revenue:

```typescript
const categoryList = Array.from(categoriesWithProducts.entries())
  .map(([id, products]) => {
    const catRevenue = products.reduce((s, p) => s + p.revenue, 0)
    return { id, name: groupNameMap.get(id) || id, productCount: products.length, revenue: catRevenue }
  })
  .filter(c => c.revenue > 0) // Solo categorías con ventas en el período
```

---

## P4 — ENRIQUECIMIENTO (nice-to-have, ~3 horas)

### Paso 12: BUG-05/06 — Items cancelados y product count real

- Filtrar `pos_sale_items.is_cancelled = true` de TODOS los cálculos de revenue
- Filtrar `pos_products.is_active = false` de topProducts y productCount
- Filtrar `pos_staff.is_visible = false` de topStaff
- No usar `pos_sales.item_count`, siempre calcular desde `pos_sale_items`

### Paso 13: UX-06/07 — Staff por tipo y propina por método

- Agregar filtro de tipo de staff (mesero/cajero) en `topStaff`
- Desglosar propina por método de pago en `paymentMethods`

### Paso 14: UX-08 — ClientTiers por período

- Filtrar `clientTiers` por período seleccionado en vez de datos globales
- Considerar usar `pos_sales` JOIN `customer_stats` WHERE date range

---

## Orden de Ejecución Recomendado

```
Paso 1 (BUG-01) → Paso 2 (BUG-02) → Paso 3 (BUG-03) → 
  Paso 4 (BUG-04) → Paso 5 (BUG-09) → Paso 6 (BUG-13) → 
  Paso 7 (BUG-11) → Paso 8 (UX-02) → Paso 9 (UX-03) → 
  Paso 10 (BUG-12) → Paso 11 (UX-05)
```

Cada paso se puede deployar y verificar independientemente antes de seguir al siguiente.