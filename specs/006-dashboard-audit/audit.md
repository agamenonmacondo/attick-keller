# Auditoría Completa — Módulo Operación (POS Dashboard)
## Attick & Keller — Dashboard de Operación

**Fecha:** 2026-05-22  
**Alcance:** Base de datos Supabase → API Routes → Hook → Componentes Frontend  
**Objetivo:** Identificar gaps, bugs y problemas de UX en el flujo completo de datos

---

## 1. Estructura Completa de la Base de Datos

### Tablas `pos_*` accesibles

| Tabla | Registros | Columnas Clave |
|-------|-----------|----------------|
| `pos_sales` | 2,313 | id, total, tip_amount, opened_at, closed_at, party_size, derived_zone_name, derived_zone_id, pos_staff_id, pos_customer_id, customer_id, is_cancelled, item_count, discount_amount, cover_count, restaurant_id, shift_id, table_number, (38 columnas total) |
| `pos_sale_items` | 17,185 | id, pos_sale_id, pos_product_id, quantity, unit_price, total_price, discount_amount, is_cancelled, notes, prep_status |
| `pos_products` | 853 | pos_product_id, name, pos_group_id, price, is_active, pos_restaurant_id |
| `pos_product_groups` | 54 | pos_group_id, name, classification, is_alcohol, parent_group_id, restaurant_id |
| `pos_staff` | 44 | pos_staff_id, name, staff_type, is_visible, pos_restaurant_id |
| `pos_sale_payments` | 2,380 | id, pos_sale_id, pos_payment_method_id, amount, tip_amount |
| `pos_payment_methods` | 32 | pos_payment_method_id, name, type, is_active |
| `pos_shifts` | 71 | id, opened_at, closed_at, pos_staff_id_open, pos_staff_id_close, restaurant_id |
| `pos_tables` | N/A | **404 — Tabla no accesible vía REST API (posiblemente no existe o RLS la bloquea)** |
| `customer_stats` | 22,859 | customer_id, pos_customer_id, total_visits, total_spent, last_visit, tier |

### Detalle de `pos_product_groups` (Categorías)

**30 grupos principales** (con productos):

| ID | Nombre | # Productos |
|----|--------|-------------|
| 01 | ANTIPASTOS FRIOS | 13 |
| 02 | FUERTES | 22 |
| 03 | ENSALADAS | 11 |
| 04 | SOPAS | 6 |
| 05 | PIZZAS | 9 |
| 06 | PASTAS | 14 |
| 07 | POSTRES | 11 |
| 08 | BEBIDAS | 39 |
| 09 | VINOS | 113 |
| 10 | CERVEZAS | 22 |
| ... | (20 más) | ... |

**24 subgrupos** (todos con 0 productos vinculados — no se usan efectivamente)

### Detalle de Zonas (`derived_zone_name`)

| Zona | Registros | % |
|------|-----------|---|
| Tipi | 1,327 | 57% |
| Desconocido | 425 | 18% |
| Attic | 420 | 18% |
| Chispas | 73 | 3% |
| Llevar | ? | ? |
| Interno | ? | ? |
| Keller | ? | ? |

**BUG CRÍTICO:** 425 ventas (18%) tienen zona "Desconocido". Esto indica que `derived_zone_id` no always mapea correctamente a una zona nominal.

### Detalle de Métodos de Pago

| Tipo | Métodos | Ejemplos |
|------|---------|----------|
| 1 (Efectivo) | EF | Efectivo |
| 2 (Tarjeta) | VISA, MC, TAR, AMEX, etc. | Tarjeta crédito/débito |
| 3 (Ficha/Valor) | VAL | Vales/fichas |
| 4 (Otros) | TRANSFERENCIA, RAPPI, JUSTO, CORTESIAS, CR, etc. | Variados |

### Detalle de Staff

| Tipo | Cantidad | Rol |
|------|----------|-----|
| 1 | 41 | Meseros |
| 3 | 3 | Cajeros |

### Rango de Datos

- **Primera venta:** 2026-04-01
- **Ventas canceladas:** ~2 registros (filtradas en API con `.eq('is_cancelled', false)`)
- **Descuentos:** 12% de ventas tienen `discount_amount > 0`
- **customer_id (UUID):** Siempre NULL — solo se usa `pos_customer_id` (string como "000001")

