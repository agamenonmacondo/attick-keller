# POS Sync — Documentación Operativa

## Resumen

Pipeline que sincroniza datos del POS (SoftRestaurant, SQL Server) a Supabase para consumirlos desde la web A&K. Corre automáticamente cada hora (3pm–3am) vía Task Scheduler en Windows.

## Arquitectura

```
SQL Server (localhost,64748)          Supabase REST API              Vercel (Next.js)
softrestaurant11                       pbllaipsdfypelnwrvpy           web-rosy-nine-64.vercel.app
        │                                       │                              │
        └──► sync.py (Python 3.12) ──────────►──┘                              │
             C:\pos-sync\                                                     │
             Task Scheduler                                                   └──► pos_dashboard_kpis (RPC)
             cada hora 3pm-3am                                                       calcula KPIs server-side
```

## Servidor

- **Ruta**: `C:\pos-sync\`
- **Python**: `C:\Users\USUARIO\AppData\Local\Programs\Python\Python312\`
- **Venv**: `C:\pos-sync\venv\`
- **SQL Server**: `localhost,64748`, DB `softrestaurant11`, `Trusted_Connection=yes` (Windows Auth)
- **Task Scheduler**: `AandK_POS_Sync`, 13 triggers cada hora (15:00–03:00), ejecuta `full_sync.bat`
- **Log**: `C:\pos-sync\sync_hourly.log`

## Modo de ejecución

```powershell
python sync.py          # Sync incremental (~2-3 min)
                        # - Ventas nuevas + items + pagos
                        # - Catálogos (upsert)
                        # - Costos (upsert merge)
                        # - Purchases: últimas 48 horas

python sync.py --full   # Sync completo (~5-10 min)
                        # - Todo lo anterior
                        # - Purchases: TODAS las compras
```

## Tablas sincronizadas

### Ventas (incremental con solape 2 días)
| Tabla Supabase | Tabla SQL Server | Modo | Notas |
|---|---|---|---|
| `pos_sales` | cheques | upsert (merge) | unique: restaurant_id + pos_folio |
| `pos_sale_items` | chequesdet | insert solo ventas nuevas | NO tiene unique constraint |
| `pos_sale_payments` | chequespagos | insert solo ventas nuevas | NO tiene unique constraint |

### Catálogos (siempre, upsert ligero)
| Tabla Supabase | Tabla SQL Server | Filas |
|---|---|---|
| `pos_areas` | areasrestaurant | 10 |
| `pos_staff` | meseros | 44 |
| `pos_payment_methods` | formasdepago | 32 |
| `pos_product_groups` | grupos | 31 |
| `pos_products` | productos | 862 |
| `pos_shifts` | turnos | 3,365 |

### Costos (siempre, upsert merge)
| Tabla Supabase | Tabla SQL Server | Filas | Notas |
|---|---|---|---|
| `pos_ingredient_categories` | categoriasinsumos | 21 | |
| `pos_warehouses` | almacenes | 6 | |
| `pos_ingredients` | insumos | 996 | |
| `pos_ingredient_costs` | costoinsumo | 996 | |
| `pos_product_prices` | precios | 862 | |
| `pos_product_recipes` | recetas | 2,270 | |
| `pos_composite_ingredients` | insumoscompuestos | 1,619 | |
| `pos_suppliers` | proveedores | 180 | |
| `pos_purchases` | compras | 15+ | Incremental 2 días sin --full |
| `pos_purchase_items` | comprasdet | 61+ | Incremental 2 días sin --full |
| `pos_stock_thresholds` | stockinsumos | 16 | Deduplicado (17→16) |
| `pos_recipe_warehouses` | recetasalmacenes | 24,059 | Deduplicado (24,089→24,059) |

## Unique constraints en Supabase

- `pos_sales`: `(restaurant_id, pos_folio)`
- `pos_recipe_warehouses`: `(restaurant_id, pos_product_id, pos_ingredient_id, pos_warehouse_id, pos_area_id)`
- `pos_purchase_items`: `(restaurant_id, pos_purchase_id, pos_ingredient_id)`
- `pos_stock_thresholds`: `(restaurant_id, pos_ingredient_id, pos_warehouse_id, pos_company_id)`
- `pos_sale_items` y `pos_sale_payments`: **NO** tienen unique constraint — solo insert para ventas nuevas

## Reglas de upsert PostgREST

- Header: `Prefer: return=representation,resolution=merge-duplicates`
- Query param: `?on_conflict=restaurant_id,pos_folio` (o las columnas que correspondan)
- Si resolution va como query param en vez de header → error 400 PGRST100

## KPIs — NO se calculan en el sync

La página usa `pos_dashboard_kpis` (RPC de Supabase) que calcula todo server-side con SQL. El sync NO pre-calcula KPIs — eso quitaba ~15 minutos por corrida y era completamente redundante.

## Pitfalls documentados

### Encoding cp1252 en Windows
Python en Windows usa cp1252 por defecto en consola. Caracteres Unicode como `→` (U+2192) crashean el `print()`. Solución: `log()` atrapa `UnicodeEncodeError` y reemplaza con ASCII. Nunca usar caracteres Unicode en log().

### Duplicados en SQL Server
Tablas como `stockinsumos` y `recetasalmacenes` tienen filas duplicadas con la misma clave compuesta. PostgREST rechaza batches con duplicados (`"ON CONFLICT DO UPDATE command cannot affect row a second time"`). Solución: deduplicar con dict `seen` antes de upsertar.

### pyodbc + BETWEEN con parámetros
Pasar strings a parámetros `?` en `WHERE foliodet BETWEEN ? AND ?` causa conversión implícita que trunca resultados. Solución: interpolar ints directamente con f-string.

### Hooks React condicionales
NUNCA poner hooks después de un `return` condicional. Causa pantalla negra en producción. Ver skill `attick-keller` references.

### Timezone Colombia (UTC-5)
`Date.UTC()` + `.getDate()` = off-by-one. Usar constructor local `new Date(y,m,d)` y `getLocalDate()` de `formatDate.ts`.

### CSS Light theme A&K
`--text-primary` y `--color-ak-madera` son ambos `#3E2723` en light theme. Text sobre bg madera DEBE usar `--color-ak-dorado` (`#C9A94E`).

