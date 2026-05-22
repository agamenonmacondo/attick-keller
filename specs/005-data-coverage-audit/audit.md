# Auditoria de Cobertura de Datos: DB vs Tab Operacion

**Fecha**: 2026-05-22  
**Periodo analizado**: Abril 2026  
**Fuente DB**: Supabase `pbllaipsdfypelnwrvpy`  
**Scope**: Tab Operacion POS (POSDashboardPanel + DrillDownPanel)

---

## PARTE 1: Datos que EXISTEN en la DB

### 1.1 Resumen de tablas y volumenes

| Tabla | Registros (Abril) | Columnas clave |
|-------|-------------------|----------------|
| pos_sales | 2,197 (2,195 activas + 2 canceladas) | id, total, tip_amount, opened_at, closed_at, party_size, derived_zone_name, pos_staff_id, customer_id, card_paid, cash_paid, is_cancelled |
| pos_sale_items | 16,192 | pos_sale_id, pos_product_id, quantity, unit_price |
| pos_products | ~800 | pos_product_id, name, pos_group_id, use_dining, use_delivery, use_quick, visible_menu, visible_kiosk |
| pos_product_groups | 54 (30 principales + 24 subgrupos SG_) | pos_group_id, name |
| pos_sale_payments | 2,259 | pos_sale_id, pos_payment_method_id, amount |
| pos_payment_methods | 32 | pos_payment_method_id, name |
| pos_staff | 44 | pos_staff_id, name, staff_type, is_visible |
| pos_areas | 10 | pos_area_id, name, service_type, is_active |
| pos_shifts | 69 (Abril) | pos_shift_id, opened_at, closed_at, station, cashier, cash_total, card_total, credit_total, is_closed |

### 1.2 Metricas por categoria (54 pos_product_groups) — Abril 2026

Solo las categorias con ventas activas en Abril (22 de 54 tienen datos). Las 32 restantes (incluyendo todos los subgrupos SG_*) tienen 0 ventas.

#### Categorias con ventas (ordenadas por revenue)

