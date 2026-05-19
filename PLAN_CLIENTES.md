# Plan de Mejoras — Panel de Clientes + Mapa de Calor

## Problema 1: Mapa de calor muestra solo 6 mesas (debería ser 210)

### Diagnóstico
La API `/api/admin/occupancy` trae **todas** las mesas activas (210) y las agrupa por zonas.
La API `/api/admin/dashboard` trae las mesas y calcula ocupación.

El problema NO está en la API (trae todas las mesas). El problema está en **cómo se renderiza la TableMap** — posiblemente:
1. Solo se muestran las mesas de zonas que tienen reservas
2. Filtro visual que oculta mesas "libres" sin reservas
3. El hook `useAdminOccupancy` filtra algo
4. Las zonas están limitadas o mal configuradas en la DB

### Solución
- Verificar en browser cuántas zonas y mesas trae la API
- Si las zonas están bien, la TableMap ya las muestra (el grid `grid-cols-8` debería mostrar 210+ cards)
- Posible problema: `PeakHoursChart` confundido con `TableMap` — Alejandro dice "mapa de calor" pero puede referirse al gráfico de picos horarios (PeakHoursChart)

---

## Problema 2: Panel de lista de clientes — Mejoras para 20K+ registros

### Diagnóstico actual (13 problemas identificados)

#### 🔴 Crítico (3)
1. **SQL Injection en ILIKE** — Búsqueda de clientes no sanitiza `%` y `'`
2. **Sin AbortController en useCustomers** — Race conditions al cambiar de página rápido
3. **Sin AbortController en useCustomerDetail** — Detalle muestra datos de cliente anterior

#### 🟡 UX (5)
4. **Paginación primitiva** — Solo ◀▶, sin números de página directos
5. **Card incompleta** — No muestra `total_spent` ni badge "Recurrente"
6. **Sin botón "Nuevo cliente"** — Ya existe el modal pero podría mejorarse
7. **TierBadge no mapea inglés** — `bronze`/`silver`/`gold` se muestran como "Nuevo"
8. **Filtros no persisten en URL** — Se pierden al recargar

#### 🔵 Técnico (5)
9. **Sorting client-side** — Los resultados se ordenan en JS, no en DB
10. **useCustomerDetail sin cancelación** — Race condition en detalle
11. **N+1 queries** — 3 queries separadas (customers, stats, tags) sin joins
12. **Filter desync** — `CustomerFilters` puede desincronizarse con estado global
13. **Tipado suelto** — `CustomerRow` tiene `[key: string]: unknown`

---

## Plan de implementación (orden de prioridad)

### Fase 1: Fixes críticos (30 min)
- [ ] 1.1 Sanitizar ILIKE en `/api/admin/customers/route.ts`
- [ ] 1.2 AbortController en `useCustomers.ts`
- [ ] 1.3 AbortController en `useCustomerDetail.ts`

### Fase 2: UX mejoras (45 min)
- [ ] 2.1 Paginación con números + ellipsis (1 ... 4 5 6 ... 20)
- [ ] 2.2 Card: mostrar `total_spent` y badge "Recurrente" (is_recurring)
- [ ] 2.3 TierBadge: mapear bronze/silver/gold inglés
- [ ] 2.4 Sort/order selector visible en filtros

### Fase 3: Performance para 20K+ (60 min)
- [ ] 3.1 Server-side sorting (pasar `sort`/`order` a PostgREST)
- [ ] 3.2 Debounce en búsqueda (300ms)
- [ ] 3.3 Cursor-based pagination (en vez de offset para 20K+)
- [ ] 3.4 Query consolidación (stats + tags en una sola query con joins)

### Fase 4: Extras (30 min)
- [ ] 4.1 Botón "Nuevo cliente" (ya existe, verificar que funciona post-merge)
- [ ] 4.2 Filtros persisten en URL searchParams
- [ ] 4.3 Tipado estricto para CustomerRow

---

## Mapa de calor — Acción inmediata

Verificar primero si el problema es:
**A)** PeakHoursChart (gráfico de barra horaria) → revisar métricas/escalas
**B)** TableMap (grid de mesas por zona) → revisar cuántas zonas/mesas trae la API
**C)** OccupancyGauge (circulito de % ocupación) → revisar que `totalCapacity` sea correcto

Posibles causas de "solo 6 mesas":
- Solo hay 6 zonas y cada una muestra 1 mesa representativa
- La vista está truncando por CSS (overflow hidden)
- `zones` viene con solo 1-2 zonas del API
- Hay un bug en el merge que alteró el hook