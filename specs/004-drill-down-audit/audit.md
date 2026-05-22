# Auditoria Drill-Down: Tab Operacion (POS Dashboard)

**Fecha**: 2026-05-22  
**Alcance**: API route, hook, 18 componentes del dashboard  
**Objetivo**: Identificar oportunidades para que al hacer click en cualquier dato agregado se pueda ver el detalle subyacente

---

## 1. ESTADO ACTUAL POR COMPONENTE

### 1.1 POSDashboardPanel.tsx (Orquestador)
- **Muestra**: Layout completo con filtros, KPIs, calendario, graficas, tablas
- **NO muestra**: Panel de detalle/expansion; al hacer click en filtro de zona/categoria solo re-filtra toda la vista (no drill-down)
- **Drill-down existente**: `handleDayClick` → cambia `from/to` al dia (unica navegacion real); `handleZoneClick`/`handleCategoryClick` → solo cambian filtro global (reemplazan toda la vista, no profundizan)
- **Gap UX**: No existe concepto de "breadcrumb de profundizacion"; no hay panel lateral ni modal de detalle

### 1.2 KPIRow / KPICard
- **Muestra**: 7 KPIs agregados (revenue, cheques, ticket promedio, propinas, personas, party promedio) — sin `productId` ni `staffId`
- **NO muestra**: Desglose temporal, por zona, por mesero, ni tendencia
- **Clickeable**: NO — ningun KPI es clickeable
- **Gap UX**: Al ver "$22.5M revenue" no hay forma de ver: de que cheques viene, en que horas, que productos contribuyen

### 1.3 DayKPIBar
- **Muestra**: KPIs con indicadores de diferencia vs promedio del periodo (solo en modo dia unico)
- **NO muestra**: Detalle de por que un dia esta arriba/abajo del promedio
- **Clickeable**: NO
- **Gap UX**: El indicador "+15% vs promedio" invita a click pero no hace nada

### 1.4 RevenueHeatmapCalendar
- **Muestra**: Calendario tipo GitHub con 4 metricas (revenue, propina, cheques, personas); tooltips con datos del dia
- **Clickeable**: SI → `onDayClick` cambia filtro a ese dia (profundiza)
- **YA ES DRILL-DOWN**: El unico componente con drill-down funcional (nivel 1)
- **Gap UX**: No indica el "camino" — si ya filtre por zona, al hacer click en un dia no se ve "Tipi / 15 Abr"

### 1.5 DayPerformanceCard
- **Muestra**: KPIs del dia, por zona, top 5 productos, top 5 meseros, mini-chart hora a hora
- **Clickeable**: NO — ninguna fila de producto, zona, ni mesero es clickeable
- **Gap UX**: "Top productos: 1. Pizza Margherita" — al hacer click deberia mostrar: en que zonas se vendio, a que horas, que cheques

### 1.6 ZoneRevenueChart
- **Muestra**: Barras horizontales por zona con revenue, cheques, ticket promedio, % del total
- **Clickeable**: SI → `onZoneClick` cambia filtro global de zona (NO es drill-down, es re-filtro)
- **Gap UX**: Al seleccionar "Tipi" se re-filtra toda la pagina; no veo "Tipi en depth" (productos, horas tipicas, meseros, clientes). Tampoco muestra `propinaTotal` aunque el dato esta en el API.

### 1.7 HourlyRevenueChart
- **Muestra**: BarChart recharts con hora vs revenue, tooltips con cheques
- **Clickeable**: NO — ninguna barra es clickeable
- **Gap UX**: "A las 8pm hay $2.1M" — al hacer click deberia ver: que productos se vendieron a esa hora, que meseros atendieron, que zonas

### 1.8 TopProductsTable
- **Muestra**: Tabla top 8 productos (top 15 en API, solo 8 en UI): nombre, categoria, qty, revenue
- **Clickeable**: NO — hover cambia fondo pero no navega
- **Gap UX**: El producto mas vendido se ve pero no se puede desglosar por: zona, hora, dia, mesero, quien lo pidio

### 1.9 CategoryBreakdown
- **Muestra**: Top 15 categorias con barras horizontales: nombre, revenue, uds, cheques
- **Clickeable**: SI → `onCategoryClick` cambia filtro global de categoria (NO es drill-down, es re-filtro)
- **Gap UX**: Al click en "Pizzas" re-filtra toda la pagina; no muestra "dentro de Pizzas: cual producto, en que zona, a que hora". Pierdes contexto del resto.