| # | Group ID | Nombre | Productos DB | Items vendidos | Revenue (COP) | Cheques | Ticket Prom | Propina/cheque | Party Size | Tiempo Servicio (min) | Cancel Ratio | Metodo pago #1 | Top 3 Productos |
|---|----------|--------|-------------|----------------|---------------|---------|-------------|----------------|------------|----------------------|-------------|----------------|----------------|
| 1 | 10 | AT COCTELES | 73 | 2,357 | $122,703,000 | 747 | $164,261 | $39,167 | 2.0 | 118 | 0% | TARJETA(719) | MOSCOW MULE / MEZCALITA / NEGRONI |
| 2 | 05 | PIZZAS | 9 | 1,815 | $87,112,000 | 976 | $89,254 | $36,915 | 2.3 | 127 | 0.6% | TARJETA(905) | PIZZA JAMON SERRANO / HAWAIANA / PEPPERONI |
| 3 | 09 | VINOS | 113 | 728 | $64,028,000 | 398 | $160,874 | $50,012 | 2.3 | 134 | 0% | TARJETA(385) | SANGRIA TINTA / SANGRIA ROSADA / SANGRIA BLANCA |
| 4 | 02 | FUERTES | 22 | 1,020 | $59,123,000 | 518 | $114,137 | $37,804 | 2.3 | 111 | 0% | TARJETA(481) | LOMO / RIBEYE / ORZO DE SETAS |
| 5 | 16 | T BEBIDAS FRIAS | 43 | 4,989 | $53,189,000 | 1,418 | $37,510 | $33,206 | 2.1 | 115 | 0.2% | TARJETA(1,287) | AGUA / SODA / AGUA CON GAS |
| 6 | 14 | LICORES BOTELLA | 140 | 130 | $45,222,000 | 94 | $481,085 | $106,240 | 2.9 | 154 | 0% | TARJETA(92) | ANTIOQUEÑO SIN AZUCAR / ABSOLUT / DON JULIO 70 |
| 7 | 18 | CERVEZAS | 15 | 2,500 | $43,470,500 | 714 | $60,883 | $37,484 | 2.1 | 110 | 0.7% | TARJETA(652) | STELLA / CLUB COLOMBIA / CER MONSERRATE |
| 8 | 15 | LICORES TRAGOS | 140 | 754 | $38,098,000 | 306 | $124,503 | $44,802 | 1.9 | 102 | 0% | TARJETA(291) | HENDRICKS TR / BOMBAY SAPPHIRE TR / TANQUERAY TR |
| 9 | 04 | ANTIPASTOS CALIENTES | 6 | 703 | $34,059,000 | 435 | $78,297 | $53,876 | 2.5 | 134 | 0% | TARJETA(421) | BRIE AL HORNO / PULPO GLASEADO / SALCHICHA ARTESANAL |
| 10 | 01 | ANTIPASTOS FRIOS | 13 | 651 | $26,582,000 | 456 | $58,294 | $45,214 | 2.4 | 130 | 0% | TARJETA(440) | BURRATA / TARTARE / CEVICHE DE PESCA DEL DIA |
| 11 | 07 | COMPARTIR | 7 | 334 | $21,750,000 | 260 | $83,654 | $48,318 | 2.8 | 124 | 0% | TARJETA(245) | PANCETA DE CERDO / LASAGNA / MEDIO POLLO ASADO |
| 12 | 06 | SANDUCHES | 8 | 295 | $14,295,000 | 203 | $70,419 | $33,730 | 2.3 | 107 | 0% | TARJETA(175) | HAMBURGUESA / SANDUCHE JAMON PAVO / SERRANO |
| 13 | 03 | POSTRES | 17 | 392 | $6,281,000 | 302 | $20,798 | $41,237 | 2.4 | 138 | 0% | TARJETA(276) | TORTA CHOCOLATE / PIE LIMON / TIRAMISU |
| 14 | 17 | T BEBIDAS CALIENTES | 15 | 669 | $6,120,000 | 301 | $20,332 | $37,492 | 2.2 | 130 | 0.8% | TARJETA(257) | AMERICANO / CARAJILLO / CAPUCCINO |
| 15 | 29 | BRUNCH | 22 | 218 | $5,414,000 | 72 | $75,194 | $14,423 | 1.4 | 110 | 0% | TARJETA(53) | CALENTADO / WAFFLE SALMON / CALDO ASADO TIRA |
| 16 | 20 | ADICIONES | 46 | 544 | $5,128,000 | 349 | $14,693 | $41,980 | 2.4 | 124 | 0% | TARJETA(306) | PAPAS FRITAS / MINI BURGUER / ADICION LOMO |
| 17 | 12 | K SHOTS | 15 | 130 | $2,951,000 | 20 | $147,550 | $24,412 | 1.0 | 72 | 0% | TARJETA(17) | SHOT MARGARITA CRISTALINO / EXPRESSO MARTINI / MEZCALITA |
| 18 | 30 | BOCADOS | 8 | 306 | $2,866,000 | 3 | $955,333 | $584,815 | 3.7 | 262 | 0% | TRANSFERENCIA(3) | BOCADO ARANCINIS PULPO / TARTAR DE RES / VOL AU VENT BRIE |
| 19 | 31 | BRUNCH BEBIDAS | 10 | 76 | $1,294,000 | 38 | $34,053 | $25,969 | 1.9 | 100 | 0% | TARJETA(35) | MILO / MIMOSA MANDARINA / MIMOSA UCHUVA |
| 20 | 27 | MENU COMIDA RAPPI | 26 | 13 | $473,500 | 7 | $67,643 | $0 | 1.0 | 14 | 0% | RAPPI(6) | PIZZA JAMON SERRANO / HAWAIANA / PEPPERON |
| 21 | 25 | PRODUCTOS COSTO | 3 | 37 | $351,500 | 31 | $11,339 | $1,583 | 1.2 | 177 | 0% | CREDITO(27) | RED BULL COSTO |
| 22 | 21 | AN1 | 3 | 1 | $200 | 1 | $200 | $19 | 1.0 | 0 | 0% | EFECTIVO(1) | AN1 |
| 23 | 19 | SERVICIO | 5 | 1 | $0 | 1 | $0 | $85,741 | 2.0 | 130 | 0% | TARJETA(1) | IMPRIMIR CUENTA |
| 24 | 28 | MENU BEBIDAS RAPPI | 8 | 1 | $7,500 | 1 | $7,500 | $0 | 1.0 | 24 | 0% | RAPPI(1) | COCA COLA ZERO |

