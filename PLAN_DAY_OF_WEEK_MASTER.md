# PLAN: Panel Maestro de Detalle por Dia de la Semana en Resultados

## Objetivo
Cuando el usuario hace click en una barra del chart "Revenue por Dia" (Lun, Mar, etc.) en el tab Resultados, TODO el panel cambia a modo inmersivo mostrando datos solo de ese dia de la semana. Incluye: categorias con productos expandidos, combinaciones top 4, zonas, horas, staff, pagos.

## Arquitectura

### 1. Nueva API Route: `/api/admin/pos-dashboard/day-of-week`

**Params:** `dayOfWeek` (ISO 1-7), `from`, `to`, `zone`

**Lógica:** Filtra las ventas donde `EXTRACT(ISODOW FROM opened_at) = dayOfWeek` dentro del rango [from, to].

**Devuelve:** Misma estructura que el dashboard principal (kpis, byZone, hourlyRevenue, topProducts, topCategories, topProductByCategory, productsByCategory, staffPerformance, paymentMethods, categoryCompanions, topPerformersByCategory, bottomPerformersByCategory) pero solo para ese dia de la semana.

**Implementación:** Similar a `/api/admin/pos-dashboard/route.ts` pero con filtro adicional de dia. Se puede hacer con una query SQL que filtre por ISODOW, o filtrar client-side en la API route sobre los resultados de las RPCs existentes.

**Enfoque elegido:** Hacer la consulta directa a pos_sales filtrando por dia de la semana + rango, luego derivar todos los agregados de esas ventas. Esto es más eficiente que llamar las 8 RPCs y filtrar después.

### 2. Nuevo Hook: `usePOSDayOfWeekDetail`

```typescript
interface DayOfWeekDetailData extends POSDashboardData {
  dayOfWeek: number
  dayName: string
  dateRange: string
  dayCount: number
}

function usePOSDayOfWeekDetail(dayOfWeek: number | null): {
  data: DayOfWeekDetailData | null
  loading: boolean
  error: string | null
}
```

- Cuando `dayOfWeek` es null, no hace fetch
- Cuando cambia, llama `/api/admin/pos-dashboard/day-of-week?dayOfWeek=X&from=2026-01-01&to=2026-06-30`

### 3. Nuevo Componente: `DayOfWeekMasterPanel`

Panel inmersivo que reemplaza todo el contenido de Resultados cuando un dia está seleccionado.

**Estructura:**
```
┌─────────────────────────────────────────────┐
│ ← Volver a Resultados    VIERNES             │  breadcrumb header
│ 23 dias viernes · Ene-Jun 2026               │
├─────────────────────────────────────────────┤
│ $4.2M prom/dia  │ 82 chq/dia  │ $310K prop   │  KPI cards reusados
├─────────────────────────────────────────────┤
│ ZONAS              │  HORAS                   │  grid 2 cols
│ ZoneRevenueChart   │  HourlyRevenueChart      │
├─────────────────────────────────────────────┤
│ CATEGORIAS CON PRODUCTOS                     │  NUEVO: cada categoria
│ ┌ COCTELES (54 prod) ───────────────▼─────┐ │  es expandible, muestra
│ │ Old Fashioned    12 uds  $1.2M          │ │  productos con qty+revenue
│ │ Mojito            8 uds  $640K          │ │
│ │ Gin Tonic         6 uds  $480K          │ │
│ └─────────────────────────────────────────┘ │  max 4 categorias
│ ┌ LICORES (196 prod) ────────────────▶────┐ │  expandidas por defecto
│ └─────────────────────────────────────────┘ │
│ ┌ COMIDA ──────────────────────────────▶──┐ │
│ └─────────────────────────────────────────┘ │
│ ┌ BEBIDAS ────────────────────────────▶──┐ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ COMBINACIONES (top 4)                        │  categoryCompanions filtrado
│ COCTELES + COMIDA = 45 cheques compartidos  │  solo top 4
│ LICORES + BEBIDAS = 38 cheques             │
│ VINOS + COMIDA = 22 cheques                │
│ COCTELES + VINOS = 15 cheques              │
├─────────────────────────────────────────────┤
│ STAFF                 │  PAGOS              │  grid 2 cols
│ StaffPerformanceTable │  PaymentMethodsChart │
└─────────────────────────────────────────────┘
```