---

## 2. Mapeo DB → API → Frontend

### 2.1 API Principal (`/api/admin/pos-dashboard/route.ts`)

**Queries a DB:**
1. `pos_sales` → filtra por fecha, zona, `is_cancelled=false`, paginación en batches de 500
2. `pos_sale_items` → items de las ventas filtradas
3. `pos_products` → nombres y grupos de productos
4. `pos_product_groups` → nombres de categorías
5. `pos_staff` → nombres de staff
6. `pos_shifts` → datos de turnos
7. `pos_sale_payments` + `pos_payment_methods` → desglose de pagos
8. `customer_stats` → tiers de clientes

**Respuesta JSON:**

```
{
  kpis: {
    revenue, cheques, avgTicket, tips, 
    partySize, avgServiceTime, cardPct, cashPct,
    cancelledCheques, cancelledRevenue,
    totalCustomers, newCustomers, returningCustomers,
    discountAmount, discountPct
  },
  topProducts: [{ product, categoryId, categoryName, qty, revenue, avgPrice }] // top 15
  categories: [{ id, name, productCount, revenue, qty }],
  byHour: [{ hour, revenue, cheques, propina }],
  dailyKpis: [{ date, revenue, cheques, avgTicket, propina }],
  topStaff: [{ id, name, cheques, revenue, avgTicket }],
  paymentMethods: [{ name, type, amount, count }],
  zoneRevenue: [{ zone, revenue }],
  shiftSummary: [{ id, openedAt, closedAt, openStaff, closeStaff, revenue, cheques, tips }],
  clientTiers: [{ tier, count, totalSpent }],
  activeFilters: { from, to, zone, category }
}
```

### 2.2 API Detail (`/api/admin/pos-dashboard/detail/route.ts`)

Maneja 3 tipos de drill-down:

| Tipo | Parámetros | Datos que devuelve |
|------|------------|-------------------|
| `category` | `id=05` (grupo ID) | `topProducts` (productos de esa categoría), `summary` |
| `zone` | `id=Tipi` (nombre zona) | `topProducts`, `byHour`, `topStaff`, `dailyTrend`, `categoryBreakdown`, `paymentMethods`, `summary` |
| `product` | `id=xxx` (product ID) | `productInfo`, `salesTrend`, `byHour`, `topStaff`, `byZone`, `paymentMethods`, `summary` |

### 2.3 Hook (`usePOSDashboard.ts`)

**Estado que maneja:**
- `data` — respuesta completa de la API principal
- `detailData` — respuesta de la API de detalle (drill-down)
- `loading`, `error` — estados de carga
- `from`, `to` — rango de fechas (default: inicio del mes actual → hoy)
- `zoneFilter` — filtro de zona (`'all'` por defecto)
- `categoryFilter` — filtro de categoría (`'all'` por defecto)
- `drillDown` — objeto `{ type, id, label }` para el drill-down activo

**Lógica clave:**
- `fetchData()` llama a la API principal con `from`, `to`, `zone`, `category`
- `fetchDetail(type, id, label)` llama a la API de detalle
- Al cambiar filtros, re-fetch automático
- Al abrir drill-down, se llama fetchDetail y se renderiza DrillDownPanel

### 2.4 Componente Principal (`POSDashboardPanel.tsx`)

**Layout y props que pasa:**

| Sección | Componente | Props que recibe |
|---------|-----------|-----------------|
| Filtros | `POSFiltersBar` | zones[], categories[], zoneFilter, categoryFilter, onZoneChange, onCategoryChange |
| KPIs principales | `KPIRow` | kpis (revenue, cheques, avgTicket, tips, partySize, avgServiceTime, cardPct, cashPct) |
| KPIs diarios | `DayKPIBar` | data=dailyKpis, onDayClick |
| Top Productos | `TopProductsTable` | products=topProducts, onDrillDown, selectedCategoryId=categoryFilter |
| Categorías | `CategoryBreakdown` | categories, onDrillDown |
| Heatmap | `RevenueHeatmapCalendar` | dailyKpis, from, to |
| DrillDown | `DrillDownPanel` | detail=detailData, loading, onBack, onDrillDown |