#### Categorias sin ventas en Abril (0 cheques, 0 revenue)

| Group ID | Nombre | Productos DB |
|----------|--------|-------------|
| 08 | BANDEJAS | 9 |
| 22 | VINO PROMO | 14 |
| 23 | TIENDA | 53 |
| 24 | VAPEADORES | 3 |
| 26 | COMBO ALMUERZO | 6 |
| SG_01 | V BLANCO | (subgrupo de VINOS) |
| SG_02 | V TINTOS | (subgrupo de VINOS) |
| SG_03 | V ESPUMANTES | (subgrupo de VINOS) |
| SG_04 | COCTEL AUTOR | (subgrupo de AT COCTELES) |
| SG_05 | COCTEL CLASICO | (subgrupo de AT COCTELES) |
| SG_06 | SANGRIAS | (subgrupo de VINOS) |
| SG_07 | WHISKY TG | (subgrupo de LICORES TRAGOS) |
| SG_08 | GIN TG | (subgrupo de LICORES TRAGOS) |
| SG_09 | RON TG | (subgrupo de LICORES TRAGOS) |
| SG_10 | VODKA TG | (subgrupo de LICORES TRAGOS) |
| SG_11 | TEQUILA TG | (subgrupo de LICORES TRAGOS) |
| SG_12 | MEZCAL TG | (subgrupo de LICORES TRAGOS) |
| SG_13 | WHISKY | (subgrupo de LICORES BOTELLA) |
| SG_14 | GIN | (subgrupo de LICORES BOTELLA) |
| SG_15 | RON | (subgrupo de LICORES BOTELLA) |
| SG_16 | VODKA | (subgrupo de LICORES BOTELLA) |
| SG_17 | TEQUILA | (subgrupo de LICORES BOTELLA) |
| SG_18 | MEZCAL | (subgrupo de LICORES BOTELLA) |
| SG_19 | V ROSADO | (subgrupo de VINOS) |
| SG_20 | OTROS | (subgrupo de LICORES BOTELLA) |
| SG_21 | OTROS TG | (subgrupo de LICORES TRAGOS) |
| SG_22 | COPA VINO | (subgrupo de VINOS) |
| SG_23 | APERITIVOS DIGESTIVOS | (subgrupo de LICORES BOTELLA) |
| SG_24 | COCTEL PREMIUM | (subgrupo de AT COCTELES) |

### 1.3 Revenue por zona (derived_zone_name)

| Zona | Revenue (COP) | % |
|------|---------------|---|
| Tipi | ~$416M | ~60% |
| Attic | ~$100M | ~15% |
| Chispas | ~$65M | ~10% |
| Desconocido | ~$60M | ~9% |
| Interno | ~$17M | ~3% |
| Llevar | ~$0.7M | <1% |
| Keller | ~$0.1M | <1% |

### 1.4 Cross-category companions (Top 20)

Productos que se piden juntos en el mismo cheque:

