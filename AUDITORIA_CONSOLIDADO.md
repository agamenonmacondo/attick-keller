# Auditoria: Consolidado mensual no propaga a todos los componentes

## Resumen Ejecutivo

Cuando el usuario activa "Consolidado", **el unico componente que muestra datos del mes completo es el calendario (`RevenueHeatmapCalendar`)**, porque usa un hook independiente (`usePOSCalendar`) que siempre devuelve TODOS los meses. Los demas componentes usan `usePOSDashboard` y, aunque la arquitectura del flujo de datos PARECE correcta en papel, **el re-fetch no se dispara de manera confiable** debido a una combinacion de dos bugs sutiles.

---

## 1. Flujo de datos paso a paso

### 1.1 Click en "Consolidado"

```
Usuario clickea "Consolidado"
  → handleToggleViewMode() [POSDashboardPanel.tsx:59]
    → setViewMode(prev => {
        if (prev === 'day') {
          setFilters(f => ({ ...f, from: undefined, to: undefined }))  // ← nested setState
          return 'month'
        }
        return 'day'
      })
```

### 1.2 React 18 procesa el batch

Ambos `setViewMode` y `setFilters` se procesan en UN solo render (React 18 automatic batching):

```
viewMode: 'day' → 'month'
filters:  { ..., from: '2026-05-15', to: '2026-05-15' }
       →  { ..., from: undefined, to: undefined }
```

### 1.3 effectiveFilters recalcula

```typescript
// POSDashboardPanel.tsx:42-47
const effectiveFilters = useMemo<POSDashboardFilters>(() => {
    if (viewMode === 'month') {
      return { ...filters, from: undefined, to: undefined }
    }
    return filters
  }, [viewMode, filters])
```

Resultado: `effectiveFilters = { zone: 'all', category: 'all', from: undefined, to: undefined }`

### 1.4 Hook usePOSDashboard recibe nuevos filters

```typescript
// POSDashboardPanel.tsx:49
const { data, ... } = usePOSDashboard(effectiveFilters)
```

El hook recalcula `params`:
- Antes: `zone=all&category=all&from=2026-05-15&to=2026-05-15`
- Despues: `zone=all&category=all`

### 1.5 API se llama sin from/to

```typescript
// route.ts:66-79
if (!from || !to) {
    // Auto-detecta el ultimo mes con datos
    const latest = new Date(monthData[monthData.length - 1].opened_at)
    from = `${y}-${String(m + 1).padStart(2, '0')}-01`
    to = `${y}-${String(m + 1).padStart(2, '0')}-${lastDay}`
}
```

La API devuelve datos del mes completo. El console.log lo confirma.

### 1.6 Componentes reciben data

Todos los componentes reciben `data` del mismo hook y se renderizan con los nuevos datos:
- `DayKPIBar` ← `data.kpis`
- `ZoneRevenueChart` ← `data.byZone`
- `HourlyRevenueChart` ← `data.hourlyRevenue`
- `TopProductsTable` ← `data.topProducts`
- `CategoryBreakdown` ← `data.topCategories`
- `TopProductByCategoryChart` ← `data.topProductByCategory`
- `CategoryPerformersCard` ← `data.topPerformersByCategory` + `data.bottomPerformersByCategory`
- `CategoryCompanionsCard` ← `data.categoryCompanions`
- `StaffPerformanceTable` ← `data.staffPerformance`
- `PaymentMethodsChart` ← `data.paymentMethods`
- `ClientTiersCard` ← `data.clientTiers`
- `ClientSplitCard` ← `data.clientSplit`
- `ShiftReconciliation` ← `data.shifts`

---

## 2. Componente por componente: cual recibe data del hook y cual no