---

## 3. Bugs Encontrados

### 🔴 CRÍTICos

#### BUG-01: Top Products NO filtra por categoría seleccionada en el panel principal
**Severidad:** Crítica  
**Ubicación:** API principal (`route.ts`) → `topProducts`  
**Descripción:** La API principal retorna los top 15 productos **globales** sin importar el `categoryFilter` seleccionado en el frontend. El parámetro `category` se envía al backend, pero el endpoint principal lo usa para filtrar los KPIs agregados (revenue, cheques, etc.), no para filtrar la lista de top productos.  
**Impacto:** Cuando el usuario selecciona "Pizzas" en el filtro de categoría, los KPIs cambian pero la tabla de Top Productos sigue mostrando los productos más vendidos globalmente (ej. "Vino X", "Cerveza Y") en lugar de las 9 pizzas.  
**Corrección:** En la API principal, filtrar `topProducts` por el `categoryFilter` cuando no es `'all'`, igual que se filtran los demás datos.

#### BUG-02: Drill-down por categoría (Pizzas) no muestra los 9 productos correctamente
**Severidad:** Alta  
**Ubicación:** API detail (`detail/route.ts`) → type=category  
**Descripción:** Al hacer drill-down en categoría `05` (Pizzas), la API filtra `pos_sale_items` por ventas del período, luego filtra los items cuyo `pos_product_id` pertenezca a productos con `pos_group_id = '05'`. Esto funciona en teoría, PERO:
- Solo retorna los productos que **tuvieron ventas en el período**, no todos los productos de la categoría.
- Si se selecciona un rango de fechas corto donde solo 5 de 9 pizzas se vendieron, solo se ven 5.
**Impacto:** El usuario reporta que no se ven las pizzas con desempeño de cada producto. Los productos sin ventas en el período seleccionado simplemente no aparecen.  
**Corrección:** Para el drill-down de categoría, primero obtener TODOS los productos de la categoría, luego hacer left-join con los datos de ventas (productos sin ventas = 0 qty y revenue).

#### BUG-03: 18% de ventas con zona "Desconocido"
**Severidad:** Alta  
**Ubicación:** Base de datos `pos_sales.derived_zone_name`  
**Descripción:** 425 de 2,313 ventas (18%) tienen `derived_zone_name = 'Desconocido'`. Esto probablemente viene de la importación de SoftRestaurant donde algunas ventas no tienen zona asignada o el `derived_zone_id` no mapea a una zona válida.  
**Impacto:** 
- El gráfico de ZoneRevenueChart muestra "Desconocido" como una zona con 18% del revenue.
- Los filtros de zona incluyen "Desconocido" como opción seleccionable.
- distorsiona las métricas por zona.  
**Corrección:** 
1. Investigar por qué tantas ventas no tienen zona válida en la DB.
2. Considerar filtrar "Desconocido" del gráfico de zonas o agruparlo bajo "Sin zona asignada".
3. Añadir una nota visual en el dashboard indicando que X% de ventas no tienen zona.

#### BUG-04: `pos_sale_items.unit_price` puede no coincidir con `pos_products.price`
**Severidad:** Media-Alta  
**Ubicación:** API detail → cálculo de revenue en topProducts y categoryBreakdown  
**Descripción:** El revenue de productos se calcula como `quantity * unit_price` (del sale_item), pero `unit_price` en la tabla `pos_sale_items` es el precio al momento de la venta, no necesariamente el precio actual del producto. Si el `unit_price` en sale_items viene como NULL o 0, el revenue se calcula como 0.  
**Corrección:** Si `unit_price` es NULL o 0 en un `pos_sale_item`, usar `total_price / quantity` como fallback, o el `price` del producto como último recurso.

### 🟡 MEDIOS