### 1.10 TopProductByCategoryChart
- **Muestra**: Producto estrella por categoria (horizontal bars): categoria + producto #1 + qty + revenue
- **Clickeable**: NO
- **Gap UX**: "Pizzas → Margherita" — al querer profundizar en la categoria o en el producto no se puede. No muestra top 2-5 por categoria.

### 1.11 StaffPerformanceTable
- **Muestra**: Tabla: nombre, cheques, revenue, ticket promedio, propinas
- **Clickeable**: NO — hover cambia fondo pero no navega
- **Gap UX**: "Juan $3.2M" — al click deberia ver: que zonas atiende, que productos vende mas, en que turnos, como evolucionan sus propinas

### 1.12 PaymentMethodsChart
- **Muestra**: PieChart con metodo, monto, %, count. Legendas al costado
- **Clickeable**: NO
- **Gap UX**: "Efectivo 65%" — al click deberia ver: cheques que pagaron en efectivo, zonas, horarios, ticket promedio por metodo

### 1.13 ClientTiersCard
- **Muestra**: Badges de tiers (VIP, Oro, Plata, Bronce): count, %, totalSpent
- **Clickeable**: NO
- **Gap UX**: "VIP: 12 clientes" — al click deberia ver: quienes son, que compran, cuando vienen, cuanto gastan en promedio

### 1.14 ClientSplitCard
- **Muestra**: 2 bloques: Consumidor Final vs Identificados: %, cheques, revenue
- **Clickeable**: NO
- **Gap UX**: "Identificados: 35%" — al click deberia ver: lista de clientes identificados, su frecuencia, su gasto

### 1.15 POSFiltersBar
- **Muestra**: Selectores de zona y categoria + boton limpiar
- **Gap UX**: Solo 4 zonas (Tipi, Attic, Chispas, all) — faltan Llevar, Interno, Keller que existen en la data. No hay filtro por mesero, por horario, ni por metodo de pago.

### 1.16 POSDailyTrendChart
- **Muestra**: BarChart con revenue + propina por dia. Tooltip "Click para ver dia"
- **Clickeable**: SI → `onDayClick` (pero NO se usa en POSDashboardPanel — no se renderiza este componente!)
- **BUG**: `POSDailyTrendChart` se importa pero **NO se renderiza** en `POSDashboardPanel.tsx`. El calendario remplazo este chart pero sigue importado.

### 1.17 DataUploadSection
- **Muestra**: Upload JSON
- **Irrelevante** para drill-down

---

## 2. DATOS QUE EL API YA TIENE PERO LOS COMPONENTES NO MUESTRAN

| Dato disponible en API | Componente que deberia mostrarlo | Se muestra? |
|---|---|---|
| `byZone[].propinaTotal` | ZoneRevenueChart | NO — solo muestra cheques y ticketPromedio |
| `topProducts` completo (15 items) | TopProductsTable | PARCIAL — muestra solo 8 |
| `topCategories[].cheques` | CategoryBreakdown | SI (aparece en sub-texto) |
| `topProductByCategory` (top 1 por cat) | TopProductByCategoryChart | SI pero solo #1 |
| `clientTiers[].totalSpent` | ClientTiersCard | SI |
| `clientSplit` | ClientSplitCard | SI |
| `dailyTrend[].propina` | POSDailyTrendChart (NO renderizado) | NO |
| `pos_staff` — mas columns (role, etc.) | StaffPerformanceTable | NO |
| `card_paid`, `cash_paid` en pos_sales | No se usa en ningun componente | NO |
| `pos_customer_id` / `customer_id` | Solo en clientSplit binario | PARCIAL — no desglosa por cliente |
| `closed_at` (tiempo de servicio) | Ninguno | NO |
| `item_count` por cheque | Ninguno | NO |
| `subtotal`, `tax_amount` | Ninguno | NO |
| `party_size` individual por cheque | KPI global solo | NO desglosado |
| `pos_areas` (10 areas) | Filtro zones usa `derived_zone_name` | NO se usa pos_areas |

---

## 3. DATOS QUE FALTAN EN EL API PARA DRILL-DOWN