| Categoria 1 | Categoria 2 | Cheques compartidos |
|-------------|-------------|---------------------|
| PIZZAS | T BEBIDAS FRIAS | 717 |
| AT COCTELES | T BEBIDAS FRIAS | 482 |
| T BEBIDAS FRIAS | CERVEZAS | 462 |
| FUERTES | T BEBIDAS FRIAS | 427 |
| PIZZAS | AT COCTELES | 398 |
| ANTIPASTOS FRIOS | T BEBIDAS FRIAS | 374 |
| ANTIPASTOS CALIENTES | T BEBIDAS FRIAS | 350 |
| PIZZAS | CERVEZAS | 343 |
| AT COCTELES | CERVEZAS | 284 |
| VINOS | T BEBIDAS FRIAS | 275 |
| T BEBIDAS FRIAS | ADICIONES | 272 |
| ANTIPASTOS FRIOS | PIZZAS | 268 |
| ANTIPASTOS CALIENTES | PIZZAS | 260 |
| LICORES TRAGOS | T BEBIDAS FRIAS | 259 |
| POSTRES | T BEBIDAS FRIAS | 240 |
| T BEBIDAS FRIAS | T BEBIDAS CALIENTES | 231 |
| PIZZAS | VINOS | 225 |
| COMPARTIR | T BEBIDAS FRIAS | 212 |
| FUERTES | PIZZAS | 206 |
| ANTIPASTOS CALIENTES | AT COCTELES | 190 |

### 1.5 Datos adicionales NO mostrados en el frontend

#### 1.5.1 Tiempo promedio de servicio (closed_at - opened_at) por categoria

Disponible en DB: `pos_sales.opened_at` y `pos_sales.closed_at`. Calculado arriba por categoria.

| Categoria | Tiempo servicio prom (min) |
|-----------|---------------------------|
| BOCADOS | 262 |
| PRODUCTOS COSTO | 177 |
| LICORES BOTELLA | 154 |
| POSTRES | 138 |
| VINOS | 134 |
| ANTIPASTOS FRIOS | 130 |
| T BEBIDAS CALIENTES | 130 |
| SERVICIO | 130 |
| ANTIPASTOS CALIENTES | 134 |
| PIZZAS | 127 |
| COMPARTIR | 124 |
| ADICIONES | 124 |
| AT COCTELES | 118 |
| T BEBIDAS FRIAS | 115 |
| CERVEZAS | 110 |
| BRUNCH | 110 |
| SANDUCHES | 107 |
| LICORES TRAGOS | 102 |
| BRUNCH BEBIDAS | 100 |
| K SHOTS | 72 |
| MENU COMIDA RAPPI | 14 |

**NO se muestra en ningun lado del dashboard.**

#### 1.5.2 Propina promedio por categoria

Disponible en DB: `pos_sales.tip_amount`. Calculado arriba. Rango: $0 (RAPPI) a $584,815 (BOCADOS, datos atipicos con solo 3 cheques). Entre categorias con >20 cheques: $14,423 (BRUNCH) a $106,240 (LICORES BOTELLA).

**Se muestra a nivel global (KPI row) pero NO por categoria en el dashboard principal ni en drill-down de categoria.**

#### 1.5.3 Party size promedio por categoria

Disponible en DB: `pos_sales.party_size`. Rango: 1.0 (K SHOTS, RAPPI) a 3.7 (BOCADOS, datos atipicos). Categorias estables: 1.9-2.8.

**Se muestra a nivel global (KPIs) pero NO por categoria.**

#### 1.5.4 Ratio de cancelacion/devolucion

Solo 2 cheques cancelados de 2,197 total (0.09%).  
Por categoria, solo PIZZAS (0.6%), T BEBIDAS FRIAS (0.2%), CERVEZAS (0.7%) y T BEBIDAS CALIENTES (0.8%) tienen cancelaciones.

**No se muestra en ningun lado.**

#### 1.5.5 Metodo de pago preferido por categoria

32 metodos de pago en DB. Dominancia de TARJETA (VISA) en todas las categorias. Algunas interesantes:
- RAPPI solo en MENU COMIDA/BEBIDAS RAPPI
- CORTESIAS: PIZZAS(18), T BEBIDAS FRIAS(59), POSTRES(9), SANDUCHES(13), COMPARTIR(4), T BEBIDAS CALIENTES(20), BRUNCH(9)
- CREDITO: PRODUCTOS COSTO(27), BRUNCH(7), ADICIONES(15)
- TRANSFERENCIA: LICORES BOTELLA(7), BOCADOS(3)

