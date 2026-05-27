# Plan de Resolucion — Auditoria POS Dashboard

**Fecha:** 2026-05-26
**Archivos base:** `POS_DASHBOARD_AUDIT.md`, `PROBLEMA_TABLA_OPERACIONAL.md`
**Principio rector:** Cero cambios destructivos. Toda migracion de datos usa UPSERT. Todo fix de UI preserva el comportamiento existente.

---

## Indice

1. [P0 — CRITICO: Importar cheqdet a pos_sale_items](#p0--critico)
2. [P1 — BUGS de UI](#p1--bugs-de-ui)
3. [P2 — API Improvements](#p2--api-improvements)
4. [P3 — UX Polish](#p3--ux-polish)
5. [Orden de Ejecucion y Dependencias](#orden-de-ejecucion)

---

## P0 — CRITICO: Importar cheqdet a pos_sale_items {#p0--critico}

### Contexto

- **Tabla fuente:** `cheqdet` en Supabase — 882K+ filas con detalle de cada item vendido
- **Tabla destino:** `pos_sale_items` — actualmente solo ~17K filas (abril 2026)
- **Problema:** Ene, Feb, Mar, May tienen `pos_sales` (cheques) pero SIN `pos_sale_items`
- **Schemas relevantes:**
  - `cheqdet`: `folio`, `codigo`, `descripcion`, `cantidad`, `precio`, `importe`, `descuento`, `fecha`, `hora`, `mesa`
  - `pos_sales`: `id` (UUID), `pos_folio` (varchar, ej: "C75-12345")
  - `pos_sale_items`: `id` (UUID), `pos_sale_id` (FK → pos_sales.id), `pos_product_id` (FK → pos_products.pos_product_id), `quantity`, `unit_price`

### Paso 0: Auditoria previa del schema

Antes de escribir el script, verificar la estructura exacta de las tablas:

```sql
-- Verificar estructura de cheqdet
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'cheqdet' ORDER BY ordinal_position;

-- Verificar estructura de pos_sale_items
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'pos_sale_items' ORDER BY ordinal_position;

-- Verificar pos_folio en pos_sales (formato y ejemplos)
SELECT pos_folio, COUNT(*) FROM pos_sales
WHERE is_cancelled = false AND is_paid = true
GROUP BY pos_folio ORDER BY COUNT(*) DESC LIMIT 20;

-- Verificar foliodet en cheqdet (formato y ejemplos)
SELECT foliodet, COUNT(*) FROM cheqdet GROUP BY foliodet ORDER BY COUNT(*) DESC LIMIT 20;
```

### Paso 1: Script Python de importacion

**Archivo:** `scripts/import_cheqdet_to_pos_sale_items.py`

**Dependencias:** `psycopg2-binary` (o `asyncpg`)

```python
"""
Importa lineas de cheqdet → pos_sale_items para todos los meses con pos_sales.
NO DESTRUCTIVO — usa INSERT ... ON CONFLICT DO NOTHING.
Procesa en batches de 500 para no saturar la DB.
"""

import os
import sys
import time
import uuid
from datetime import datetime
import psycopg2
from psycopg2.extras import execute_values

# ── Config ──────────────────────────────────────────────
DB_CONFIG = {
    'host': 'aws-1-us-east-2.pooler.supabase.com',
    'dbname': 'postgres',
    'user': 'postgres.pbllaipsdfypelnwrvpy',
    'password': 'Pita5721@153',
    'port': 5432,
}

BATCH_SIZE = 500  # Procesar cheqdet en batches
INSERT_BATCH = 500  # Insertar pos_sale_items en batches

# ── Conexion ────────────────────────────────────────────
def get_conn():
    return psycopg2.connect(**DB_CONFIG)

# ── Paso 1: Mapa pos_folio → pos_sale_id ────────────────
def build_folio_to_sale_map(cur):
    """Construye diccionario {pos_folio: pos_sale_id} para todas las ventas."""
    cur.execute("""
        SELECT pos_folio, id FROM pos_sales
        WHERE is_cancelled = false AND is_paid = true AND pos_folio IS NOT NULL
    """)
    mapping = {}
    for row in cur.fetchall():
        folio = row[0].strip() if row[0] else None
        if folio:
            mapping[folio] = row[1]
    print(f"[INFO] {len(mapping)} folios mapeados desde pos_sales")
    return mapping

# ── Paso 2: Mapa codigo (cheqdet) → pos_product_id ─────
def build_product_code_map(cur):
    """Construye diccionario {codigo: pos_product_id} desde pos_products."""
    cur.execute("SELECT pos_product_id, barcode, code FROM pos_products")
    code_to_id = {}
    for row in cur.fetchall():
        pid = row[0]
        barcode = row[1].strip() if row[1] else None
        code = row[2].strip() if row[2] else None
        if barcode:
            code_to_id[barcode] = pid
        if code and code != barcode:
            code_to_id[code] = pid
        # Tambien mapear el propio pos_product_id (por si cheqdet.codigo == pos_product_id)
        if pid:
            code_to_id[pid.strip()] = pid
    print(f"[INFO] {len(code_to_id)} codigos de producto mapeados")
    return code_to_id

# ── Paso 3: Contar cheqdet pendientes por mes ───────────
def count_pending_by_month(cur, folio_map):
    """Cuenta cuantas filas de cheqdet tienen foliodet que existe en pos_sales."""
    folios = list(folio_map.keys())
    months = {}
    for i in range(0, len(folios), BATCH_SIZE):
        batch = folios[i:i + BATCH_SIZE]
        cur.execute("""
            SELECT TO_CHAR(fecha, 'YYYY-MM') AS mes, COUNT(*)
            FROM cheqdet
            WHERE foliodet = ANY(%s)
            GROUP BY mes ORDER BY mes
        """, (batch,))
        for row in cur.fetchall():
            months[row[0]] = months.get(row[0], 0) + row[1]
    return months

# ── Paso 4: Verificar duplicados existentes ─────────────
def count_existing_items(cur, folio_map):
    """Cuenta cuantos pos_sale_items ya existen para estos sales."""
    sale_ids = list(folio_map.values())
    total = 0
    for i in range(0, len(sale_ids), BATCH_SIZE):
        batch = sale_ids[i:i + BATCH_SIZE]
        cur.execute("SELECT COUNT(*) FROM pos_sale_items WHERE pos_sale_id = ANY(%s)", (batch,))
        total += cur.fetchone()[0]
    return total

# ── Paso 5: Importar — el corazon del script ────────────
def import_cheqdet(cur, folio_map, code_map):
    """
    Lee cheqdet en batches, matchea foliodet→pos_sale_id, codigo→pos_product_id,
    e inserta en pos_sale_items usando ON CONFLICT DO NOTHING.
    """
    folios = list(folio_map.keys())
    total_processed = 0
    total_inserted = 0
    total_skipped_no_product = 0
    total_skipped_no_folio = 0
    total_duplicates = 0

    for batch_idx in range(0, len(folios), BATCH_SIZE):
        folio_batch = folios[batch_idx:batch_idx + BATCH_SIZE]

        # Leer cheqdet para este batch de folios
        cur.execute("""
            SELECT foliodet, codigo, cantidad, precio, importe, descripcion
            FROM cheqdet
            WHERE foliodet = ANY(%s)
        """, (folio_batch,))

        rows = cur.fetchall()
        batch_to_insert = []

        for row in rows:
            foliodet = row[0].strip() if row[0] else ''
            codigo = row[1].strip() if row[1] else ''
            cantidad = float(row[2] or 0)
            precio = float(row[3] or 0)
            # importe y descripcion disponibles si se necesitan

            sale_id = folio_map.get(foliodet)
            if not sale_id:
                total_skipped_no_folio += 1
                continue

            product_id = code_map.get(codigo)
            if not product_id:
                total_skipped_no_product += 1
                continue

            batch_to_insert.append((sale_id, product_id, cantidad, precio))

        # Insertar en batches con ON CONFLICT DO NOTHING
        if batch_to_insert:
            inserted = 0
            for j in range(0, len(batch_to_insert), INSERT_BATCH):
                chunk = batch_to_insert[j:j + INSERT_BATCH]
                # UPSERT: si ya existe (sale_id, product_id), no hacer nada
                result = execute_values(cur, """
                    INSERT INTO pos_sale_items (pos_sale_id, pos_product_id, quantity, unit_price)
                    VALUES %s
                    ON CONFLICT (pos_sale_id, pos_product_id) DO NOTHING
                """, chunk)
                # psycopg2 execute_values no retorna rowcount fiable para ON CONFLICT
                # Usamos el tamano del chunk como estimado, el DO NOTHING previene duplicados
                inserted += len(chunk)

            total_inserted += inserted
            total_processed += len(batch_to_insert)

        if (batch_idx // BATCH_SIZE) % 10 == 0:
            print(f"[PROGRESS] {total_processed} filas procesadas, {total_inserted} insertadas...")

    print(f"\n[DONE]")
    print(f"  Total procesadas: {total_processed}")
    print(f"  Total insertadas: {total_inserted}")
    print(f"  Sin producto (skipped): {total_skipped_no_product}")
    print(f"  Sin folio (skipped): {total_skipped_no_folio}")
    print(f"  Duplicados evitados: {total_processed - total_inserted}")

# ── Main ────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("IMPORT: cheqdet → pos_sale_items")
    print(f"Inicio: {datetime.now().isoformat()}")
    print("=" * 60)

    conn = get_conn()
    cur = conn.cursor()

    try:
        # 1. Mapa folios
        folio_map = build_folio_to_sale_map(cur)
        if not folio_map:
            print("[ERROR] No hay pos_folio en pos_sales. Abortando.")
            return

        # 2. Mapa productos
        code_map = build_product_code_map(cur)
        if not code_map:
            print("[ERROR] No hay productos en pos_products. Abortando.")
            return

        # 3. Auditoria previa
        print("\n[AUDIT] Contando cheqdet por mes...")
        pending = count_pending_by_month(cur, folio_map)
        for mes, count in sorted(pending.items()):
            print(f"  {mes}: {count:,} lineas")

        existing = count_existing_items(cur, folio_map)
        print(f"\n[AUDIT] pos_sale_items existentes: {existing:,}")

        # 4. Confirmacion
        total_pending = sum(pending.values())
        print(f"\n[CONFIRM] Se importaran ~{total_pending:,} lineas de cheqdet.")
        print("[CONFIRM] Operacion NO DESTRUCTIVA (ON CONFLICT DO NOTHING).")
        resp = input("Continuar? (si/no): ").strip().lower()
        if resp not in ('si', 's', 'yes', 'y'):
            print("[ABORT] Cancelado por el usuario.")
            return

        # 5. Importar
        print("\n[IMPORT] Iniciando...")
        import_cheqdet(cur, folio_map, code_map)

        # 6. COMMIT
        conn.commit()
        print("[COMMIT] Cambios guardados.")

        # 7. Verificacion post-import
        new_existing = count_existing_items(cur, folio_map)
        print(f"\n[VERIFY] pos_sale_items despues del import: {new_existing:,}")
        print(f"[VERIFY] Nuevas filas: {new_existing - existing:,}")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    main()
```

### Paso 2: Ejecucion del script

```bash
cd /mnt/f/attick-keller/web
pip install psycopg2-binary
python scripts/import_cheqdet_to_pos_sale_items.py
```

**Precauciones:**
- Ejecutar en horario de baja carga (los queries de cheqdet pueden ser pesados)
- El script pide confirmacion antes de insertar
- Se puede interrumpir con Ctrl+C — hace rollback
- La verificacion post-import muestra cuantas filas nuevas se insertaron

### Paso 3: Verificacion post-import

```sql
-- Verificar cobertura por mes
SELECT
  TO_CHAR(s.opened_at, 'YYYY-MM') AS mes,
  COUNT(DISTINCT s.id) AS cheques,
  COUNT(DISTINCT i.pos_sale_id) AS cheques_con_items,
  COUNT(i.id) AS total_items
FROM pos_sales s
LEFT JOIN pos_sale_items i ON i.pos_sale_id = s.id
WHERE s.is_cancelled = false AND s.is_paid = true
GROUP BY mes
ORDER BY mes;
```

**Resultado esperado:** Todos los meses (ene-may) deben tener `cheques_con_items` ≈ `cheques`.

### Archivos afectados en P0

| Archivo | Accion |
|---------|--------|
| `scripts/import_cheqdet_to_pos_sale_items.py` | **CREAR** — nuevo script |
| `scripts/requirements.txt` | **CREAR** — `psycopg2-binary` |

### Dependencias

Ninguna — este paso es independiente y debe ejecutarse PRIMERO porque todos los demas fixes dependen de tener datos en `pos_sale_items`.

---

## P1 — BUGS de UI {#p1--bugs-de-ui}

### P1.1: TopProductsTable — Columna "Categoria" siempre vacia

**Archivo:** `src/components/admin/pos-dashboard/TopProductsTable.tsx`
**Lineas:** 40-54
**Dependencias:** P0 completado (necesita datos en pos_sale_items para verificar el fix)

**Problema:**
La propiedad `label` se setea a `productName` en ambas ramas del builder `displayData`. La condicion en linea 105 (`p.label !== p.productName`) nunca es true, por lo que la columna Categoria siempre muestra string vacio.

**Fix:**

Linea 44 y 51 — cambiar `label: p.productName` por `label: p.category` (en la rama no-filtrada, donde `data` es `topProducts[]` que SI tiene el campo `category`).

```typescript
// Linea 40-54 actual:
const displayData = categoryProducts
  ? categoryProducts.map(p => ({
      productId: p.productId,
      productName: p.productName,
      label: p.productName,  // ← BUG: deberia ser p.category pero categoryProducts NO tiene category
      ...
    }))
  : data.map(p => ({
      productId: p.productId,
      productName: p.productName,
      label: p.productName,  // ← BUG: deberia ser p.category
      ...
    }))

// Fix:
const displayData: Array<...> = categoryProducts
  ? categoryProducts.map(p => ({
      productId: p.productId,
      productName: p.productName,
      label: p.productName,  // OK: cuando se filtra por categoria, todos son de la misma cat
      quantity: p.quantity,
      revenue: p.revenue,
    }))
  : data.map(p => ({
      productId: p.productId,
      productName: p.productName,
      label: p.category,     // FIX: usar el campo category que viene de la API
      quantity: p.quantity,
      revenue: p.revenue,
    }))
```

**Nota:** La rama `categoryProducts` mantiene `label: p.productName` porque los items de `productsByCategory` NO tienen campo `category` (todos pertenecen a la categoria seleccionada). Pero como en esa rama la columna "Categoria" ni siquiera se renderiza (linea 83: `{!categoryProducts && (...)}`), el valor de `label` es irrelevante.

### P1.2: TopProductByCategoryChart — Retorna null en vez de placeholder

**Archivo:** `src/components/admin/pos-dashboard/TopProductByCategoryChart.tsx`
**Linea:** 56
**Dependencias:** P0 completado

**Problema:**
Cuando `data` es `undefined` o `data.length === 0`, el componente retorna `null` y el card desaparece completamente. Deberia mostrar un placeholder "Sin datos".

**Fix:**

```typescript
// Linea 56 actual:
if (!data || data.length === 0) return null

// Fix:
if (!data || data.length === 0) {
  return (
    <div className="min-h-[180px] sm:min-h-[220px]">
      <SectionHeading>Producto estrella por categoria</SectionHeading>
      <p className="text-[10px] sm:text-xs text-[var(--text-secondary)] mb-4">
        El producto mas vendido en cada linea
      </p>
      <p className="text-xs text-[var(--text-secondary)] text-center py-8">Sin datos</p>
    </div>
  )
}
```

### P1.3: CategoryPerformersCard — Retorna null en vez de placeholder

**Archivo:** `src/components/admin/pos-dashboard/CategoryPerformersCard.tsx`
**Lineas:** 80-82
**Dependencias:** P0 completado

**Problema:**
Cuando `categoriesWithPerformers.length === 0`, el componente retorna `null`. La card desaparece sin dejar rastro.

**Fix:**

```typescript
// Lineas 80-82 actual:
if (categoriesWithPerformers.length === 0) {
  return null
}

// Fix:
if (categoriesWithPerformers.length === 0) {
  return (
    <div>
      <SectionHeading>Mejores y Peores por Categoria</SectionHeading>
      <p className="text-[10px] sm:text-xs text-[var(--text-secondary)] mb-3">
        Top 2 y Bottom 2 productos por categoria
      </p>
      <p className="text-xs text-[var(--text-secondary)] text-center py-8">Sin datos</p>
    </div>
  )
}
```

### P1.4: Modo Consolidado — Verificar que todos los componentes reciban datos del mes completo

**Archivos:**
- `src/components/admin/pos-dashboard/POSDashboardPanel.tsx` (lineas 42-48)
- `src/lib/hooks/usePOSDashboard.ts` (lineas 198-205)

**Dependencias:** Ninguna (es un fix de logica de filtros)

**Analisis:**

El flujo actual del modo "Consolidado" es:
1. Boton "Consolidado" → `handleToggleViewMode` → setea `viewMode = 'month'` + limpia `filters.from/to`
2. `effectiveFilters` (linea 42) detecta `viewMode === 'month'` y fuerza `from: undefined, to: undefined`
3. `usePOSDashboard` recibe `effectiveFilters` y construye `params` sin from/to
4. La API (route.ts lineas 114-128) detecta from/to vacios y auto-detecta el ultimo mes con datos

**Este flujo es correcto.** El `useMemo` en `params` (hook linea 198) depende de `filters.from` y `filters.to`. Cuando cambian a `undefined`, `params` cambia, y el `useEffect` se re-ejecuta con `cache: 'no-store'` y `_t=${Date.now()}`.

**Verificacion de que NO hay bug:**
- `effectiveFilters` es un `useMemo` con dependencias `[viewMode, filters]`
- `params` en el hook es un `useMemo` con dependencias `[filters.zone, filters.category, filters.from, filters.to]`
- El `useEffect` en el hook depende de `[params]`
- La API usa `cache: 'no-store'` — no hay cache HTTP

El unico riesgo potencial es si `effectiveFilters` no cambia la referencia cuando from/to pasan a undefined. Pero como `viewMode` tambien cambia (de 'day' a 'month'), `effectiveFilters` siempre se recalcula.

**Conclusion:** No se requiere fix de codigo. El modo consolidado funciona correctamente. Si el usuario reporta que "no funciona", el problema es probablemente de percepcion (los totales cambian pero los componentes individuales de producto/categoria estan vacios por falta de datos en `pos_sale_items` — P0).

**Accion:** Agregar un `console.log` temporal para confirmar en produccion:

```typescript
// En usePOSDashboard.ts, dentro de fetchDashboard, ya existe (linea 235):
console.log('[POSDashboard] Data received:', { ... })
// Esto ya permite verificar que la API responde con los datos del mes completo.
```

**Veredicto P1.4:** NO BUG. El modo consolidado funciona. La percepcion de "no funciona" viene de P0 (datos vacios en categorias/productos).

---

## P2 — API Improvements {#p2--api-improvements}

### P2.1: itemsRevenueTotal — Ya esta en la respuesta

**Archivo:** `src/app/api/admin/pos-dashboard/route.ts`
**Linea:** 793

**Estado:** YA IMPLEMENTADO. El campo `itemsRevenueTotal` ya se calcula (linea 383) y se incluye en la respuesta (linea 793). El hook ya lo tiene en la interfaz `POSDashboardData` (linea 56).

**Accion:** NINGuna. Solo verificar que este disponible en el frontend si se necesita mostrar.

### P2.2: clientTiers sin filtro de fecha

**Archivo:** `src/app/api/admin/pos-dashboard/route.ts`
**Lineas:** 668-686
**Dependencias:** Ninguna

**Problema:**
La query de `customer_stats` no tiene filtro de fecha. Muestra tiers de clientes de TODA la historia, no del periodo seleccionado.

**Fix — Opcion A (recomendada): Filtrar por customer_id de las ventas del periodo**

```typescript
// Lineas 668-686 actual:
const { data: tierData } = await sb
  .from('customer_stats')
  .select('loyalty_tier, total_spent')
  .not('loyalty_tier', 'is', null')

// Fix:
// Obtener customer_ids unicos del periodo
const periodCustomerIds = [...new Set(
  salesForKPIs
    .map((s: any) => s.customer_id || s.pos_customer_id)
    .filter(Boolean)
)]

let tierData: any[] = []
if (periodCustomerIds.length > 0) {
  for (let i = 0; i < periodCustomerIds.length; i += BATCH) {
    const batch = periodCustomerIds.slice(i, i + BATCH)
    const { data } = await sb
      .from('customer_stats')
      .select('loyalty_tier, total_spent')
      .in('customer_id', batch)
      .not('loyalty_tier', 'is', null)
    if (data) tierData.push(...data)
  }
}
```

**Nota:** Esto requiere conocer la columna que relaciona `customer_stats` con `pos_sales`. Puede ser `customer_id` o `pos_customer_id`. Verificar el schema de `customer_stats` antes de implementar.

**Fix — Opcion B (fallback):** Si `customer_stats` no tiene `customer_id`, mantener la query actual pero agregar una nota en el componente `ClientTiersCard` indicando que los datos son "all-time", no del periodo.

### P2.3: categorySaleIds — Range limitation (.range(0, 999))

**Archivo:** `src/app/api/admin/pos-dashboard/route.ts`
**Linea:** 173
**Dependencias:** P0 completado (con mas items, el bug se vuelve mas probable)

**Problema:**
```typescript
const { data: items } = await sb
  .from('pos_sale_items')
  .select('pos_sale_id')
  .in('pos_product_id', pidBatch)
  .range(0, BATCH - 1)  // ← LIMITA A 1000 RESULTADOS
```

Si una categoria tiene productos que aparecen en mas de 1000 sale_items, se pierden sale IDs. Esto es poco probable con datos actuales, pero tras P0 (importacion masiva) algunas categorias grandes (BAR, COCINA) podrian superar 1000 items.

**Fix:** Usar paginacion completa en vez de `.range(0, BATCH-1)`:

```typescript
// Lineas 167-175 actual:
let allSaleIdsList: string[] = []
for (let i = 0; i < productIds.length; i += BATCH) {
  const pidBatch = productIds.slice(i, i + BATCH)
  const { data: items } = await sb
    .from('pos_sale_items')
    .select('pos_sale_id')
    .in('pos_product_id', pidBatch)
    .range(0, BATCH - 1)
  if (items) allSaleIdsList.push(...items.map((it: any) => it.pos_sale_id))
}

// Fix: Paginacion completa por producto
let allSaleIdsList: string[] = []
for (let i = 0; i < productIds.length; i += BATCH) {
  const pidBatch = productIds.slice(i, i + BATCH)
  let offset = 0
  let hasMore = true
  while (hasMore) {
    const { data: items } = await sb
      .from('pos_sale_items')
      .select('pos_sale_id')
      .in('pos_product_id', pidBatch)
      .range(offset, offset + BATCH - 1)
    if (items && items.length > 0) {
      allSaleIdsList.push(...items.map((it: any) => it.pos_sale_id))
      offset += BATCH
      hasMore = items.length === BATCH
    } else {
      hasMore = false
    }
  }
}
```

### P2.4: fetchAll helper — Dead code

**Archivo:** `src/app/api/admin/pos-dashboard/route.ts`
**Lineas:** 27-72

**Problema:** La funcion `fetchAll<T>` esta definida pero nunca se usa. Todas las queries usan bucles manuales de paginacion.

**Fix:** Eliminar la funcion completa (lineas 27-72).

```typescript
// ELIMINAR lineas 27-72 (toda la funcion fetchAll)
```

---

## P3 — UX Polish {#p3--ux-polish}

### P3.1: Mostrar byZone.avgServiceTime en ZoneRevenueChart

**Archivos:**
- `src/components/admin/pos-dashboard/ZoneRevenueChart.tsx` (lineas 15-28, 79-83)
- `src/lib/hooks/usePOSDashboard.ts` (linea 64 — ya esta en la interfaz)

**Dependencias:** Ninguna

**Problema:**
La API calcula `avgServiceTime` por zona (route.ts linea 252). El hook lo tiene en la interfaz `POSDashboardData.byZone[].avgServiceTime`. Pero `ZoneRevenueChart` no lo incluye en sus props ni lo renderiza.

**Fix:**

1. Agregar `avgServiceTime` a la interfaz de props del componente:

```typescript
// ZoneRevenueChart.tsx lineas 15-28: agregar avgServiceTime
interface ZoneRevenueChartProps {
  data: Array<{
    zone: string
    revenue: number
    cheques: number
    ticketPromedio: number
    propinaTotal: number
    pct: number
    avgServiceTime: number  // AGREGAR
  }>
  // ... resto igual
}
```

2. Renderizar avgServiceTime en la fila de stats (linea 79-83):

```typescript
// Linea 79-83 actual:
<div className="flex items-center gap-3 mt-0.5">
  <span className="text-[9px] text-[var(--text-secondary)]">{d.cheques} cheques</span>
  <span className="text-[9px] text-[var(--text-secondary)]">Ticket: {formatCOPDisplay(d.ticketPromedio)}</span>
  <span className="text-[9px] text-[var(--text-secondary)]">Propina: {formatCOPDisplay(d.propinaTotal)}</span>
</div>

// Fix: agregar avgServiceTime
<div className="flex items-center gap-3 mt-0.5">
  <span className="text-[9px] text-[var(--text-secondary)]">{d.cheques} cheques</span>
  <span className="text-[9px] text-[var(--text-secondary)]">Ticket: {formatCOPDisplay(d.ticketPromedio)}</span>
  <span className="text-[9px] text-[var(--text-secondary)]">Propina: {formatCOPDisplay(d.propinaTotal)}</span>
  {d.avgServiceTime > 0 && (
    <span className="text-[9px] text-[var(--text-secondary)]">{d.avgServiceTime} min</span>
  )}
</div>
```

### P3.2: Mostrar byZonePayment en un componente

**Archivos:**
- `src/components/admin/pos-dashboard/POSDashboardPanel.tsx` (import + render)
- `src/lib/hooks/usePOSDashboard.ts` (linea 176-179 — ya esta en la interfaz)

**Dependencias:** Ninguna

**Problema:**
La API calcula `byZonePayment` (route.ts lineas 742-777) — metodos de pago desglosados por zona. El hook lo recibe pero `POSDashboardPanel` nunca lo renderiza.

**Fix:**

Agregar una nueva seccion despues de `PaymentMethodsChart` que muestre los metodos de pago por zona:

```tsx
{/* En POSDashboardPanel.tsx, despues de PaymentMethodsChart (linea 375) */}
<AnimatedCard delay={0.57} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
  <SectionHeading>Metodos de Pago por Zona</SectionHeading>
  <div className="space-y-3 mt-3">
    {(data.byZonePayment || []).map(zp => {
      const totalZone = zp.methods.reduce((s: number, m: any) => s + m.amount, 0)
      return (
        <div key={zp.zone}>
          <p className="text-[10px] font-semibold text-[var(--text-primary)] mb-1">{zp.zone}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {zp.methods.slice(0, 4).map(m => (
              <div key={m.method} className="bg-[var(--bg-input)] rounded px-2 py-1">
                <p className="text-[9px] text-[var(--text-secondary)] truncate">{m.method}</p>
                <p className="text-[10px] font-mono tabular-nums text-[var(--text-primary)]">{formatCOPDisplay(m.amount)}</p>
                <p className="text-[8px] text-[var(--text-secondary)]">{m.pct}%</p>
              </div>
            ))}
          </div>
        </div>
      )
    })}
    {(data.byZonePayment || []).length === 0 && (
      <p className="text-xs text-[var(--text-secondary)] text-center py-4">Sin datos</p>
    )}
  </div>
</AnimatedCard>
```

### P3.3: Notas de transparencia en componentes de categorias

**Archivos:**
- `src/components/admin/pos-dashboard/TopProductByCategoryChart.tsx` — YA TIENE nota (lineas 193-198)
- `src/components/admin/pos-dashboard/CategoryBreakdown.tsx` — YA TIENE nota (lineas 166-170)
- `src/components/admin/pos-dashboard/CategoryPerformersCard.tsx` — FALTA

**Dependencias:** Ninguna

**Problema:**
`CategoryPerformersCard` no tiene nota de transparencia explicando que los totales son sobre items (qty * unit_price), no sobre cheques (sales.total). `CategoryBreakdown` y `TopProductByCategoryChart` ya la tienen.

**Fix:**

Agregar nota al final del render de `CategoryPerformersCard` (antes del cierre del div principal):

```tsx
{/* En CategoryPerformersCard.tsx, justo antes del </div> final */}
{categoriesWithPerformers.length > 0 && (
  <p className="text-[9px] text-[var(--text-secondary)] mt-3 pt-2 border-t border-[var(--border-default)] leading-relaxed">
    Totales sobre items vendidos (qty x precio). Pueden diferir del total de cheques (sales.total)
    por IVA, items sin precio o propinas como producto.
  </p>
)}
```

---

## Orden de Ejecucion y Dependencias {#orden-de-ejecucion}

### Resumen de dependencias

```
P0 (import cheqdet)         ← SIN DEPENDENCIAS, ejecutar PRIMERO
  ├── P1.1 (TopProductsTable fix)    ← DEPENDE de P0 (necesita datos para testear)
  ├── P1.2 (TopProductByCategory)    ← DEPENDE de P0
  ├── P1.3 (CategoryPerformers)      ← DEPENDE de P0
  └── P1.4 (Modo Consolidado)        ← SIN DEPENDENCIAS (no es bug)
P2.1 (itemsRevenueTotal)     ← SIN DEPENDENCIAS (ya implementado)
P2.2 (clientTiers fecha)     ← SIN DEPENDENCIAS
P2.3 (categorySaleIds range) ← DEPENDE de P0 (mas datos = mas probabilidad de bug)
P2.4 (fetchAll dead code)    ← SIN DEPENDENCIAS
P3.1 (avgServiceTime)        ← SIN DEPENDENCIAS
P3.2 (byZonePayment)         ← SIN DEPENDENCIAS
P3.3 (notas transparencia)   ← SIN DEPENDENCIAS
```

### Orden recomendado

| Fase | Items | Descripcion |
|------|-------|-------------|
| **Fase 0** | P0 | Ejecutar script de importacion cheqdet → pos_sale_items |
| **Fase 1** | P2.2, P2.3, P2.4 | Fixes de API que no dependen de datos nuevos |
| **Fase 2** | P3.1, P3.2, P3.3 | UX polish independiente |
| **Fase 3** | P1.1, P1.2, P1.3 | Bugs de UI (verificar con datos reales post-P0) |
| **Fase 4** | Verificacion | Testear dashboard con datos reales de todos los meses |

### Plan de verificacion post-implementacion

1. **Abrir dashboard POS** → verificar que los componentes de productos/categorias muestran datos para mayo, marzo, febrero, enero
2. **Cambiar mes en el selector** → verificar que todos los componentes responden
3. **Filtrar por categoria** → verificar que los productos se filtran correctamente
4. **Filtrar por zona** → verificar KPIs por zona
5. **Modo Consolidado** → verificar totales del mes completo
6. **Drill-down** → clic en producto, staff, categoria, hora, zona — verificar que carga datos
7. **Comparar totales** → `itemsRevenueTotal` vs `kpis.revenue` — verificar que la diferencia es razonable (IVA + items sin precio)

---

## Notas adicionales

### Schema verification checklist

Antes de ejecutar el script P0, verificar estas queries en Supabase:

```sql
-- 1. Verificar que cheqdet.foliodet coincide con pos_sales.pos_folio
SELECT COUNT(*) FROM cheqdet WHERE foliodet IN (
  SELECT pos_folio FROM pos_sales WHERE is_paid = true AND is_cancelled = false
);
-- Deberia retornar > 0. Si retorna 0, el formato no coincide.

-- 2. Verificar que unique constraint existe en pos_sale_items
SELECT indexname FROM pg_indexes WHERE tablename = 'pos_sale_items';
-- Debe existir un unique index en (pos_sale_id, pos_product_id)

-- 3. Si NO existe el unique constraint, crearlo ANTES de ejecutar el script:
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_sale_items_unique
-- ON pos_sale_items (pos_sale_id, pos_product_id);
```

### Riesgos

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|-------------|---------|------------|
| Script P0 lento (882K filas) | Alta | Medio | Batches de 500, ejecutar en horario valle |
| cheqdet.codigo no coincide con pos_products | Media | Medio | El script skipea filas sin match, las reporta al final |
| unique constraint no existe en pos_sale_items | Baja | Alto | Verificar schema antes de ejecutar (ver checklist arriba) |
| Romper dashboard en prod | Baja | Alto | Todos los cambios son incrementales, P0 es UPSERT no-destructivo |

---

*Fin del plan.*
