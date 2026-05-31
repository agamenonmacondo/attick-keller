# Dashboard Operativo POS - Plan

## Objetivo
Dashboard en la tab "Operacion" del admin A&K que consume datos de las tablas `pos_*` ya cargadas en Supabase. Permite a gerencia ver la operacion real del restaurante, filtrar por zona y por categoria de producto, y subir nuevos datos mensualmente.

## Contexto Tecnico

### Stack existente
- **Next.js 15** (App Router) con TypeScript
- **Supabase**: service role via `getServiceClient()` en API routes
- **recharts@^3.8.1**: ya instalada (usada en TrendChart.tsx de customers)
- **framer-motion**: para animaciones
- **@phosphor-icons/react**: iconos (sin emojis)
- **Design system**: CSS vars (--bg-card, --border-default, --text-secondary, etc.), dark mode via `.dark`
- **Patron API**: `src/app/api/admin/*/route.ts` → `getAdminUser(request)` auth → `getServiceClient()` query
- **Patron componentes**: `src/components/admin/` con subcarpetas por feature
- **Patron hooks**: `src/lib/hooks/use*.ts` fetch a `/api/admin/*`
- **Tab system**: AdminShell.tsx con tabs internos (NO rutas anidadas)
- **RESTAURANT_ID**: `'a0000000-0000-0000-0000-000000000001'` (de constants.ts)

### Tablas POS disponibles
- `pos_sales`: 2,313 registros abril 2026 (folio, zona derivada, customer_id, total, tip, cancelada, etc.)
- `pos_sale_items`: 17,185 items (product_id, quantity, unit_price, total)
- `pos_products`: 853 productos (name, pos_product_group_id, price)
- `pos_product_groups`: 54 grupos/categorias (name, pos_area_id)
- `pos_staff`: 44 meseros (name, staff_type)
- `pos_areas`: 10 areas (name)
- `pos_shifts`: 71 turnos
- `pos_sale_payments`: 2,380 pagos (sale_id, payment_method_id, amount)
- `pos_payment_methods`: 32 metodos
- `staff`: 44 con pos_staff_id link
- `pos_id_mapping`: 2,253 mapeos (pos_id → ak_id por entidad)
- `customer_stats`: tiers VIP/Oro/Plata/Bronce con total_spent
- `visit_history`: 224 visitas

### Columnas clave de pos_sales
- `derived_zone_name`: TEXT (Tipi, Attic, Chispas, Keller, Llevar, Interno, Desconocido)
- `derived_zone_id`: UUID (nullable para Keller/Llevar/Interno/Desconocido)
- `pos_area_id`: VARCHAR (01=Tipi, 03=Attic, 04=Chispas, etc.)
- `total`, `tip_amount`, `subtotal`, `tax_amount`
- `item_count`, `party_size`
- `opened_at`, `closed_at`
- `pos_staff_id`, `pos_customer_id`, `customer_id` (nullable la mayoria)
- `is_paid`, `is_cancelled`
- `card_paid`, `cash_paid`

### Zonas derivadas (funcion SQL derive_zone_from_table_code)
- Tipi: 57% de ventas, $401.6M COP
- Attic: 18%, $119.5M COP
- Chispas: 3%, $63.7M COP
- 21% restante: Desconocido, Interno, Llevar, Keller

### Categorias de producto (pos_product_groups → menu_categories via pos_id_mapping)
31 categorias POS mapeadas a 23 menu_categories de A&K

## Arquitectura

### 1. API Routes

**`src/app/api/admin/pos-dashboard/route.ts`**
Endpoint principal. Un solo GET con query params:
- `?period=week|fortnight|month|custom`
- `?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `?zone=Tipi|Attic|Chispas|all`
- `?category=cat_id|all`

Respuesta JSON con todas las metricas calculadas server-side:

```typescript
interface POSDashboardData {
  // KPIs principales
  kpis: {
    revenue: number           // SUM(total) pos_sales no canceladas
    cheques: number           // COUNT pos_sales
    ticketPromedio: number    // revenue / cheques
    propinaTotal: number      // SUM(tip_amount)
    propinaPromedio: number   // propinaTotal / cheques
    personas: number          // SUM(party_size)
    partySizePromedio: number
  }

  // Desglose por zona (siempre viene, para el filtro de zona)
  byZone: Array<{
    zone: string              // 'Tipi', 'Attic', 'Chispas', etc.
    revenue: number
    cheques: number
    ticketPromedio: number
    propinaTotal: number
    pct: number               // % del total
  }>