**Se muestra globalmente (PaymentMethodsChart) pero NO por categoria.**

#### 1.5.6 Companias cross-category

Calculado arriba. Top combinacion: PIZZAS + T BEBIDAS FRIAS (717 cheques).

**Solo se muestra a nivel de producto individual (ProductDrillDown "Acompanantes"). NO existe vista de cross-category companions.**

#### 1.5.7 Datos de Shifts (pos_shifts)

69 turnos en Abril. Datos disponibles:
- Station (CAJAPIZZERIA, CAJAKILLER, CAJASHOT, ATICOCAJA)
- Cashier (CAJERO, CAJERO1, CAJERO2, CAJERO4, CAJERO 6, SOPORTE)
- Totales: cash_total, card_total, credit_total
- Horas: opened_at, closed_at, is_closed

**No se usa en ningun componente del dashboard.**

#### 1.5.8 Staff type e is_visible

44 staff en DB. Columnas: staff_type (1=mesero, 3=caja), is_visible (todos false). Staff como BARRATALLER, ACUENTAS/CAJA, SOPORTE, DOBLE A son operacionales, no meseros.

**No se usa para filtrar ni clasificar staff en el dashboard. Todos aparecen igual.**

#### 1.5.9 Areas con service_type

10 areas: service_type 1 (dining) y 3 (reservado). Zonas como "TEE R", "KELLER R", "KELLE R", "ATICO R", "SHOT" (id 09) son tipo 3 (reservado).

**No se usa. derived_zone_name en pos_sales no coincide con pos_areas.name directamente (zona "Tipi" != area "TEE PEE").**

#### 1.5.10 Productos: flags use_dining, use_delivery, use_quick, visible_kiosk, visible_menu

Todos los productos tienen todas las flags en true en los datos actuales. Potencialmente util si se diversifican canales.

**No se usan para filtrar ni clasificar productos en el dashboard.**

---

## PARTE 2: Datos que se MUESTRAN en el frontend

### 2.1 API principal: `/api/admin/pos-dashboard/route.ts`

**Entrega estos datos:**

| Campo | Descripcion | Calculado de |
|-------|-------------|-------------|
| `kpis.revenue` | Revenue total | SUM(pos_sales.total) |
| `kpis.cheques` | Cantidad cheques | COUNT(pos_sales) |
| `kpis.ticketPromedio` | Ticket promedio | revenue/cheques |
| `kpis.propinaTotal` | Total propinas | SUM(pos_sales.tip_amount) |
| `kpis.propinaPromedio` | Propina promedio | tip_total/cheques |
| `kpis.personas` | Total personas | SUM(pos_sales.party_size) |
| `kpis.partySizePromedio` | Party size promedio | personas/cheques |
| `kpis.cardPaidTotal` | Total pagado tarjeta | SUM(pos_sales.card_paid) |
| `kpis.cashPaidTotal` | Total pagado efectivo | SUM(pos_sales.cash_paid) |
| `byZone[]` | Revenue/cheques/ticket/propina/pct por zona | GROUP BY derived_zone_name |
| `hourlyRevenue[]` | Revenue/cheques por hora | GROUP BY EXTRACT(HOUR FROM opened_at) |
| `dailyTrend[]` | Revenue/cheques/propina/personas por dia | GROUP BY DATE(opened_at) |
| `topProducts[]` | Top 15 productos (name/category/qty/revenue) | JOIN items+products+groups |
| `topCategories[]` | Categorias (id/name/qty/revenue/cheques) | JOIN items+products+groups |
| `topProductByCategory[]` | #1 producto por categoria | items+products+groups |
| `staffPerformance[]` | Staff (id/name/cheques/revenue/propina/ticket) | JOIN sales+staff |
| `paymentMethods[]` | Metodos (method/amount/count/pct) | JOIN payments+methods |
| `clientTiers[]` | Tiers loyalty (tier/count/totalSpent) | customer_stats view |
| `clientSplit` | Consumidor final vs identificados | customer_id null check |
| `categoryList[]` | Lista de categorias para filtro | pos_product_groups |