| Drill-down deseado | Datos necesarios | Tabla(s) fuente | Query que falta |
|---|---|---|---|
| Productos dentro de una categoria (top N) | Todos los productos con su qty/revenue filtrados por pos_group_id | pos_sale_items + pos_products | JOIN items→products WHERE group_id=X |
| Detalle de un producto: por zona | Revenue/qty de un producto por zona | pos_sale_items + pos_sales (via pos_sale_id) | JOIN items→sales→zone WHERE product_id=X |
| Detalle de un producto: por hora | Revenue/qty de un producto por hora del dia | pos_sale_items + pos_sales | JOIN items→sales→extract(hour) WHERE product_id=X |
| Detalle de un mesero: por zona | Revenue del mesero desglosado por zona | pos_sales | GROUP BY staff_id, zone |
| Detalle de un mesero: por hora | Revenue del mesero desglosado por hora | pos_sales | GROUP BY staff_id, extract(hour) |
| Detalle de un mesero: productos que vende | Top productos vendidos por ese mesero | pos_sales + pos_sale_items + pos_products | JOIN chain WHERE staff_id=X |
| Detalle de una hora: productos top | Productos vendidos en esa hora | pos_sale_items + pos_sales | JOIN WHERE extract(hour)=X |
| Detalle de una hora: meseros activos | Meseros que atendieron en esa hora | pos_sales | GROUP BY staff_id WHERE extract(hour)=X |
| Clientes identificados: lista | nombre, visitas, gasto total | customers + customer_stats + visit_history | JOIN chain |
| Detalle de tier: lista de clientes | Clientes en ese tier con su gasto | customer_stats WHERE tier=X | JOIN customers |
| Metodo de pago: cheques que lo usaron | Lista de cheques con ese metodo | pos_sale_payments + pos_sales + pos_payment_methods | JOIN chain |
| Cruce zona×hora (heatmap) | Revenue por zona y hora combinados | pos_sales | GROUP BY zone, extract(hour) |
| Turnos (pos_shifts) | Que turnos generan mas revenue | pos_shifts + pos_sales | JOIN sales→shifts |
| Tiempo de servicio (duracion) | closed_at - opened_at por cheque | pos_sales | EXTRACT(epoch from closed_at - opened_at) |
| Frecuencia de retorno de clientes | Dias entre visitas | visit_history + customers | Window functions |

---

## 4. GAPS DE UX: COMPONENTES QUE DEBERIAN SER CLICKEABLES PERO NO LO SON

| Componente | Elemento | Que deberia pasar al click | Prioridad |
|---|---|---|---|
| KPICard | Cualquier KPI | Expandir: ver composicion (ej: revenue por zona, por hora) | ALTA |
| DayKPIBar | Indicador " +15%" | Ver que causo la diferencia (productos, zonas, horarios) | MEDIA |
| ZoneRevenueChart | Barra de zona | Modo drill-down: ver productos/horas/meseros en esa zona SIN cambiar toda la vista | ALTA |
| HourlyRevenueChart | Barra de hora | Ver productos top y meseros activos en esa hora | ALTA |
| TopProductsTable | Fila de producto | Ver: zonas, horas, dias donde se vende ese producto | ALTA |
| CategoryBreakdown | Barra de categoria | Ver top productos dentro de esa categoria (no re-filtrar) | ALTA |
| TopProductByCategoryChart | Producto estrella | Ver top 5 productos de esa categoria, no solo #1 | MEDIA |
| StaffPerformanceTable | Fila de mesero | Ver: zonas, horas, productos, evolucion temporal | ALTA |
| PaymentMethodsChart | Slice de pie | Ver cheques, tickets, zonas con ese metodo | MEDIA |
| ClientTiersCard | Badge de tier | Ver lista de clientes en ese tier | MEDIA |
| ClientSplitCard | Bloque "Identificados" | Ver lista de clientes identificados con gasto | MEDIA |
| DayPerformanceCard | Zona/Producto/Mesero del dia | Cada uno deberia poder profundizar | ALTA |

---

## 5. GAPS ESTRUCTURALES DE LA ARQUITECTURA ACTUAL

### 5.1 Un solo endpoint monolitico
El API (`/api/admin/pos-dashboard/route.ts`) hace TODO en un solo GET: devuelve 12 secciones de datos en una sola response. No hay endpoints granulares.
- **Problema**: No se puede pedir "detalle top products de la categoria X" sin re-calcular todo
- **Solucion**: Endpoints secundarios tipo `/api/admin/pos-dashboard/detail?type=product&id=XXX`

