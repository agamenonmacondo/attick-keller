# A&K — Estado Actual (STATE.md)

> **Actualizado:** 2026-06-04 por Ninja
> **Regla:** Este archivo se actualiza después de cada sesión significativa. Si algo cambia en el sistema, se refleja aquí.

---

## Infraestructura

| Componente | Detalle |
|---|---|
| **Código** | `/mnt/f/attick-keller/web/` — Next.js 15, TypeScript, Tailwind v4 |
| **Base de datos** | Supabase `pbllaipsdfypelnwrvpy` — 42 tablas, 169,699 registros |
| **Hosting** | Vercel — `web-rosy-nine-64.vercel.app` (producción) |
| **POS origen** | SoftRestaurant (SQL Server 2014 Express) en PC del restaurante (192.168.20.99, puerto 64748) |
| **CSVs exportados** | `/mnt/f/attick-keller/softrestaurant-export/Multimes_2026/` |
| **Sync scripts** | `/mnt/f/attick-keller/pos-sync/` — sync_pos.py, health_check.py, etc. |
|| **Dashboard** | POS Dashboard (admin) con tabs: Operación, Referencia Turnos, Costos, Catálogo, Informes Rayo ⚡ |

## Tablas POS (datos actuales al 2026-05-31)

| Tabla | Registros | Estado | Notas |
|---|---|---|---|
| `pos_sales` | 12,002 | ✅ 100% verificado | Enero-Mayo 2026. Revenue total: ~$3,734M |
| `pos_sale_items` | 87,813 | ✅ 100% verificado | Ítems de línea |
| `pos_sale_payments` | 12,396 | ✅ 100% verificado | Pagos |
| `pos_products` | 1,568 | ✅ OK | 860 activos + históricos |
| `pos_product_groups` | 54 | ✅ OK | 31 grupos + 23 subgrupos |
| `pos_areas` | 10 | ✅ OK | 5 zonas mesa + 5 domicilio |
| `pos_staff` | 120 | ✅ OK | 44 activos + históricos |
| `pos_payment_methods` | 32 | ✅ OK | 32 métodos |
| `pos_shifts` | 3,584 | ✅ OK | Turnos de caja |
| `pos_ingredients` | 996 | ⚠️ Sin CSV verificable | Fuente: otra exportación |
| `pos_ingredient_costs` | 996 | ⚠️ Sin CSV verificable | |
| `pos_ingredient_categories` | 21 | ⚠️ Sin CSV verificable | |
| `pos_recipe_warehouses` | 24,059 | ⚠️ 99.88% match | 30 filas menos que CSV |
| `pos_id_mapping` | 2,253 | ✅ OK | Generado en importación |
| `pos_nomina_staff` | 49 | ✅ OK | Fuente externa (no POS) |

## APIs y RPCs

| Endpoint | Estado | Notas |
|---|---|---|
| `/api/admin/pos-dashboard` | ✅ | Paginación corregida (PAGE_SIZE=900, IN_BATCH=200). Cache key con filtros. |
| `/api/admin/sales-averages` | ✅ | Mediana semanal real. Días cerrados excluidos. |
| `/api/admin/pos-calendar` | ✅ | Cache key corregida. |
| `/api/admin/informes-rayo` | ✅ | Fase 1: KPIs + períodos + comparaciones. RPCs existentes. |
| `/api/admin/informes-rayo/analyze` | ✅ | Fase 2: Análisis IA (Groq gpt-oss-120b + fallback reglas). POST con reportData. |
| `rpc/pos_dashboard_kpis` | ✅ | Filtro `is_paid=true` agregado. |
| `rpc/pos_dashboard_daily` | ✅ | Sin cambios. |
| `rpc/pos_dashboard_months` | ✅ | Sin cambios. |
| `rpc/pos_dashboard_by_category` | ✅ | Sin cambios. |

## Bugs conocidos corregidos

| Bug | Commit | Fecha |
|---|---|---|
| Mediana sin días cerrados | `1ff3596` | 2026-05-31 |
| Paginación real en sales-averages | `d921ebf` | 2026-05-31 |
| IDs con espacios en productos | `7c1e2c5` | 2026-05-31 |
| `.in()` truncado con 900 UUIDs | `e12e77e` | 2026-05-31 |
| Cache key sin distinguir filtros | `ff3d1ac` | 2026-05-31 |
| KPIs sin filtro `is_paid` | SQL migration | 2026-05-31 |

## Health Check

| Métrica | Último valor | Umbral |
|---|---|---|
| Frescura datos | 139h (sin sync) | <72h |
| Consistencia sales vs payments | 0.30% | <2% |
| Huérfanos (items sin producto) | 0 | <5% |
| Conteo filas | Sin cambios vs baseline | > -5% |

## Lo que NO está implementado

| Funcionalidad | Estado |
|---|---|
| **Sync horario desde PC restaurante** | Plan detallado, scripts listos. Falta desplegar. |
| **Tab de mesas (revenue por mesa)** | Descartado — los 3,036 códigos requieren normalización masiva. |
| **Staging environment** | No configurado. Deploy directo a prod. |
| **Tests automatizados** | No existen. |
| **Monitoreo de costos en tiempo real** | Pendiente. |
| **App móvil para líderes de zona** | Solo dashboard responsive. |
| **Informes Rayo — IA + PDF** | Fases 1-4 COMPLETAS (KPIs + períodos + IA + Equipo/Junta + PDF). |