### 2.2 API de detalle: `/api/admin/pos-dashboard/detail/route.ts`

5 drill-down types con estos datos:

| Type | Datos que entrega el API | Datos que NO entrega (estan en DB) |
|------|------------------------|-----------------------------------|
| **product** | byZone, byHour, byDay, companions, summary(name/revenue/qty/cheques/avgTicket) | tip_amount, party_size, service_time, payment_methods, cancelled_count |
| **staff** | byZone, byHour, topProducts, dailyTrend, summary(name/revenue/cheques/propina/avgTicket) | party_size, service_time, payment_methods, category breakdown |
| **category** | topProducts(15), byZone, byHour, summary(name/revenue/qty/cheques) | tip_amount, party_size, service_time, payment_methods, daily trend, companions, cancelled |
| **hour** | topProducts, topStaff, byZone, summary(hour/revenue/cheques) | tip_amount, party_size, service_time, payment_methods, daily trend |
| **zone** | topProducts, byHour, topStaff, dailyTrend, summary(zone/revenue/cheques/propina) | party_size, service_time, payment_methods, category breakdown |

### 2.3 Componentes del frontend — que datos muestran

#### POSDashboardPanel (vista principal)

| Componente | Datos que muestra |
|-----------|-------------------|
| RevenueHeatmapCalendar | dailyTrend (revenue/cheques/propina/personas por dia) |
| DayKPIBar | revenue, cheques, ticketPromedio, propinaTotal, personas, cardPaidTotal, cashPaidTotal |
| ZoneRevenueChart | byZone (zone, revenue, cheques, propina, pct) |
| HourlyRevenueChart | hourlyRevenue (hour, revenue, cheques) |
| TopProductsTable | topProducts (top 15, name/category/qty/revenue) |
| CategoryBreakdown | topCategories (top 15, name/qty/revenue/cheques) |
| TopProductByCategoryChart | topProductByCategory (category/top product/revenue) |
| StaffPerformanceTable | staffPerformance (name/cheques/revenue/propina/ticketPromedio) |
| PaymentMethodsChart | paymentMethods (method/amount/count/pct) |
| ClientTiersCard | clientTiers |
| ClientSplitCard | clientSplit |

#### DrillDownPanel (5 tipos)

##### Product DrillDown
- **Tabs**: Zona, Hora, Dias, Acompanantes
- **Summary**: Revenue total, Unidades vendidas, Cheques, Ticket promedio
- **Muestra**: byZone (revenue), byHour (revenue), byDay (revenue), companions (name/qty/revenue)
- **NO muestra**: propina, party_size, service_time, payment_methods, cancel_status

##### Staff DrillDown
- **Tabs**: Zona, Hora, Productos, Tendencia
- **Summary**: Revenue total, Cheques, Propinas, Ticket promedio
- **Muestra**: byZone (revenue), byHour (revenue), topProducts (name/qty/revenue), dailyTrend (revenue)
- **NO muestra**: party_size, service_time, payment_methods, category mix, avg cheques per hour

##### Category DrillDown
- **Tabs**: Productos, Zona, Hora
- **Summary**: Revenue total, Unidades vendidas, Cheques
- **Muestra**: topProducts (name/qty/revenue/cheques), byZone (revenue), byHour (revenue)
- **NO muestra**: propina, party_size, service_time, payment_methods, daily trend, companions, ticket promedio, cancelled ratio

##### Hour DrillDown
- **Tabs**: Productos, Meseros, Zonas
- **Summary**: Hora, Revenue total, Cheques
- **Muestra**: topProducts (name/qty/revenue), topStaff (name/cheques/revenue), byZone (cheques/revenue)
- **NO muestra**: propina, party_size, service_time, payment_methods, daily variation same hour

##### Zone DrillDown
- **Tabs**: Productos, Hora, Meseros, Tendencia
- **Summary**: Zona, Revenue total, Cheques, Propinas
- **Muestra**: topProducts (name/qty/revenue), byHour (revenue), topStaff (name/cheques/revenue), dailyTrend (revenue)
- **NO muestra**: party_size, service_time, payment_methods, category breakdown, avg ticket