### 5.2 El filtro de zona/categoria reemplaza toda la vista
`handleZoneClick` y `handleCategoryClick` cambian los filtros globales, haciendo un re-fetch completo y re-renderizando todo. No es drill-down — es "filter-down" que pierdes el contexto del total.
- **Problema**: Al filtrar por "Pizzas" perdes la comparacion con el total y con otras categorias
- **Solucion**: Panel de detalle lateral/seccion expandible que NO re-filtra

### 5.3 No existe componente de panel de detalle
No hay `ProductDetailPanel`, `StaffDetailPanel`, `CategoryDetailPanel`, etc. Todo es resumen.
- **Solucion**: Crear un componente `DrillDownPanel` generico que reciba `type` + `id` + `filters`

### 5.4 POSDailyTrendChart importado pero NO renderizado
Bug: se importa en POSDashboardPanel pero no se usa en el JSX. Fue reemplazado por el calendario.

### 5.5 Zonas hardcodeadas en POSFiltersBar
Solo 4 zonas (Tipi, Attic, Chispas, all). Pero `pos_areas` tiene 10 y `derived_zone_name` puede tener Llevar, Interno, Keller.

### 5.6 Datos de pagos individual (`card_paid`, `cash_paid`) no se usan
El API los trae de pos_sales pero no se calculan ni muestran.

---

## 6. OPORTUNIDADES PRIORIZADAS

### 🔴 ALTO IMPACTO

#### O1: Panel de Detalle de Producto
- **Donde**: Click en fila de TopProductsTable, TopProductByCategoryChart, DayPerformanceCard
- **Que muestra**: Revenue por zona, por hora, por dia; cheques donde aparece; productos acompañantes (bundle analysis)
- **Datos necesarios**: Nuevo endpoint o parametro `?detail=product&productId=X`
- **SQL**:
```sql
-- Revenue de un producto por zona
SELECT s.derived_zone_name, 
       SUM(si.quantity) as qty, 
       SUM(si.quantity * si.unit_price) as revenue,
       COUNT(DISTINCT si.pos_sale_id) as cheques
FROM pos_sale_items si
JOIN pos_sales s ON s.id = si.pos_sale_id
WHERE si.pos_product_id = :productId
  AND s.opened_at >= :from AND s.opened_at <= :to
  AND s.is_cancelled = false
GROUP BY s.derived_zone_name
ORDER BY revenue DESC;

-- Revenue de un producto por hora
SELECT EXTRACT(HOUR FROM s.opened_at)::int as hour,
       SUM(si.quantity) as qty,
       SUM(si.quantity * si.unit_price) as revenue
FROM pos_sale_items si
JOIN pos_sales s ON s.id = si.pos_sale_id
WHERE si.pos_product_id = :productId
  AND s.opened_at >= :from AND s.opened_at <= :to
  AND s.is_cancelled = false
GROUP BY hour ORDER BY hour;

-- Productos acompañantes (en mismos cheques)
SELECT p2.name as acompanante, 
       SUM(si2.quantity) as qty,
       SUM(si2.quantity * si2.unit_price) as revenue
FROM pos_sale_items si1
JOIN pos_sale_items si2 ON si1.pos_sale_id = si2.pos_sale_id AND si2.pos_product_id != :productId
JOIN pos_products p2 ON p2.pos_product_id = si2.pos_product_id
WHERE si1.pos_product_id = :productId
  AND si1.pos_sale_id IN (SELECT pos_sale_id FROM pos_sale_items WHERE pos_product_id = :productId)
GROUP BY p2.name
ORDER BY qty DESC LIMIT 10;
```