| Componente | Fuente de datos | Recibe data del hook? | Muestra mes completo? |
|---|---|---|---|
| `RevenueHeatmapCalendar` | `usePOSCalendar(filters.zone)` — **hook SEPARADO** | NO | SI (siempre muestra todos los meses) |
| `DayKPIBar` | `data.kpis` from `usePOSDashboard` | SI | **NO** (ver bugs abajo) |
| `ZoneRevenueChart` | `data.byZone` | SI | **NO** |
| `HourlyRevenueChart` | `data.hourlyRevenue` | SI | **NO** |
| `TopProductsTable` | `data.topProducts` | SI | **NO** |
| `CategoryBreakdown` | `data.topCategories` | SI | **NO** |
| `TopProductByCategoryChart` | `data.topProductByCategory` | SI | **NO** |
| `CategoryPerformersCard` | `data.topPerformersByCategory` + `bottom` | SI | **NO** |
| `CategoryCompanionsCard` | `data.categoryCompanions` | SI | **NO** |
| `StaffPerformanceTable` | `data.staffPerformance` | SI | **NO** |
| `PaymentMethodsChart` | `data.paymentMethods` | SI | **NO** |
| `ClientTiersCard` | `data.clientTiers` | SI | **NO** |
| `ClientSplitCard` | `data.clientSplit` | SI | **NO** |
| `ShiftReconciliation` | `data.shifts` | SI | **NO** |
| `DayPerformanceCard` | `data.kpis`, `data.byZone`, etc. | SI | OCULTO (condicion `isSingleDay && viewMode === 'day'`) |

**Hallazgo clave**: El calendario es el UNICO componente que NO usa `usePOSDashboard`. Usa `usePOSCalendar` que:
- Solo depende de `zone` (no de `from`/`to`)
- Hace fetch a `/api/admin/pos-calendar` (otro endpoint)
- Siempre devuelve TODOS los meses con datos

Esto explica por que el calendario "funciona" en modo consolidado: **siempre estuvo mostrando todos los meses**, incluso en modo dia.

---

## 3. Causa raiz exacta del bug

Son **DOS bugs simultaneos** que conspiran para que solo el calendario parezca funcionar:

### BUG #1 (CRITICO): `setFilters` dentro de `setViewMode` updater — render intermedio fantasma

```typescript
// POSDashboardPanel.tsx:59-68
const handleToggleViewMode = useCallback(() => {
    setViewMode(prev => {
      if (prev === 'day') {
        setFilters(f => ({ ...f, from: undefined, to: undefined }))  // ← SETSTATE DENTRO DE SETSTATE
        return 'month'
      }
      return 'day'
    })
  }, [])
```

**El problema**: En React 18, `setViewMode` y `setFilters` se batenchean a UN render. Pero el updater de `setViewMode` se ejecuta sincronicamente con el valor `prev` del estado ACTUAL. Dentro de ese updater se llama `setFilters`.

Aunque React 18 lo batenchea correctamente en la mayoria de casos, este patron es inherentemente fragil porque:

1. El updater de `setViewMode` captura `prev` sincronicamente
2. Dentro del updater, `setFilters` se ejecuta como un side-effect sincrono
3. React 18 garantiza que ambos updates se apliquen en el mismo render, PERO no garantiza el orden en que los hooks derivados (`useMemo`, `useEffect`) procesan los cambios

**Escenario de fallo**: Si React procesa el cambio de `filters` ANTES que el cambio de `viewMode` durante la reconciliacion:
- `effectiveFilters` se recalcula con `viewMode` antiguo ('day') y `filters` nuevo (from/to = undefined)
- `effectiveFilters` = `filters` (porque viewMode === 'day', no se aplica el override)
- `effectiveFilters` = `{ zone: 'all', category: 'all', from: undefined, to: undefined }`
- `params` = `zone=all&category=all`
- El efecto se dispara... **exactamente igual que en el caso correcto**

En realidad, como ambos caminos producen `from: undefined, to: undefined`, este bug POR SI SOLO no explica el problema.

### BUG #2 (RAIZ REAL): `usePOSDashboard` NO limpia `data` antes del re-fetch + el hook mantiene el state viejo durante la carga