#### BUG-05: KPIs no se actualizan visualmente al cambiar categoría
**Severidad:** Media  
**Ubicación:** Hook → POSDashboardPanel  
**Descripción:** Cuando se cambia el `categoryFilter` de `'all'` a una categoría específica, el hook hace re-fetch de la API con el parámetro category. Sin embargo, el campo `categoryFilter` se envía como string vacío cuando es `'all'` o como el ID de grupo cuando no lo es. La API usa este parámetro para filtrar las ventas (no solo los KPIs), lo que significa que al filtrar por "Pizzas", los KPIs de revenue/cheques/etc. reflejan SOLO las ventas de Pizzas, no el total del restaurante. Esto puede ser confuso.  
**Corrección:** Documentar claramente este comportamiento o considerar tener KPIs "globales" siempre visibles junto con los filtrados.

#### BUG-06: `item_count` en pos_sales parece tener valor incorrecto
**Severidad:** Media  
**Ubicación:** DB `pos_sales.item_count`  
**Descripción:** Una muestra de ventas mostró `item_count = 1,000` (mil?), lo cual parece un valor por defecto o de relleno, no el conteo real de items de la venta. La API no usa este campo (calcula items desde `pos_sale_items`), pero si algún componente lo usa, sería incorrecto.  
**Corrección:** No usar `item_count` de `pos_sales` en ningún cálculo; siempre calcular desde `pos_sale_items`.

#### BUG-07: Filtro de categoría permite seleccionar categorías vacías
**Severidad:** Media  
**Ubicación:** POSFiltersBar  
**Descripción:** El informe anterior menciona que se corrigió que las categorías sin productos NO se muestran en el filtro. Verificar que el filtrado se haga correctamente: solo mostrar categorías que tienen al menos 1 producto activo Y al menos 1 venta en el período seleccionado.  
**Corrección:** El API ya filtra `categories` a las que tienen ventas en el período. Verificar que el frontend use la lista que viene del API y no una lista hardcodeada.

#### BUG-08: `avgServiceTime` calculado solo con `opened_at` y `closed_at`
**Severidad:** Media  
**Ubicación:** API → `computeServiceTime` helper  
**Descripción:** El tiempo de servicio se calcula como `closed_at - opened_at` en minutos. Esto representa el tiempo total de la mesa, no necesariamente el tiempo de servicio activo. Además, muchas ventas pueden tener `closed_at` como NULL (ventas abiertas), por lo que se excluyen del cálculo.  
**Impacto:** El KPI de tiempo promedio de servicio puede ser engañoso.  
**Corrección:** Considerar usar un campo más específico si existe, o documentar que es "tiempo de estancia" no "tiempo de servicio".

#### BUG-09: Cálculo de `avgTicket` puede incluir propinas
**Severidad:** Baja-Media  
**Ubicación:** API principal → KPIs  
**Descripción:** Verificar si `total` en `pos_sales` incluye propinas. Si es así, `avgTicket = revenue / cheques` ya incluye tips, y mostrar "Ticket Promedio" y "Propinas" por separado puede resultar en doble conteo.  
**Corrección:** Si `total` incluye tips, restar `tip_amount` del total para calcular el ticket promedio real sin propinas.

#### BUG-10: Página de detalle (drill-down) no tiene título descriptivo
**Severidad:** Baja  
**Ubicación:** DrillDownPanel  
**Descripción:** Cuando se hace drill-down en una zona o categoría, el panel muestra los datos pero el título es genérico ("Detalle" o similar). Debería mostrar algo como "Pizzas — 9 productos" o "Zona Tipi — 1,327 cheques".  
**Corrección:** Usar el `label` del drill-down state para personalizar el título del panel.

### 🟢 MENORES

#### BUG-11: Formato de moneda inconsistente
**Severidad:** Baja  
**Ubicación:** Varios componentes  
**Descripción:** `formatCOPDisplay` en KPICard formatea como COP, pero algunos componentes pueden mostrar valores sin formato (ej. valores numéricos raw en tooltips de recharts).  
**Corrección:** Unificar el uso de `formatCOPDisplay` en todos los lugares donde se muestre dinero.

#### BUG-12: Heatmap no muestra todos los días del mes
**Severidad:** Baja  
**Ubicación:** RevenueHeatmapCalendar  
**Descripción:** El heatmap depende de `dailyKpis` que solo contiene días con ventas. Los días sin ventas (lunes cerrado, etc.) no aparecen en el heatmap, dejando gaps visuales.  
**Corrección:** Generar un array completo de todos los días del mes en el rango seleccionado, llenando con 0 los días sin datos.