#### O2: Panel de Detalle de Mesero
- **Donde**: Click en fila de StaffPerformanceTable, DayPerformanceCard
- **Que muestra**: Revenue/cheques por zona, por hora, por dia; productos que vende mas; propinas; evolucion temporal
- **Datos necesarios**: Nuevo endpoint `?detail=staff&staffId=X`
- **SQL**:
```sql
-- Mesero por zona
SELECT s.derived_zone_name,
       COUNT(*) as cheques,
       SUM(s.total) as revenue,
       SUM(s.tip_amount) as propina
FROM pos_sales s
WHERE s.pos_staff_id = :staffId
  AND s.opened_at >= :from AND s.opened_at <= :to
  AND s.is_cancelled = false
GROUP BY s.derived_zone_name;

-- Mesero por hora
SELECT EXTRACT(HOUR FROM s.opened_at)::int as hour,
       COUNT(*) as cheques,
       SUM(s.total) as revenue
FROM pos_sales s
WHERE s.pos_staff_id = :staffId
  AND s.is_cancelled = false
GROUP BY hour ORDER BY hour;

-- Productos top del mesero
SELECT p.name as product, 
       SUM(si.quantity) as qty,
       SUM(si.quantity * si.unit_price) as revenue
FROM pos_sales s
JOIN pos_sale_items si ON si.pos_sale_id = s.id
JOIN pos_products p ON p.pos_product_id = si.pos_product_id
WHERE s.pos_staff_id = :staffId
  AND s.opened_at >= :from AND s.opened_at <= :to
  AND s.is_cancelled = false
GROUP BY p.name
ORDER BY revenue DESC LIMIT 15;

-- Evolucion diaria del mesero
SELECT DATE(s.opened_at) as date,
       COUNT(*) as cheques,
       SUM(s.total) as revenue,
       SUM(s.tip_amount) as propina
FROM pos_sales s
WHERE s.pos_staff_id = :staffId
  AND s.is_cancelled = false
GROUP BY date ORDER BY date;
```

#### O3: Panel de Detalle de Categoria
- **Donde**: Click en CategoryBreakdown (SIN re-filtrar toda la vista)
- **Que muestra**: Top 15 productos dentro de la categoria; revenue por zona y hora para esa categoria; comparacion interna
- **Datos necesarios**: Nuevo endpoint `?detail=category&categoryId=X`
- **SQL**:
```sql
-- Top productos en una categoria
SELECT p.pos_product_id, p.name,
       SUM(si.quantity) as qty,
       SUM(si.quantity * si.unit_price) as revenue,
       COUNT(DISTINCT si.pos_sale_id) as cheques
FROM pos_sale_items si
JOIN pos_products p ON p.pos_product_id = si.pos_product_id
JOIN pos_sales s ON s.id = si.pos_sale_id
WHERE p.pos_group_id = :categoryId
  AND s.opened_at >= :from AND s.opened_at <= :to
  AND s.is_cancelled = false
GROUP BY p.pos_product_id, p.name
ORDER BY revenue DESC LIMIT 15;

-- Categoria por zona
SELECT s.derived_zone_name,
       SUM(si.quantity * si.unit_price) as revenue,
       COUNT(DISTINCT s.id) as cheques
FROM pos_sale_items si
JOIN pos_products p ON p.pos_product_id = si.pos_product_id
JOIN pos_sales s ON s.id = si.pos_sale_id
WHERE p.pos_group_id = :categoryId
  AND s.is_cancelled = false
GROUP BY s.derived_zone_name;

-- Categoria por hora
SELECT EXTRACT(HOUR FROM s.opened_at)::int as hour,
       SUM(si.quantity * si.unit_price) as revenue,
       COUNT(DISTINCT s.id) as cheques
FROM pos_sale_items si
JOIN pos_products p ON p.pos_product_id = si.pos_product_id
JOIN pos_sales s ON s.id = si.pos_sale_id
WHERE p.pos_group_id = :categoryId
  AND s.is_cancelled = false
GROUP BY hour ORDER BY hour;
```

#### O4: Click en hora del HourlyRevenueChart
- **Donde**: Click en barra de hora (12p, 1p, etc.)
- **Que muestra**: Top productos vendidos en esa hora; meseros activos; cheques por zona en esa hora
- **SQL**:
```sql
-- Productos top en una hora
SELECT p.name, SUM(si.quantity) as qty, SUM(si.quantity * si.unit_price) as revenue
FROM pos_sale_items si
JOIN pos_products p ON p.pos_product_id = si.pos_product_id
JOIN pos_sales s ON s.id = si.pos_sale_id
WHERE EXTRACT(HOUR FROM s.opened_at) = :hour
  AND s.opened_at >= :from AND s.opened_at <= :to
  AND s.is_cancelled = false
GROUP BY p.name
ORDER BY revenue DESC LIMIT 10;

-- Meseros activos en una hora
SELECT st.name, COUNT(*) as cheques, SUM(s.total) as revenue
FROM pos_sales s
JOIN pos_staff st ON st.pos_staff_id = s.pos_staff_id
WHERE EXTRACT(HOUR FROM s.opened_at) = :hour
  AND s.is_cancelled = false
GROUP BY st.name
ORDER BY revenue DESC;

-- Zonas en una hora
SELECT s.derived_zone_name, COUNT(*) as cheques, SUM(s.total) as revenue
FROM pos_sales s
WHERE EXTRACT(HOUR FROM s.opened_at) = :hour
  AND s.is_cancelled = false
GROUP BY s.derived_zone_name;
```

