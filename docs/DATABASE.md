# Base de Datos - Attick & Keller

> **Ultima actualizacion**: 2026-05-29 por Ninja
> **Supabase project**: `pbllaipsdfypelnwrvpy`
> **Referencia oficial**: Este documento es la fuente de verdad para la estructura de BD

---

## Resumen Rapido

- **62 tablas** en esquema publico
- **~300,000 registros** totales
- **~80 FKs** definidas
- **11 FKs FALTANTES** que causan fallos silenciosos en Supabase JS joins

---

## Tablas por Dominio

### Restaurante / Auth

| Tabla | Regs | FKs | Descripcion |
|-------|------|-----|-------------|
| `restaurants` | 1 | — | Tenant principal |
| `user_roles` | 7 | restaurant, pos_nomina_staff | Roles: store_admin, super_admin, lider_area, colaborador, reservante |
| `staff` | 44 | restaurant | Staff legacy (sin area/salario) |
| `staff_aliases` | 30 | pos_nomina_staff | Nombres cortos para UI |
| `availability` | 7 | restaurant | Disponibilidad por dia |

### Reservas

| Tabla | Regs | FKs | Descripcion |
|-------|------|-----|-------------|
| `reservations` | 412 | restaurant, customer, table, table_combination | Reservas con estado (pending/confirmed/seated/no_show/cancelled) |
| `reservation_status_log` | 70 | reservation | Historial de cambios de estado |
| `tables` | 45 | restaurant, zone | Mesas con capacidad y zona |
| `table_zones` | 5 | restaurant | Zonas (Terraza, Interior, Barra, Privada, Exterior) |
| `table_combinations` | 39 | restaurant | Combinaciones de mesas para grupos grandes |
| `assignment_corrections` | 0 | restaurant, reservation, table(2) | Correcciones de asignacion |
| `payments` | 0 | reservation | Pagos de reservas |
| `reminders` | 12 | reservation | Recordatorios de reserva |

### Clientes / CRM

| Tabla | Regs | FKs | Descripcion |
|-------|------|-----|-------------|
| `customers` | 22,860 | restaurant | Base de clientes con tags y stats |
| `customer_stats` | 22,860 | customer | Metricas agregadas (visitas, gasto, etc.) |
| `customer_tags` | 5 | restaurant | Tags personalizados |
| `customer_tag_links` | 0 | customer, tag | Relacion many-to-many |
| `customer_rewards` | 0 | customer, reward | Recompensas de fidelidad |
| `visit_history` | 224 | customer | Historial de visitas |
| `email_campaigns` | 4 | restaurant | Campanas de email |
| `campaign_recipients` | 44 | campaign, customer | Destinatarios de campanas |
| `email_log` | 2 | — | Log de emails enviados (deduplicacion) |
| `loyalty_rewards` | 0 | restaurant | Recompensas de fidelidad |

### Menu

| Tabla | Regs | FKs | Descripcion |
|-------|------|-----|-------------|
| `menu_categories` | 23 | restaurant | Categorias del menu publico |
| `menu_items` | 48 | restaurant, category | Platos del menu |
| `menu_item_ingredients` | 0 | menu_item | Ingredientes por plato (vacio) |
| `pos_menu_mapping` | 48 | menu_item | Vinculo menu_item ↔ pos_product |

### POS - Catalogo

| Tabla | Regs | FKs | PITFALL |
|-------|------|-----|---------|
| `pos_products` | 853 | restaurant, product_group(2) | `pos_product_id` tiene TRAILING SPACES |
| `pos_product_groups` | 54 | restaurant | Categorias POS |
| `pos_product_prices` | 860 | restaurant | Precios por producto |
| `pos_product_recipes` | 2,270 | restaurant | **SIN FK** a pos_products ni pos_ingredients |
| `pos_ingredients` | 996 | restaurant | **SIN FK** a pos_ingredient_categories |
| `pos_ingredient_categories` | 21 | restaurant | Cat. insumos (excluye bar=2, NO USAR=14) |
| `pos_ingredient_costs` | 996 | restaurant | **SIN FK** a pos_ingredients |
| `pos_composite_ingredients` | 1,619 | restaurant | Subrecetas |
| `pos_warehouses` | 6 | restaurant | Almacenes |
| `pos_stock_thresholds` | 17 | restaurant | Umbrales de stock |
| `pos_recipe_warehouses` | 2,806 | restaurant | Recetas por almacen |
| `pos_suppliers` | 179 | restaurant | Proveedores |
| `pos_purchases` | 10,817 | restaurant | Compras |
| `pos_purchase_items` | 41,705 | restaurant | Items de compra |