#### BUG-13: `party_size` muchos registros son 0 o NULL
**Severidad:** Baja  
**Ubicación:** DB `pos_sales.party_size`  
**Descripción:** Muchas ventas tienen `party_size = 0` o NULL (no capturado en POS). El KPI `partySize` se calcula como promedio incluyendo ceros, subestimando el tamaño real del grupo.  
**Corrección:** Filtrar `party_size > 0` antes de calcular el promedio.

#### BUG-14: `cover_count` no se usa
**Severidad:** Informativa  
**Ubicación:** DB `pos_sales.cover_count`  
**Descripción:** Existe un campo `cover_count` en `pos_sales` que no se utiliza en ningún cálculo del dashboard. Podría ser útil como alternativa a `party_size` cuando este es 0.  
**Corrección:** Evaluar usar `cover_count` como fallback para `party_size`.

---

## 4. Datos que EXISTEN en DB pero NO se muestran

### 4.1 Tabla `pos_sales` — Datos no utilizados

| Columna | Descripción | Estado |
|---------|-------------|--------|
| `discount_amount` | Monto de descuento por venta | **Usado en KPIs** ✅ (`discountAmount`, `discountPct`) |
| `cover_count` | Número de covers/comensales | **No usado** ❌ |
| `table_number` | Número de mesa | **No usado** ❌ — se podría hacer análisis por mesa |
| `shift_id` | Turno asociado | **Usado parcialmente** — solo para shiftSummary |
| `is_cancelled` | Venta cancelada | **Usado como filtro** ✅ (se excluyen) |
| `pos_customer_id` | ID de cliente | **Usado para tiers** ✅ |
| `customer_id` (UUID) | FK a tabla de usuarios | **Siempre NULL** ❌ |
| `item_count` | Conteo de items | **No confiable** (valor 1000 por defecto) |
| `subtotal` | Subtotal antes de impuestos | **No usado** ❌ — se usa `total` (que incluye IVA) |
| `tax_amount` | Monto de IVA | **No usado** ❌ — se podría mostrar como KPI |
| `service_charge` | Cargo por servicio | **No usado** ❌ |
| `rounding_amount` | Ajuste por redondeo | **No usado** ❌ |

### 4.2 Tabla `pos_sale_items` — Datos no utilizados

| Columna | Descripción | Estado |
|---------|-------------|--------|
| `total_price` | Precio total del item (qty × unit_price) | **No se usa** ❌ — se calcula en la API como `qty × unit_price` |
| `discount_amount` | Descuento por item | **No usado** ❌ — se podría mostrar descuentos por producto |
| `is_cancelled` | Item cancelado | **No se filtra** ❌ — items cancelados se incluyen en revenue |
| `notes` | Notas del item | **No usado** ❌ |

### 4.3 Tabla `pos_products` — Datos no utilizados

| Columna | Descripción | Estado |
|---------|-------------|--------|
| `price` | Precio actual del producto | **No se usa** ❌ — se usa `unit_price` de sale_items (precio histórico) |
| `is_active` | Producto activo/inactivo | **No se filtra** ❌ — productos inactivos pueden aparecer en topProducts |

### 4.4 Tabla `pos_product_groups` — Datos no utilizados

| Columna | Descripción | Estado |
|---------|-------------|--------|
| `is_alcohol` | Flag de alcohol | **No se usa** ❌ — se podría filtrar/taggear ventas con alcohol |
| `classification` | Clasificación del grupo | **No se usa** ❌ |
| `parent_group_id` | ID del grupo padre (subgrupos) | **No se usa** — subgrupos tienen 0 productos |

### 4.5 Tabla `pos_staff` — Datos no utilizados

| Columna | Descripción | Estado |
|---------|-------------|--------|
| `is_visible` | Staff visible en UI | **No se filtra** ❌ — staff no visible puede aparecer en topStaff |
| `staff_type` | Tipo (1=mesero, 3=cajero) | **Usado parcialmente** — DayPerformanceCard distingue meseros/cajeros |

### 4.6 Tabla `pos_shifts` — Datos no utilizados