---

### 🟡 MEDIO IMPACTO

#### O5: Heatmap Zona × Hora
- **Que muestra**: Grid tipo heatmap: filas=zonas, columnas=horas, celdas=revenue intensity
- **Donde**: Nueva seccion debajo de ZoneRevenueChart + HourlyRevenueChart
- **SQL**:
```sql
SELECT s.derived_zone_name as zone,
       EXTRACT(HOUR FROM s.opened_at)::int as hour,
       SUM(s.total) as revenue,
       COUNT(*) as cheques
FROM pos_sales s
WHERE s.opened_at >= :from AND s.opened_at <= :to
  AND s.is_cancelled = false
GROUP BY zone, hour
ORDER BY zone, hour;
```

#### O6: Detalle de Metodo de Pago
- **Donde**: Click en slice de PaymentMethodsChart
- **Que muestra**: Ticket promedio por metodo; ticket promedio por zona por metodo; cheques recientes con ese metodo
- **SQL**:
```sql
-- Ticket promedio por metodo de pago
SELECT pm.name as method,
       COUNT(*) as count,
       SUM(sp.amount) as total,
       AVG(sp.amount) as ticket_promedio
FROM pos_sale_payments sp
JOIN pos_payment_methods pm ON pm.pos_payment_method_id = sp.pos_payment_method_id
WHERE sp.pos_sale_id IN (:saleIds)
GROUP BY pm.name;

-- Metodo por zona
SELECT pm.name as method,
       s.derived_zone_name as zone,
       SUM(sp.amount) as total,
       COUNT(*) as count
FROM pos_sale_payments sp
JOIN pos_payment_methods pm ON pm.pos_payment_method_id = sp.pos_payment_method_id
JOIN pos_sales s ON s.id = sp.pos_sale_id
WHERE s.opened_at >= :from AND s.opened_at <= :to
  AND s.is_cancelled = false
GROUP BY pm.name, s.derived_zone_name;
```

#### O7: Detalle de Tier de Clientes
- **Donde**: Click en badge de ClientTiersCard
- **Que muestra**: Lista de clientes en ese tier con: nombre, visitas, gasto total, ultima visita, producto favorito
- **SQL**:
```sql
SELECT c.name, c.phone, cs.total_spent, cs.visit_count, cs.last_visit,
       cs.loyalty_tier
FROM customer_stats cs
JOIN customers c ON c.id = cs.customer_id
WHERE cs.loyalty_tier = :tier
ORDER BY cs.total_spent DESC
LIMIT 50;
```

#### O8: Indicadores de tendencia en KPIs
- **Donde**: Click en KPICard / DayKPIBar diff indicators
- **Que muestra**: Desglose de que contribuyo al cambio (vs ayer, vs promedio): que zonas subieron/bajaron, que categorias cambiaron
- **SQL**: Varias queries comparativas con periodo anterior

---

### 🟢 BAJO IMPACTO (pero facil de implementar)

#### O9: Mostrar propinaTotal en ZoneRevenueChart
- **Problema**: El dato ya esta en el API (`byZone[].propinaTotal`) pero ZoneRevenueChart no lo muestra
- **Fix**: Agregar `propinaTotal` en sub-texto del componente

#### O10: Corregir filtro de zonas
- **Problema**: POSFiltersBar hardcodea 4 zonas pero hay 10 en pos_areas
- **Fix**: Cargar zonas dinamicamente desde el API (ya existen en byZone)

#### O11: TopProductsTable: mostrar 15 en vez de 8
- **Problema**: El API manda 15 pero `.slice(0, 8)` corta a 8
- **Fix**: Cambiar o hacer expandible (ver 8, click para ver 15)

#### O12: Eliminar import muerto de POSDailyTrendChart
- **Problema**: Se importa pero no se usa en JSX
- **Fix**: Remover import o reintegrar el componente como alternativa al calendario

#### O13: Mostrar card_paid / cash_paid
- **Problema**: El API trae estos campos de pos_sales pero no se calculan ni muestran
- **Fix**: Agregar KPIs de pago en efectivo vs tarjeta en la vista

---

## 7. WIREFRAMES TEXTUALES DE NAVEGACION DRILL-DOWN PROPUESTA