```typescript
// usePOSDashboard.ts:218-252
async function fetchDashboard() {
    setLoading(true)       // ← loading = true
    setError(null)
    // ⚠️ NO LLAMA A setData(null) — data mantiene el valor ANTERIOR
    try {
        const res = await fetch(...)
        const d = await res.json()
        if (!cancelled) {
          setData(d)        // ← solo actualiza cuando la respuesta llega
          setError(null)
        }
    } catch (err) { ... }
    finally {
        if (!cancelled) setLoading(false)
    }
}
```

**El problema real**: El hook NUNCA resetea `data` a `null` (o a un valor "stale") antes de hacer el fetch. Esto significa:

1. Cuando `params` cambia y el efecto se dispara, `data` mantiene su valor anterior (datos del dia)
2. `loading` se pone en `true`, pero el spinner SOLO se muestra si `loading && !data` (linea 230 del panel)
3. Como `data` NO es null, **el spinner NO se muestra y los componentes siguen renderizando con datos viejos**
4. Cuando la API responde con datos del mes, `setData(d)` actualiza el estado
5. Los componentes se re-renderizan con los nuevos datos

**PERO** hay un escenario donde esto falla catastroficamente:

### BUG #3 (DETONADOR): El `usePOSCalendar` dispara `handleDayClick` en su navegacion

```typescript
// RevenueHeatmapCalendar.tsx:177-189
const handlePrevMonth = () => {
    ...
    onDayClick(`${monthStr}-01`)  // ← LLAMA A handleDayClick del padre!
}
const handleNextMonth = () => {
    ...
    onDayClick(`${monthStr}-01`)  // ← LLAMA A handleDayClick del padre!
}
const handleToday = () => {
    ...
    onDayClick(today)             // ← LLAMA A handleDayClick del padre!
}
```

Y `handleDayClick` en el padre:
```typescript
// POSDashboardPanel.tsx:106-110
const handleDayClick = useCallback((date: string) => {
    setViewMode('day')                                    // ← VUELVE A MODO DIA
    setFilters(prev => ({ ...prev, from: date, to: date })) // ← SETEA FECHA ESPECIFICA
}, [])
```

**Escenario de fallo completo**:

1. Usuario selecciona un dia (ej. 2026-05-15). Datos del dia se muestran.
2. Usuario clickea "Consolidado".
3. `handleToggleViewMode` se ejecuta. `viewMode = 'month'`, `filters.from/to = undefined`.
4. `usePOSDashboard` re-fetch con mes completo. Mientras tanto, `data` mantiene los datos del dia 15 (Bug #2).
5. Los componentes muestran datos del dia 15 (data vieja en el state del hook).
6. El calendario muestra todos los meses (siempre los mostro, usa `usePOSCalendar`).
7. El usuario ve el calendario con todos los meses, asume que "Consolidado" funciona, pero los KPIs abajo todavia muestran datos del dia 15.
8. La API eventualmente responde con datos del mes. `setData(d)` actualiza el state.
9. **PERO SI EL USUARIO INTERACTUA CON EL CALENDARIO ANTES DE QUE LLEGUE LA RESPUESTA** (ej. navega a otro mes), el `handleDayClick`:
   - Pone `viewMode = 'day'`
   - Pone `filters.from/to = fecha`
   - Esto dispara OTRO re-fetch con los nuevos filtros
   - El fetch del mes se aborta (AbortController)
   - Los datos del mes NUNCA se muestran

10. Incluso SIN interaccion del usuario, existe una condicion de carrera: si el fetch del mes tarda mas de lo esperado, el `_t=${Date.now()}` cache-buster no ayuda porque el problema es de state timing.

---

## 4. Fix propuesto

### Fix #1 (CRITICO): Resetear `data` al iniciar fetch

```typescript
// usePOSDashboard.ts — dentro de fetchDashboard()
async function fetchDashboard() {
    setLoading(true)
    setError(null)
    setData(null)  // ← AGREGAR: fuerza a los componentes a mostrar spinner/estado vacio
    try {
        ...
    }
}
```

Esto garantiza que:
- El spinner se muestre (`loading && !data`)
- Los componentes NO muestren datos viejos durante la transicion
- No haya confusion visual entre datos del dia y datos del mes

### Fix #2 (IMPORTANTE): Simplificar `handleToggleViewMode` — NO anidar setState

```typescript
// POSDashboardPanel.tsx — version corregida
const handleToggleViewMode = useCallback(() => {
    if (viewMode === 'day') {
      // Ir a modo consolidado: limpiar fechas Y cambiar modo en UN solo batch predecible
      setFilters(f => ({ ...f, from: undefined, to: undefined }))
      setViewMode('month')
    } else {
      // Volver a modo dia: restaurar al ultimo mes con datos (sin fecha especifica)
      setViewMode('day')
      // No tocamos from/to — la API auto-detectara el ultimo mes
    }
  }, [viewMode])  // ← Agregar viewMode como dependencia
```

**Por que es mejor**: Dos llamadas `setState` separadas al mismo nivel, en vez de una dentro de la otra. React 18 batenchea ambas a un solo render de forma predecible.

### Fix #3 (RECOMENDADO): No llamar a `onDayClick` en navegacion del calendario

```typescript
// RevenueHeatmapCalendar.tsx — version corregida
const handlePrevMonth = () => {
    const d = new Date(vy, vm - 1, 1)
    const monthStr = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
    onMonthChange?.(monthStr)
    // ELIMINAR: onDayClick(`${monthStr}-01`)
    // La navegacion del calendario NO debe cambiar el filtro de fecha
    // Solo debe cambiar el mes VISUALIZADO en el calendario
}
const handleNextMonth = () => {
    const d = new Date(vy, vm + 1, 1)
    const monthStr = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
    onMonthChange?.(monthStr)
    // ELIMINAR: onDayClick(`${monthStr}-01`)
}
const handleToday = () => {
    onMonthChange?.(today.substring(0, 7))
    // ELIMINAR: onDayClick(today)
    // "Hoy" solo deberia navegar el calendario al mes actual, no cambiar filtros
}
```

Esto evita que la navegacion del calendario resetee el filtro de fecha y saque al usuario del modo consolidado sin querer.

### Fix #4 (MENOR): Pasar `effectiveFilters` a `POSFiltersBar` en vez de `filters`

```typescript
// POSDashboardPanel.tsx:219-225 — version corregida
<POSFiltersBar
    filters={effectiveFilters}  // ← Usar effectiveFilters, no filters
    onChange={handleFilterChange}
    categoryList={data?.categoryList || []}
    zoneList={zoneListForFilter}
    availableMonths={calendarMonths}
/>
```

Esto asegura que el month selector refleje el estado REAL de los filtros (sin from/to en modo consolidado), en vez de mostrar un valor inconsistente.

### Fix #5 (MENOR): Agregar indicador visual de "cargando datos del mes"

Cuando `loading === true` y `data !== null` (datos viejos en pantalla), mostrar un overlay semi-transparente o un spinner pequeño sobre los componentes para indicar que los datos se estan actualizando.

---

## 5. Diagnostico diferencial: Que NO es el problema

Despues de revisar todos los componentes, se descartan estas hipotesis:

- **State local cacheado**: Ningun componente almacena `data` en state local. Todos reciben datos por props.
- **Filtro de fecha en el componente**: Ningun componente aplica su propio filtro de fecha. El filtrado se hace 100% en la API.
- **React.memo bloqueando re-renders**: Ningun componente usa `React.memo`.
- **API devolviendo datos incorrectos**: El console.log confirma que la API responde con datos del mes cuando from/to estan vacios.
- **usePOSCalendar con datos incorrectos**: El calendario siempre muestra todos los meses, lo cual es correcto pero enmascara el problema real.