## Historial de cambios

| Fecha | Commit | Cambio |
|---|---|---|
| 2026-06-03 | 449158f | Fix calendario turnos UTC vs hora local |
| 2026-06-03 | 3853169 | Unique constraints en Supabase (recipe_warehouses, purchase_items, stock_thresholds) |
| 2026-06-03 | f9beb7b | Costos siempre se sincronizan (sin --full) |
| 2026-06-03 | de79101 | Badge Admin visible en light theme (dorado) |
| 2026-06-03 | dbc44e2 | Fix encoding cp1252 + deduplicar stock_thresholds |
| 2026-06-03 | 7406b63 | Eliminar KPIs del sync (RPC los calcula), deduplicar stock_thresholds, fix encoding |

## Verificación

Script en servidor: `C:\pos-sync\verificar_ventas_hoy.py`
- Compara ventas SQL Server vs Supabase
- Usa `Trusted_Connection=yes` (no UID/PWD)
- Última verificación: 3 junio 20:12, 12 ventas = 12 ventas, $2,043,960 idéntico

## Estructura de archivos en servidor

```
C:\pos-sync\
  sync.py              ← siempre copiar desde F:\attick-keller\pos-sync\sync.py
  config.env           ← SUPABASE_URL, SUPABASE_SERVICE_KEY, SQL_SERVER, etc.
  sync_hourly.log      ← log de cada corrida
  full_sync.bat         ← `python sync.py` (sin --full)
  quick_sync.bat        ← `python sync.py` (sin --full) [alias]
  setup_scheduler.ps1   ← crea tarea AandK_POS_Sync en Task Scheduler
  venv\                ← Python 3.12 virtualenv
  verificar_ventas_hoy.py ← script de verificación
```

## Monitoreo

```powershell
# Ver últimas 30 líneas del log
Get-Content C:\pos-sync\sync_hourly.log -Tail 30

# Verificar estado del scheduler
schtasks /Query /TN "AandK_POS_Sync" /V /FO LIST

# Correr sync manual
cd C:\pos-sync && venv\Scripts\python.exe sync.py

# Verificar ventas de hoy
cd C:\pos-sync && venv\Scripts\python.exe verificar_ventas_hoy.py
```