### Navegacion principal: Breadcrumb + Panel expandible

```
[Operacion POS] > Zona: Tipi > Producto: Pizza Margherita
```

El patron propuesto es: al hacer click en un elemento, se expande un panel debajo del componente (no re-filtrar toda la vista). Un breadcrumb en la cabecera muestra la profundidad actual.

### Flujo 1: Click en categoria "Pizzas"

```
ANTES (estado actual):
  ┌─────────────────────────────────┐
  │ Categorias de Producto          │
  │ ▓▓▓▓▓▓▓▓▓▓ Pizzas  $8.5M    │
  │ ▓▓▓▓▓▓ Bebidas     $3.2M    │
  │ ▓▓▓▓ Entradas      $2.1M    │
  └─────────────────────────────────┘
  → Click en "Pizzas" re-filtra toda la pagina

DESPUES (propuesto):
  ┌─────────────────────────────────┐
  │ Categorias de Producto          │
  │ ▓▓▓▓▓▓▓▓▓▓ Pizzas  $8.5M  ▼  │  ← indicador expandible
  │ ▓▓▓▓▓▓ Bebidas     $3.2M    │
  │ ▓▓▓▓ Entradas      $2.1M    │
  ├─────────────────────────────────┤
  │ 📂 Pizzas — Top Productos      │  ← EXPANDIDO
  │ 1. Margherita    120u  $2.1M  │
  │ 2. Pepperoni      95u  $1.8M  │
  │ 3. Cuatro Quesos  80u  $1.5M  │
  │                                 │
  │ 📍 Por Zona (Pizzas)           │
  │ ▓▓▓▓ Tipi     $3.2M  38%     │
  │ ▓▓▓  Attic    $2.8M  33%     │
  │ ▓▓   Chispas  $2.1M  25%     │
  │                                 │
  │ ⏰ Por Hora (Pizzas)            │
  │ ▓▓▓▓ 7p  ▓▓▓ 8p  ▓▓ 6p  ▓ 9p│
  └─────────────────────────────────┘
```

### Flujo 2: Click en producto "Margherita"

```
  ┌──────────────────────────────────────────┐
  │ 🍕 Pizza Margherita                      │
  │ $2.1M · 120 uds · 89 cheques            │
  ├──────────────────────────────────────────┤
  │ Tab: [Zona] [Hora] [Dias] [Acompañantes] │
  │                                          │
  │ [Tab: Zona activo]                        │
  │ ▓▓▓▓▓▓▓▓ Tipi     $980K  42 cheques    │
  │ ▓▓▓▓▓▓   Attic    $720K  31 cheques    │
  │ ▓▓▓▓     Chispas  $400K  16 cheques    │
  │                                          │
  │ [Tab: Hora]                              │
  │ ▓▓▓▓▓▓ 7pm  ▓▓▓▓ 6pm  ▓▓ 8pm  ▓ 9pm  │
  │                                          │
  │ [Tab: Dias]                              │
  │ ▓▓▓▓▓ Sab  ▓▓▓ Vie  ▓▓ Jue  ▓ Mie    │
  │                                          │
  │ [Tab: Acompañantes]                      │
  │ 🍺 Cerveza Artesanal   45 veces        │
  │ 🥗 Ensalada César      32 veces        │
  │ 🍝 Pasta Carbonara     28 veces        │
  └──────────────────────────────────────────┘
```

### Flujo 3: Click en mesero "Juan Perez"

```
  ┌──────────────────────────────────────────┐
  │ 👤 Juan Perez                            │
  │ $3.2M · 156 cheques · $420K propinas   │
  ├──────────────────────────────────────────┤
  │ Tab: [Zona] [Hora] [Productos] [Tendencia]│
  │                                          │
  │ [Tab: Zona activo]                        │
  │ ▓▓▓▓▓▓▓▓ Tipi     $1.8M  85 cheques   │
  │ ▓▓▓▓▓    Attic    $1.0M  48 cheques   │
  │ ▓▓       Chispas  $400K  23 cheques   │
  │                                          │
  │ [Tab: Productos]                          │
  │ 1. Pizza Margherita  45 uds  $78K      │
  │ 2. Cerveza Artesanal  120 uds  $42K   │
  │ 3. Ensalada César     38 uds  $35K    │
  │                                          │
  │ [Tab: Tendencia diaria]                   │
  │ ▓▓▓▓▓▓▓▓ (mini bar chart por dia)       │
  └──────────────────────────────────────────┘
```