| Columna | Descripción | Estado |
|---------|-------------|--------|
| `closed_at` | Hora de cierre del turno | **Usado** ✅ |
| `pos_staff_id_close` | Staff que cerró | **Usado** ✅ |

### 4.7 Tabla `customer_stats` — Datos no utilizados

| Columna | Descripción | Estado |
|---------|-------------|--------|
| `tier` | Nivel del cliente (VIP/Oro/Plata/Bronce) | **Usado** ✅ en ClientTiersCard |
| `total_visits` | Visitas totales | **No usado directamente** ❌ |
| `total_spent` | Gasto total del cliente | **Usado** ✅ en ClientTiersCard |
| `last_visit` | Última visita | **No usado** ❌ |

### 4.8 Tabla `pos_sale_payments` — Datos parcialmente utilizados

| Columna | Descripción | Estado |
|---------|-------------|--------|
| `amount` | Monto pagado con este método | **Usado** ✅ |
| `tip_amount` | Propina por método de pago | **No se suma por separado** ❌ — podría haber propina en efectivo vs tarjeta |

## 5. Problemas de UX

### UX-01: No hay indicador de "cargando" durante drill-down
Al hacer clic en una categoría o zona para drill-down, hay un `loading` state pero el `DrillDownPanel` podría no mostrar un spinner claro mientras carga.

### UX-02: KPIs del header no indican qué están filtrando
Cuando se filtra por categoría o zona, los KPIs cambian pero no hay una etiqueta visible que diga "Mostrando: Solo Pizzas" o "Mostrando: Zona Tipi". El usuario puede pensar que los KPIs son globales.

### UX-03: Calendario Heatmap no tiene tooltip con monto
El `RevenueHeatmapCalendar` muestra colores pero el usuario no puede ver el monto exacto de cada día sin hacer clic.

### UX-04: No hay navegación breadcrumb en drill-down
Al estar en drill-down, solo hay un botón "Volver" genérico. No hay breadcrumb del tipo: Dashboard > Pizzas > Margherita.

### UX-05: Categorías sin ventas se muestran con 0
Si se muestran todas las categorías (incluso las que no tuvieron ventas en el período), aparecen con revenue/qty = 0. Esto ensucia la UI.

### UX-06: Top Staff no distingue entre meseros y cajeros
La tabla `topStaff` del API principal no filtra por tipo de staff. Si se quieren ver solo meseros, no es posible en el panel principal (sí en drill-down de día).

### UX-07: Tip amount no se desglosa por método de pago en el panel principal
Se muestra el total de propinas pero no cuánto fue en efectivo vs tarjeta.

### UX-08: Datos de clientes/tiers son globales (no filtrables)
Los `clientTiers` se calculan sobre toda la tabla `customer_stats`, no sobre los clientes que tuvieron ventas en el período seleccionado. Un cliente que visitó hace 2 años se cuenta igual que uno de ayer.

---

## 6. Mapeo Detallado: DB → API → Frontend

### 6.1 KPIs del Panel Principal

| KPI | Cómo se calcula | Fuente DB | Se muestra correctamente? |
|-----|----------------|-----------|--------------------------|
| Revenue | SUM(pos_sales.total) WHERE is_cancelled=false | pos_sales.total | ✅ Pero puede incluir propinas |
| Cheques | COUNT(pos_sales) WHERE is_cancelled=false | pos_sales | ✅ |
| Ticket Promedio | revenue / cheques | Calculado | ⚠️ Verificar si incluye propinas |
| Propinas | SUM(pos_sales.tip_amount) | pos_sales.tip_amount | ✅ |
| Party Size Avg | SUM(party_size) / cheques | pos_sales.party_size | ⚠️ Influido por party_size=0 |
| Avg Service Time | AVG(closed_at - opened_at) en minutos | pos_sales | ⚠️ Es tiempo de estancia, no servicio |
| Card % | payments type=2 amount / total payments | pos_sale_payments + pos_payment_methods | ✅ |
| Cash % | payments type=1 amount / total payments | pos_sale_payments + pos_payment_methods | ✅ |
| Cancelled Cheques | COUNT WHERE is_cancelled=true | pos_sales | ✅ |
| Cancelled Revenue | SUM(total) WHERE is_cancelled=true | pos_sales | ✅ |
| Discount Amount | SUM(discount_amount) WHERE is_cancelled=false | pos_sales.discount_amount | ✅ |
| Discount % | discountAmount / revenue × 100 | Calculado | ✅ |
| Total Customers | COUNT(DISTINCT pos_customer_id) | pos_sales | ✅ |
| New Customers | clientes con 1 sola visita en el período | pos_sales + customer_stats | ✅ |
| Returning | clientes con 2+ visitas | pos_sales + customer_stats | ✅ |