### POS - Operacion

| Tabla | Regs | FKs | PITFALL |
|-------|------|-----|---------|
| `pos_staff` | 44 | restaurant | Nombres cortos, sin cedula |
| `pos_areas` | 10 | restaurant | Zonas (Tipi, Attic, Chispas, etc.) |
| `pos_payment_methods` | 32 | restaurant | Formas de pago |
| `pos_shifts` | 384 | restaurant | Turnos historicos POS |
| `pos_sales` | 11,951 | restaurant, customer | **SIN FK** a pos_staff, pos_shifts, pos_areas |
| `pos_sale_items` | 87,493 | restaurant, pos_sale | **SIN FK** a pos_products |
| `pos_sale_payments` | 9,964 | restaurant, pos_sale | **SIN FK** a pos_payment_methods |
| `pos_id_mapping` | 2,253 | restaurant | Mapeo IDs con prefijo restaurante |

### Nomina

| Tabla | Regs | FKs | Descripcion |
|-------|------|-----|-------------|
| `nomina_periodos` | 4 | — | Periodos de nomina (Excel upload) |
| `nomina_detalle` | 44 | periodo, staff | Detalle por empleado |
| `nomina_he_recargos` | 36 | periodo, staff | Horas extras y recargos |
| `nomina_novedades` | 11 | periodo, staff | Vacaciones, incapacidades |
| `nomina_propinas` | 3 | periodo | Propinas por sede |
| `nomina_provisiones` | 41 | periodo, staff | Provisiones prestaciones |
| `pos_nomina_staff` | 49 | — | Personal extendido con cedula, area, salario |
| `pos_nomina_daily` | 959 | staff | Registros diarios biometrica |
| `pos_nomina_monthly` | 0 | staff | Subtotales mensuales (vacio) |

### Turnos (scheduling)

| Tabla | Regs | FKs | Descripcion |
|-------|------|-----|-------------|
| `shift_types` | 24 | — | Catalogo: 8 cocina, 7 barra, 9 servicio |
| `shift_schedules` | 4 | restaurant | Cronogramas semanales por area |
| `shift_assignments` | 49 | schedule, employee(pos_nomina_staff) | Asignaciones dia→turno |
| `shift_novedades` | 4 | employee, schedule | Novedades de turno |

---

## FKs FALTANTES (CRITICO)

Estas columnas tienen datos que referencian otras tablas, pero **no tienen FK definida**. Esto causa que los **joins de Supabase JS fallen silenciosamente** (retornan null).

| Tabla.Columna | Deberia referenciar | Impacto |
|---------------|-------------------|---------|
| `pos_ingredients.pos_category_id` | `pos_ingredient_categories.pos_category_id` | Join en API retorna null → MenuItemForm vacio |
| `pos_ingredient_costs.pos_ingredient_id` | `pos_ingredients.pos_ingredient_id` | Costos no se vinculan a ingredientes |
| `pos_product_recipes.pos_product_id` | `pos_products.pos_product_id` | Recetas no se vinculan a productos |
| `pos_product_recipes.pos_ingredient_id` | `pos_ingredients.pos_ingredient_id` | Recetas no se vinculan a ingredientes |
| `pos_sales.pos_staff_id` | `pos_staff.pos_staff_id` | Ventas no se vinculan a meseros |
| `pos_sales.pos_shift_id` | `pos_shifts.pos_shift_id` | Ventas no se vinculan a turnos |
| `pos_sales.pos_area_id` | `pos_areas.pos_area_id` | Ventas no se vinculan a zonas |
| `pos_sale_items.pos_product_id` | `pos_products.pos_product_id` | Items no se vinculan a productos |
| `pos_sale_payments.pos_payment_method_id` | `pos_payment_methods.pos_payment_method_id` | Pagos no se vinculan a metodos |
| `menu_item_ingredients.pos_ingredient_id` | `pos_ingredients.pos_ingredient_id` | Ingredientes de menu no se vinculan |