### Flujo 4: Click en hora (7pm) del HourlyRevenueChart

```
  ┌──────────────────────────────────────────┐
  │ ⏰ 7:00 PM                               │
  │ $4.2M · 89 cheques                       │
  ├──────────────────────────────────────────┤
  │ Tab: [Productos] [Meseros] [Zonas]        │
  │                                          │
  │ [Tab: Productos activo]                   │
  │ 1. Pizza Margherita   32 uds  $56K     │
  │ 2. Cerveza Artesanal   48 uds  $18K    │
  │ 3. Ensalada César      22 uds  $20K    │
  │                                          │
  │ [Tab: Meseros]                            │
  │ Juan Perez   18 cheques  $780K          │
  │ Maria Lopez  15 cheques  $620K          │
  │                                          │
  │ [Tab: Zonas]                              │
  │ Tipi     35 cheques  $1.6M             │
  │ Attic    28 cheques  $1.3M             │
  │ Chispas  26 cheques  $1.3M             │
  └──────────────────────────────────────────┘
```

### Flujo 5: Breadcrumb de profundizacion

```
  ┌──────────────────────────────────────────────┐
  │ Operacion POS  >  Pizzas  >  Margherita      │
  │ [x cerrar detalle]                           │
  └──────────────────────────────────────────────┘
```

Cada nivel del breadcrumb es clickeable para volver atras. El boton [x] cierra el panel de detalle y regresa a la vista resumen.

---

## 8. ARQUITECTURA PROPUESTA PARA DRILL-DOWN

### 8.1 Nuevo endpoint: `/api/admin/pos-dashboard/detail`

Parametros:
- `type`: `product` | `staff` | `category` | `hour` | `zone` | `tier` | `payment`
- `id`: el ID del elemento (pos_product_id, pos_staff_id, pos_group_id, hour number, zone name, etc.)
- `from`, `to`: rango de fechas (heredado del filtro actual)

Respuesta: JSON con las secciones relevantes segun el tipo:
- Para `product`: byZone, byHour, byDay, companions
- Para `staff`: byZone, byHour, topProducts, dailyTrend
- Para `category`: topProducts, byZone, byHour
- Para `hour`: topProducts, topStaff, byZone
- Para `zone`: topProducts, byHour, topStaff, dailyTrend
- Para `tier`: clientList
- Para `payment`: byZone, avgTicket, recentCheques

### 8.2 Estado de drill-down

Agregar al hook `usePOSDashboard`:
```typescript
interface DrillDownState {
  type: 'product' | 'staff' | 'category' | 'hour' | 'zone' | 'tier' | 'payment' | null
  id: string | null
  data: any | null
  loading: boolean
}

const [drillDown, setDrillDown] = useState<DrillDownState>({ type: null, id: null, data: null, loading: false })
```

### 8.3 Componente generico: `DrillDownPanel`
Recibe `drillDown` state y renderiza el panel de detalle apropiado segun `type`. Se inserta debajo del componente que disparo el drill-down.

---

## 9. RESUMEN EJECUTIVO

**Componentes auditados**: 18  
**Clickeables hoy**: 4 (ZoneRevenueChart, CategoryBreakdown, RevenueHeatmapCalendar, POSFiltersBar)  
**Con drill-down real**: 1 (RevenueHeatmapCalendar → dia)  
**Los otros 3 solo re-filtran**: Cambian filtros globales (no profundizan)  

**Gaps de datos encontrados**: 14 datos del API no mostrados + 13 queries faltantes  
**Gaps de UX encontrados**: 12 componentes deberian ser clickeables  
**Oportunidades**: 4 de alto impacto, 4 de medio, 5 de bajo esfuerzo  

**Prioridad #1**: Panel de detalle de producto, mesero y categoria (O1, O2, O3)  
**Prioridad #2**: Click en hora del chart (O4) y heatmap zona×hora (O5)  
**Quick wins**: Mostrar propina en zonas, corregir filtro de zonas, expandir top products de 8 a 15 (O9-O11)  

**Inversion estimada**: 
- Quick wins (O9-O13): 1-2 horas
- Panel de detalle (O1-O3): 2-3 dias (nuevo endpoint + componente generico + 3 variantes)
- Drill-down de hora y heatmap (O4-O5): 1 dia
- Detalle de pagos y tiers (O6-O7): 1 dia