### 6.2 Top Products

| Campo | Fuente DB | Se muestra? | Notas |
|-------|-----------|-------------|-------|
| product name | pos_products.name | ✅ | |
| categoryId | pos_products.pos_group_id | ✅ | |
| categoryName | pos_product_groups.name | ✅ | |
| qty | SUM(pos_sale_items.quantity) | ✅ | |
| revenue | SUM(qty × unit_price) | ✅ | Item cancelados NO se filtran |
| avgPrice | revenue / qty | ✅ | |

**BUG:** NO se filtra por categoría seleccionada. Siempre top 15 global.

### 6.3 Category Breakdown

| Campo | Fuente DB | Se muestra? | Notas |
|-------|-----------|-------------|-------|
| id | pos_product_groups.pos_group_id | ✅ | |
| name | pos_product_groups.name | ✅ | |
| productCount | COUNT(pos_products por grupo) | ✅ | |
| revenue | SUM(items qty × price) por grupo | ✅ | |
| qty | SUM(items quantity) por grupo | ✅ | |

### 6.4 Daily KPIs (DayKPIBar + Heatmap)

| Campo | Fuente DB | Se muestra? | Notas |
|-------|-----------|-------------|-------|
| date | pos_sales.opened_at (date part) | ✅ | |
| revenue | SUM(total por día) | ✅ | |
| cheques | COUNT por día | ✅ | |
| avgTicket | revenue / cheques | ✅ | |
| propina | SUM(tip_amount por día) | ✅ | |

### 6.5 Zone Revenue (ZoneRevenueChart)

| Campo | Fuente DB | Se muestra? | Notas |
|-------|-----------|-------------|-------|
| zone | pos_sales.derived_zone_name | ✅ | Incluye "Desconocido" |
| revenue | SUM(total por zona) | ✅ | |

### 6.6 Shift Summary (ShiftReconciliation)

| Campo | Fuente DB | Se muestra? | Notas |
|-------|-----------|-------------|-------|
| shift info | pos_shifts + staff names | ✅ | |
| revenue/cheques/tips | Calculado de pos_sales | ✅ | |

### 6.7 Client Tiers (ClientTiersCard)

| Campo | Fuente DB | Se muestra? | Notas |
|-------|-----------|-------------|-------|
| tier | customer_stats.tier | ✅ | Datos globales, no del período |
| count | COUNT by tier | ✅ | |
| totalSpent | SUM(total_spent) by tier | ✅ | Lifetime, no del período |

---

## 7. Plan de Corrección Priorizado

### 🔴 Prioridad 1 — Funcionalidad Core Rota

| # | Bug/Gap | Esfuerzo | Descripción |
|---|---------|----------|-------------|
| P1-1 | BUG-01 | 2h | Top Products debe filtrar por categoría seleccionada. Modificar API principal para filtrar `topProducts` cuando `category !== 'all'`. |
| P1-2 | BUG-02 | 3h | Drill-down por categoría debe mostrar TODOS los productos, no solo los vendidos. Hacer left-join de todos los productos de la categoría con datos de ventas. Productos sin ventas = qty: 0, revenue: 0. |
| P1-3 | BUG-03 | 2h | Manejar zona "Desconocido": (a) investigar datos fuente, (b) excluir del gráfico de zonas, (c) añadir KPI "Ventas sin zona" separado, (d) no mostrar como zona navegable. |

### 🟡 Prioridad 2 — Datos Incorrectos o Engañosos