  // Revenue por hora (ventas reales, no reservas)
  hourlyRevenue: Array<{
    hour: string              // '12', '13', ... '23', '00', ...
    revenue: number
    cheques: number
  }>

  // Tendencia diaria del periodo
  dailyTrend: Array<{
    date: string              // '2026-04-01'
    revenue: number
    cheques: number
    propina: number
  }>

  // Top productos (respetando filtro de zona/category)
  topProducts: Array<{
    productId: string
    productName: string
    category: string
    quantity: number
    revenue: number
  }>

  // Top categorias
  topCategories: Array<{
    categoryId: string
    categoryName: string
    quantity: number
    revenue: number
    cheques: number
  }>

  // Rendimiento meseros
  staffPerformance: Array<{
    staffId: string
    staffName: string
    cheques: number
    revenue: number
    propinaTotal: number
    ticketPromedio: number
  }>

  // Metodos de pago
  paymentMethods: Array<{
    method: string
    amount: number
    count: number
    pct: number
  }>

  // Clientes (tier distribution)
  clientTiers: Array<{
    tier: string
    count: number
    totalSpent: number
  }>

  // Resumen consumidor final vs identificados
  clientSplit: {
    consumidorFinal: { cheques: number; revenue: number }
    identificados: { cheques: number; revenue: number }
  }
}
```

**`src/app/api/admin/pos-upload/route.ts`**
POST endpoint para subir nuevo mes de datos. Recibe JSON con arrays de las tablas pos_. Inserta en Supabase con upsert (evitar duplicados por pos_folio). Retorna resumen de registros insertados.

### 2. Hook

**`src/lib/hooks/usePOSDashboard.ts`**
```typescript
interface POSDashboardFilters {
  period: 'week' | 'fortnight' | 'month'
  zone: string       // 'all' | 'Tipi' | 'Attic' | 'Chispas'
  category: string   // 'all' | category_id
  from?: string       // override fecha inicio
  to?: string         // override fecha fin
}

export function usePOSDashboard(filters: POSDashboardFilters) {
  // fetch a /api/admin/pos-dashboard?... 
  // retorna { data, loading, error, refetch }
}
```

### 3. Componentes

**`src/components/admin/pos-dashboard/`**

```
pos-dashboard/
├── POSDashboardPanel.tsx      # Orquestador principal (equivale a MetricsPanel)
├── POSFiltersBar.tsx          # Barra de filtros: periodo, zona, categoria
├── KPIRow.tsx                 # Fila de 4-6 KPI cards animados
├── KPICard.tsx                # Card individual: valor + label + delta
├── ZoneRevenueChart.tsx       # Barras horizontales: revenue por zona (clickable para filtrar)
├── HourlyRevenueChart.tsx     # Barras: revenue por hora del dia
├── DailyTrendChart.tsx        # Barras verticales: tendencia diaria (recharts BarChart)
├── TopProductsTable.tsx       # Tabla top 15 productos: nombre, categoria, qty, revenue
├── CategoryBreakdown.tsx      # Barras horizontales apiladas o treemap: categorias
├── StaffPerformanceTable.tsx  # Tabla meseros: cheques, revenue, propinas
├── PaymentMethodsChart.tsx    # Dona/pie: metodos de pago (recharts PieChart)
├── ClientTiersCard.tsx        # Card: distribucion de tiers (VIP/Oro/Plata/Bronce)
├── ClientSplitCard.tsx        # Card: consumidor final vs identificados
└── DataUploadSection.tsx      # Seccion para subir nuevo mes de datos
```

### 4. Integracion en AdminShell

Agregar tab "Operacion" (indice 8, entre "Metricas" y "Clientes"). El componente renderiza `<POSDashboardPanel />`.

En `src/components/admin/AdminShell.tsx`:
```typescript
// Agregar al array de tabs:
{ id: 'operacion', label: 'Operacion', icon: ChartBar }