---

## PARTE 3: Gaps de cobertura — Resumen ejecutivo

### 3.1 Metricas calculables pero NO mostradas

| Metrica | Disponible en DB | API principal | API detalle | Frontend |
|---------|-----------------|---------------|-------------|----------|
| **Tiempo servicio promedio** (closed_at - opened_at) | ✅ | ❌ | ❌ | ❌ |
| **Tiempo servicio por categoria** | ✅ | ❌ | ❌ | ❌ |
| **Propina por categoria** | ✅ | ❌ | ❌ (category no la pasa) | ❌ |
| **Party size por categoria** | ✅ | ❌ | ❌ | ❌ |
| **Ratio cancelacion por categoria** | ✅ | ❌ | ❌ | ❌ |
| **Metodo de pago por categoria** | ✅ | ❌ | ❌ | ❌ |
| **Metodo de pago por hora/zona** | ✅ | ❌ | ❌ (hour/zone no lo pasan) | ❌ |
| **Cross-category companions** | ✅ | ❌ | ❌ (solo en product) | ❌ |
| **Ticket promedio por categoria** | ✅ | ✅ (topCategories tiene cheques) | Parcial (category no tiene ticket) | Parcial |
| **Shift info** (station, cashier, totals) | ✅ | ❌ | ❌ | ❌ |
| **Staff type** (mesero vs caja) | ✅ | ❌ | ❌ | ❌ |
| **Area service_type** (dining vs reservado) | ✅ | ❌ | ❌ | ❌ |
| **Product channel flags** (delivery/quick/kiosk) | ✅ | ❌ | ❌ | ❌ |
| **Revenue per card vs cash por zona** | ✅ | ❌ | ❌ | ❌ |
| **Horas pico por zona** | ✅ | Parcial (zone byHour) | ✅ (zone) | ✅ (zone drill) |
| **Propina por zona** | ✅ | ✅ (byZone.propinaTotal) | ✅ (staff/zone) | ✅ (zone/staff) |
| **Daily trend por categoria** | ✅ | ❌ | ❌ (category no lo tiene) | ❌ |

### 3.2 Gaps criticos del API de detalle (detail/route.ts)

| Drill-down | Dato faltante | Impacto |
|------------|---------------|---------|
| **category** | No entrega propina, party_size, service_time, payment_methods, dailyTrend, companions, cancelled ratio | Categorias son 2do drill-down mas usado, muy pobre en datos |
| **product** | No entrega tip, party_size, service_time del contexto de venta | Producto es el drill mas granular |
| **hour** | No entrega tip_total, propina_promedio, party_size, payment_methods | No se puede ver si ciertas horas tienen mas propina o pagos en efectivo |
| **zone** | No entrega party_size_avg, service_time_avg, payment_methods, category breakdown | Zona es critica para operaciones |
| **staff** | No entrega party_size_avg, service_time_avg, payment_methods, category breakdown | Staff performance es incompleto |

### 3.3 Subgrupos SG_* no filtrados ni agregados

Los 24 subgrupos (SG_01 a SG_24) son categorias hijas de las principales (VINOS, LICORES, AT COCTELES). Actualmente:
- **API principal**: Los filtra con `.filter(g => g.pos_group_id && !g.pos_group_id.startsWith('SG_'))` en categoryList
- **API detalle**: No hay jerarquia padre-hijo
- **DB**: Todos los productos en VINOS usan `pos_group_id = "09"` (padre), los subgrupos no estan asignados a productos directamente
- **Resultado**: Los subgrupos existen pero estan huérfanos (0 productos asignados, 0 ventas). No hay forma de navegar la jerarquia.

### 3.4 Mapeo zonas inconsistente