| # | Bug/Gap | Esfuerzo | Descripción |
|---|---------|----------|-------------|
| P2-1 | BUG-04 | 1h | Fallback para `unit_price` NULL/0 en pos_sale_items. Usar `total_price / quantity` o `pos_products.price`. |
| P2-2 | BUG-09 | 1h | Verificar si `total` incluye propinas. Si sí, restar `tip_amount` para calcular ticket promedio real. |
| P2-3 | BUG-13 | 0.5h | Filtrar `party_size > 0` antes de calcular promedio. |
| P2-4 | BUG-08 | 0.5h | Documentar que "tiempo de servicio" es realmente "tiempo de estancia". O calcular solo con ventas cerradas. |
| P2-5 | BUG-11 | 1h | Unificar formato de moneda en todos los componentes. Crear utilidad `formatCOP` centralizada. |
| P2-6 | BUG-06 | 0.5h | Eliminar cualquier referencia a `pos_sales.item_count`. Si se usa, reemplazar con COUNT de sale_items. |

### 🟢 Prioridad 3 — UX y Completitud

| # | Bug/Gap | Esfuerzo | Descripción |
|---|---------|----------|-------------|
| P3-1 | UX-02 | 1h | Añadir indicador visual de filtros activos en header de KPIs (ej: badge "Filtrado: Pizzas"). |
| P3-2 | UX-03 | 1h | Añadir tooltip en Heatmap mostrando fecha, revenue y # cheques al hover. |
| P3-3 | UX-04 | 0.5h | Añadir breadcrumb en DrillDownPanel. |
| P3-4 | UX-05 | 0.5h | Filtrar categorías con 0 ventas del período en CategoryBreakdown. |
| P3-5 | BUG-12 | 1h | Rellenar días sin ventas en el Heatmap con valor 0. |
| P3-6 | UX-06 | 0.5h | Añadir filtro de tipo de staff (mesero/cajero) en topStaff del panel principal. |
| P3-7 | UX-07 | 1h | Añadir desglose de propinas por método de pago. |
| P3-8 | UX-08 | 1h | Filtrar clientTiers por período seleccionado, no global. |

### 🔵 Prioridad 4 — Enriquecimiento de Datos (Nice-to-have)

| # | Gap | Esfuerzo | Descripción |
|---|-----|----------|-------------|
| P4-1 | Items cancelados | 1h | Filtrar `pos_sale_items.is_cancelled = true` de los cálculos de revenue por producto. |
| P4-2 | Productos inactivos | 0.5h | Filtrar `pos_products.is_active = false` de topProducts y category productCount. |
| P4-3 | Staff no visible | 0.5h | Filtrar `pos_staff.is_visible = false` de topStaff. |
| P4-4 | Desglose IVA | 1h | Mostrar `tax_amount` como KPI (revenue con/sin IVA). |
| P4-5 | Análisis por mesa | 2h | Usar `table_number` para análisis de mesas más activas. |
| P4-6 | Flag alcohol | 0.5h | Taggear productos con `is_alcohol` en topProducts. |
| P4-7 | Propina por método de pago | 1h | Desglosar `tip_amount` de `pos_sale_payments` por método. |
| P4-8 | `cover_count` como fallback | 0.5h | Usar `cover_count` cuando `party_size = 0`. |

---

## 8. Resumen Ejecutivo

### Estado General: **FUNCIONAL CON GAPS CRÍTICOS**

El dashboard de Operación muestra la mayoría de los datos clave, pero tiene 3 problemas críticos que afectan directamente la utilidad para el operador del restaurante:

1. **Top Products no filtra por categoría** — El usuario selecciona "Pizzas" pero sigue viendo vinos y cervezas en el top.
2. **Drill-down por categoría no muestra productos sin ventas** — Las 9 pizzas deberían aparecer siempre, con 0 en las que no se vendieron.
3. **18% de ventas sin zona** — "Desconocido" aparece como la segunda "zona" más grande, distorsionando los datos.

Además, hay **12+ datos en la DB que no se utilizan** (IVA, tiempo de servicio por producto, notas de items, etc.) que podrían enriquecer significativamente el dashboard.

**Total de bugs identificados:** 14 (3 críticos, 4 medios, 7 menores)  
**Total de gaps de datos:** 15+ campos de DB no utilizados  
**Total de problemas de UX:** 8  

**Estimación total de corrección:** ~25-30 horas de desarrollo