**Categorías con productos:**
- Solo las 5 macrocategorías: COCTELES, LICORES, VINOS, COMIDA, BEBIDAS
- Cada categoria muestra top 5 productos (por revenue) expandidos por defecto
- Click en categoria expande/colapsa
- Los productos son clickeables → drill-down de producto (usa fetchResultsDrillDown)

### 4. Modificación: `POSDashboardPanel.tsx`

```typescript
// Estado existente
const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<AggregatedDay | null>(null)

// Nuevo hook
const { data: dayDetail, loading: dayDetailLoading, error: dayDetailError } = usePOSDayOfWeekDetail(
  selectedDayOfWeek?.dayOfWeek ?? null
)

// En el render del tab Resultados:
{activeTab === 'results' && (
  selectedDayOfWeek && dayDetail ? (
    <DayOfWeekMasterPanel
      dayData={selectedDayOfWeek}
      data={dayDetail}
      loading={dayDetailLoading}
      error={dayDetailError}
      onBack={() => setSelectedDayOfWeek(null)}
      onProductDrillDown={handleResultsProductDrillDown}
      onCategoryDrillDown={handleResultsCategoryDrillDown}
      onStaffDrillDown={handleResultsStaffDrillDown}
      onZoneDrillDown={handleResultsZoneDrillDown}
      onHourDrillDown={handleResultsHourDrillDown}
    />
  ) : (
    // ... contenido actual de Resultados (chart + componentes consolidados)
  )
)}
```

### 5. API Route Detalle

**Ruta:** `src/app/api/admin/pos-dashboard/day-of-week/route.ts`

**Query principal:**
```sql
SELECT id, total, tip_amount, opened_at, closed_at, party_size, 
       derived_zone_name, is_cancelled, pos_staff_id
FROM pos_sales
WHERE restaurant_id = 'a0000000-0000-0000-0000-000000000001'
  AND opened_at >= :from
  AND opened_at <= :to
  AND EXTRACT(ISODOW FROM opened_at) = :dayOfWeek
```

Luego derivar:
- items por sale → topProducts, topCategories, productsByCategory
- zone aggregation → byZone
- hour extraction → hourlyRevenue  
- staff aggregation → staffPerformance
- payment methods
- category companions (cross-join de items en mismo cheque)

## Archivos a Crear/Modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/app/api/admin/pos-dashboard/day-of-week/route.ts` | CREAR | API route con filtro de dia de semana |
| `src/lib/hooks/usePOSDayOfWeekDetail.ts` | CREAR | Hook para fetch de datos por dia |
| `src/components/admin/pos-dashboard/DayOfWeekMasterPanel.tsx` | CREAR | Panel maestro inmersivo |
| `src/components/admin/pos-dashboard/CategoryDayDetail.tsx` | CREAR | Categorias expandibles con productos |
| `src/components/admin/pos-dashboard/POSDashboardPanel.tsx` | MODIFICAR | Integrar DayOfWeekMasterPanel |

## Constraints
- Zero cambios a la base de datos (no nueva RPC) — la API route hace la query directa
- Zero cambios a componentes existentes — todos se reusan
- Design system: CSS vars borgona/dorado/oliva, Phosphor icons, sin emojis
- Categorias: solo las 5 macrocategorías operacionales (COCTELES, LICORES, VINOS, COMIDA, BEBIDAS)
- Combinaciones: max 4 (top por shared cheques)
- Categorias expandidas por defecto con top 5 productos cada una
- Auth: getAdminUser + getServiceClient como las demás API routes