- `pos_areas` tiene 10 areas con nombres exactos (TEE PEE, PIZZERIA, ATICO, etc.)
- `pos_sales.derived_zone_name` usa nombres simplificados (Tipi, Attic, Chispas, Interno, Llevar, Keller, Desconocido)
- No hay tabla de mapeo. La relacion se pierde.
- "Desconocido" agrupa ~9% del revenue, probablemente ventas sin area asignada

### 3.5 KPIRow vs DayKPIBar inconsistencia

- `KPIRow` muestra 6 KPIs (revenue, cheques, ticket, propinas, personas, party prom.) — **NO muestra** cardPaidTotal, cashPaidTotal
- `DayKPIBar` muestra 7 KPIs (revenue, cheques, ticket, propinas, personas, tarjeta, efectivo) — **NO muestra** partySizePromedio, propinaPromedio
- Los datos estan disponibles para ambos pero se muestran de forma inconsistente

---

## PARTE 4: Recomendaciones priorizadas

### Prioridad Alta — Datos que existen y deberian mostrarse

1. **Tiempo de servicio** en drill-downs: Agregar `avgServiceTime` a category, staff, zone, product detail. Es la metrica operacional mas solicitada para restaurantes.
2. **Propina por categoria** en CategoryBreakdown y DrillDown de categoria: Los datos estan en pos_sales.tip_amount, solo requiere agregar al handleCategory.
3. **Metodo de pago por zona/hora**: Agregar payment_methods a zone y hour detail. Datos ya disponibles via pos_sale_payments.
4. **Category drill-down enriquecido**: Agregar dailyTrend, companions, tip_avg, party_size, service_time, payment_methods. Actualmente es el drill-down mas pobre con solo 3 datos.

### Prioridad Media — Datos operacionales utiles

5. **Staff type filter**: Usar staff_type para separar meseros (type=1) de cajeros (type=3) en StaffPerformanceTable.
6. **Ratio cancelacion**: Aunque solo 2 cheques cancelados en Abril, el dato deberia estar disponible para meses con mas actividad.
7. **Cross-category companions view**: Nuevo componente que muestre las combinaciones mas frecuentes de categorias. Los datos estan listos.
8. **Shift revenue reconciliation**: Comparar totales de pos_shifts vs pos_sales para auditoria de cierre de turno.

### Prioridad Baja — Mejoras de calidad

9. **Mapeo zonas**: Crear lookup table o vista que mapee pos_areas.name a derived_zone_name. Resolver "Desconocido".
10. **Jerarquia de subgrupos**: Conectar subgrupos SG_* con categorias padre para navegacion jerarquica.
11. **Product channel flags**: Filtrar por use_delivery, use_quick, visible_kiosk para analisis de canales.
12. **KPIRow/DayKPIBar unificacion**: Mostrar los mismos 9 KPIs en ambas vistas.

---

## Anexo A: Tabla completa de metodos de pago

| ID | Nombre |
|----|--------|
| 10-26 | TAR 1-18 (terminales tarjeta) |
| 30 | TRANSFERENCIA |
| 31 | RAPPI |
| 32 | JUSTO |
| 39 | CORTESIAS |
| CR | CREDITO |
| EF | EFECTIVO |
| MC | MASTERCARD |
| MPY | MARC PAYMENTS |
| MRW | MARC REWARDS |
| SRPC | SRP CREDITO |
| SRPD | SRP DEBITO |
| TPY | TOKENCASH PAYMENTS |
| TRW | TOKENCASH REWARDS |
| VAL | FICHA |
| VISA | TARJETA |

## Anexo B: Estructura real de columnas DB

| Tabla | Columnas reales (corregidas vs tarea) |
|-------|--------------------------------------|
| pos_areas | id, restaurant_id, pos_area_id, name, **service_type** (no zone_type), is_active, created_at |
| pos_staff | id, restaurant_id, pos_staff_id, name, **staff_type** (no role), is_visible (no is_active), pos_internal_id, created_at |
| pos_shifts | id, restaurant_id, pos_shift_id (no shift_id), opened_at, closed_at, station, cashier, cash_total, card_total, credit_total, is_closed, created_at |
| pos_product_groups | pos_group_id, name **(NO tiene columna type)** |