### POR QUE no se crearon estas FKs?

1. **PKs compuestas**: `pos_products` tiene unique `(restaurant_id, pos_product_id)`, no se puede FK simple
2. **Data sucia**: `pos_product_id` tiene trailing spaces, algunos IDs no existen en la tabla referenciada
3. **Mismo restaurant_id**: Todas las tablas POS tienen `restaurant_id`, las FKs necesitarian constraint compuesto

### WORKAROUND en APIs

Usar **queries separadas + merge manual** en vez de Supabase JS joins:

```typescript
// MAL - retorna null silenciosamente
sb.from('pos_ingredients').select('*, pos_ingredient_categories(name)')

// BIEN - queries separadas + merge
const [ingredients, categories] = await Promise.all([
  sb.from('pos_ingredients').select('*'),
  sb.from('pos_ingredient_categories').select('*')
])
const catMap = Object.fromEntries(categories.map(c => [c.pos_category_id, c.name]))
const enriched = ingredients.map(i => ({ ...i, category_name: catMap[i.pos_category_id] }))
```

---

## Datos Sucios Conocidos

| Tabla | Columna | Problema | Solucion |
|-------|---------|----------|----------|
| `pos_products` | `pos_product_id` | Trailing spaces ("01001 ") | **SIEMPRE TRIM** |
| `pos_ingredients` | `pos_category_id` | Algunos null | Filtrar con `not('pos_category_id', 'is', null)` |
| `pos_ingredient_categories` | `pos_category_id = 14` | "NO USAR" - 8 ingredientes | **EXCLUIR** de todas las queries |
| `pos_ingredient_categories` | `classification = 2` | Bar/vinos | Excluir por defecto |
| `pos_nomina_staff` | `secondary_areas` | Solo 2 de 33 empleados con area tienen datos | El filtro `.or('area.eq.X,secondary_areas.cs.{X}')` apenas funciona |
| `pos_nomina_staff` | `area = NULL` | 13 empleados sin area | No aparecen en panel de turnos |
| `pos_sales` | `pos_area_id` | Valores que no existen en pos_areas | Tabla `pos_areas` tiene solo 10 de ~11 areas del POS |
| `shift_types` | `is_split` | P1/P2 marcados false pero son turnos 12h+ | Verificar logica de turnos partidos |

---

## RLS (Row Level Security)

Todas las tablas tienen al menos:

- **service_role**: acceso total (usado por API routes server-side)
- **authenticated**: acceso de lectura (usado por cliente con sesion)
- Tablas especificas (campaigns, customers): politicas granulares por `restaurant_id` y `role`

**PITFALL**: El cliente anonimo (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) **no puede leer** la mayoria de tablas. Si un componente hace query directo al cliente Supabase desde el navegador sin pasar por API route, recibira 0 resultados.

---

## Indices Importantes

- `pos_nomina_daily(fecha, staff_id)` — queries de nomina por fecha
- `pos_sales(fecha_cierre)` — dashboard por periodo
- `pos_sale_items(pos_sale_id)` — detalle de cheque
- `shift_assignments(schedule_id, employee_id, day_index)` — grilla de turnos

---

## Convenciones

- **restaurant_id**: TODA tabla lo tiene y es FK a `restaurants.id`
- **UUIDs**: PKs son UUIDs autogenerados excepto IDs del POS (TEXT como "01001")
- **pos_ prefix**: Tablas con datos importados del SoftRestaurant POS
- **nomina_ prefix**: Tablas de nomina (datos del Excel biometrico)
- **shift_ prefix**: Tablas del sistema de scheduling de turnos
- **BATCH=200**: Limite de PostgREST `.in()` — usar paginacion para listas grandes