// Agregar caso en el switch de contenido:
case 'operacion': return <POSDashboardPanel />
```

## Reglas de Diseño

1. **Usar recharts** para todos los charts (consistencia con TrendChart ya existente). ResponsiveContainer con width='100%' height={280}
2. **No emojis** en labels ni titulos. Usar Phosphor icons.
3. **Colores del design system**: 
   - Tipi → `ak-madera` (#3E2723) o tono calido
   - Attic → `ak-borgona` (#6B2737)
   - Chispas → `ak-ambar` (#D4922A)
   - Chart palette: `['#6B2737', '#5C7A4D', '#D4922A', '#C9A94E', '#3E2723', '#8B5E3C']`
4. **Dark mode**: todo via CSS vars, sin colores harcodeados
5. **Filtros como URL params** o estado local, pero el fetch se hace con los filtros como query params al API
6. **Formato moneda COP**: `$1.2M` para >999K, `$890K` para >999, `$12.500` para <1000. Sin decimales.
7. **Tabla pos_sales tiene datos de abril 2026 unicamente**. El selector de periodo debe defaultear al rango de datos disponibles (2026-04-01 a 2026-04-30).
8. **Paginacion**: Supabase REST limit 1000. Para queries que pueden retornar mas, usar paginacion en el API route o hacer las agregaciones en SQL via `supabase.rpc()` o queries directas.
9. **Performance**: Las agregaciones pesadas van en el API route (server-side), NO en el cliente. Preferir SELECT con agregacion en Postgres cuando sea posible.

## Filtro por Zona - Comportamiento

Cuando el usuario selecciona una zona (ej: "Tipi"):
- Todos los KPIs se recalculan para esa zona
- Los charts de horas, tendencia diaria, top productos se filtran
- El chart de "Revenue por Zona" permanece visible (muestra todas las zonas, pero resalta la seleccionada)
- El top de productos se recalcula para esa zona

El filtro de zona se implementa en el API route:
```sql
WHERE derived_zone_name = :zone  -- o sin filtro si zona='all'
```

## Filtro por Categoria - Comportamiento

Cuando el usuario selecciona una categoria:
- KPIs se recalculan solo para items de esa categoria
- El top productos se filtra a esa categoria
- Los charts de horas y tendencia se filtran a ventas que contengan items de esa categoria
- Si hay zona + categoria activos, se aplican AMBOS filtros (AND)

## Upload de Datos Mensuales

La seccion de upload debe:
1. Aceptar un archivo JSON o ZIP con los CSVs del mes
2. Validar estructura (campos minimos requeridos)
3. Hacer upsert en las tablas pos_ (evitar duplicados por pos_folio + pos_series)
4. Mostrar progreso y resultado (# registros insertados/actualizados)
5. Despues del upload exitoso, refrescar el dashboard

Por ahora (MVP), aceptar un JSON con la estructura de las tablas pos_. El JSON se puede generar desde un script que parse los CSVs exportados de SoftRestaurant (ya tenemos el parser en Python).

## Orden de Implementacion

1. API route `/api/admin/pos-dashboard` (con todos los queries y agregaciones)
2. Hook `usePOSDashboard`
3. `POSDashboardPanel` + `POSFiltersBar`
4. `KPIRow` + `KPICard` (los 6 KPIs base)
5. `ZoneRevenueChart` (critical - es el filtro principal)
6. `HourlyRevenueChart`
7. `DailyTrendChart`
8. `TopProductsTable` + filtro de categoria
9. `CategoryBreakdown`
10. `StaffPerformanceTable`
11. `PaymentMethodsChart`
12. `ClientTiersCard` + `ClientSplitCard`
13. `DataUploadSection`
14. Integrar tab "Operacion" en AdminShell

## Notas para Claude Code

- NO modifiques las tablas existentes ni las API routes de metricas de reservas
- NO uses shadcn/ui, radix, o librerias UI que no esten ya instaladas
- Los datos son colombianos: moneda COP, coma decimal, fecha D/M/YYYY en el POS
- La funcion `derive_zone_from_table_code` ya existe en Postgres y las columnas `derived_zone_name` / `derived_zone_id` ya estan en `pos_sales`
- `pos_product_groups` tiene IDs como '01', '02'... y subgrupos como 'SG_01_01'. El campo `pos_product_group_id` en `pos_products` referencia estos IDs. Mapeo a categorias A&K via `pos_id_mapping` donde `ak_table='menu_categories'` y `pos_table='pos_product_groups'`
- Para obtener category desde un sale_item: pos_sale_items.pos_product_id → pos_products.pos_product_group_id → pos_id_mapping(pos_id=group_id, ak_table='menu_categories') → menu_categories.name
- El RESTAURANT_ID esta en `src/lib/utils/admin-auth.ts` como constante exportada
- Lee primero AGENTS.md en la raiz del proyecto web antes de empezar