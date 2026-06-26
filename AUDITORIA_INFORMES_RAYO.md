# Auditoría — Panel Informes Rayo + Modelo Semántico

Fecha: 2026-06-22 · Basado en lectura del código real (`src/components/admin/informes/`, `src/app/api/admin/informes-rayo/`, `SEMANTIC_MODEL_*.sql/.md`).

---

## 0. Hallazgo de raíz (leer primero)

Existe una **discrepancia documental vs. realidad** que es la causa raíz de casi todos los problemas:

- `SEMANTIC_MODEL_VIEWS.sql` y `SEMANTIC_MODEL_TASK.md` declaran que las **7 views tienen columna `fecha`**.
- La BD real **solo tiene `fecha` en 2** (`v_nomina_vs_ventas`, `v_reservas_vs_ventas`). Las otras 5 usan `dia_semana` (int 0‑6), `hora` (int 0‑23) o `semana` (string `"2026-W26"`).
- Confirmado por commits recientes: `fix: corregir tipos de columnas - dia es int (0-6), no fecha string` y `fix: v_productividad_area usa dia_semana (int) no fecha — corregir API route`.
- Las API routes fueron “corregidas” **eliminando el filtro por fecha** (porque la columna no existe) → ahora devuelven TODAS las filas históricas sin importar el período seleccionado.

**Consecuencia:** 5 de 7 componentes del Modelo Semántico muestran **promedios/totales históricos**, no “qué pasó en este período”. El selector de período (Hoy / Esta Semana / etc.) es cosmético para ellos.

Los nombres de campos en la doc (`nombre`, `costo_extra`, `recargo_nocturno`, `revenue`, `horas_turno`, `costo_turnos`, `ventas_total`, `total_pax`, `evento_grande`, `personas_en_turno`) **tampoco coinciden** con los que lee el código (`empleado_nombre`, `costo_he`, `recargo_35pct`, `revenue_del_area`, `horas_trabajadas`, `costo_nomina`, `total_ventas`, `total_pax_reservado`, `num_reservas`, `revenue_dia`, `personas_trabajando`). El código se adaptó a las columnas reales; la doc miente. **Corregir la doc es prerequisito** para cualquier reescritura limpia.

---

## 1. Diagnóstico por componente

### Panel orquestador — `InformesRayoPanel.tsx`
- **Estado:** Funciona. Presets, custom, compare mode, label de período, fetch inicial + refetch on change.
- **Problemas concretos:**
  1. `zone` se declara (`useState('all')`) y se pasa a `fetchReport`/`fetchProductos`, pero **no hay UI para cambiarlo** — `setZone` nunca se invoca con otro valor. El filtro de zona está **muerto** en este panel (siempre `'all'`).
  2. `PeriodSelector.tsx` (que sí trae dropdown de zona) **no se importa en ningún lado** — código muerto duplicado. El panel reimplementa su propio selector inline (sin zona).
  3. “Resumen para Junta” (líneas 349‑391) **duplica** los KPIs que ya muestra `MetricasClave`. Misma info, segundo layout.
- **Veredicto:** Conservar. Arreglar zona (conectar UI o eliminar el estado). Eliminar `PeriodSelector.tsx` o usarlo. Quitar/colapsar “Resumen para Junta”.

### `MetricasClave.tsx`
- **Estado:** Correcto. 10 KPIs del período, con delta vs. período anterior. Datos vienen de RPCs que sí filtran por fecha.
- **Problemas menores:**
  - `formatCOP` propio (`$871M` / `$1.2K`) **distinto** al `Intl.NumberFormat('es-CO', COP)` que usan los componentes semánticos (`$1.234.567`). Dos formatos de moneda en el mismo panel → inconsistencia visual.
  - “Ticket Prom.” calcula delta contra `compRevenue/compCheques` aunque ese no sea el ticket del período anterior (es revenue/cheques, no ticket_promedio real) — delta aproximado.
- **Veredicto:** Conservar. Unificar formateador de moneda a un helper compartido.

### `RentabilidadPanel.tsx`
- **Estado:** Correcto y sólido. Márgenes por categoría, “lo que drena / importa”, semáforo meta 30%, KPIs vitales, resumen para junta. Usa `useProductMargins(from,to,…)` que sí filtra por fecha.
- **Problemas menores:** Doble “para la junta” (este + el del panel). Semáforo `meta-5` hardcoded podría parametrizarse.
- **Veredicto:** Conservar. Es el componente más completo y confiable.

### `InformesDashboard.tsx`
- **Estado:** Correcto. Top productos, métodos de pago (donut), tabla por zona. Datos de RPCs filtrados por fecha.
- **Veredicto:** Conservar.

### `ProductoDesgloseTable.tsx`
- **Estado:** Correcto. Heatmap producto×hora/día, toggle revenue/qty, sort, export CSV. Datos de `useProductoHourly` filtrados por fecha.
- **Veredicto:** Conservar.

### `NominaRatioCard.tsx` ✅ (view correcta)
- **Estado:** La view filtra por `fecha` ✅. Pero el componente **ignora el `summary`** (que tiene el agregado del período) y en su lugar hace `rows.find(r => total_ventas>0) ?? rows[0]` → muestra el ratio de **un solo día** (el más reciente con ventas), no el del período.
- **Problema:** Para un período “Esta Semana”, la card dice “18%” que es el ratio del viernes, no el de la semana. El `summary` (nomina_total/ventas_total) se calcula en la API pero se descarta.
- **Veredicto:** Conservar. **Modificar:** usar `summary` para mostrar ratio del período (o mostrar “último día” etiquetado explícitamente como tal). Semáforo <15/15‑20/>20 es razonable para restaurante.

### `OperacionHoraChart.tsx` ❌ (view rota)
- **Estado:** API no filtra por fecha → 168 rows (24h × 7 días). El componente agrega `revenue +=` por hora → **suma todos los viernes/sábados históricos**. El “$871M a las 19:00” es histórico acumulado, no del período.
- **Problemas:**
  1. Revenue inflado (suma de todas las semanas).
  2. `estado` (PICO/GAP/SOBRANDO) se sobreescribe por hora con “last write wins” entre 7 días mezclados → el color del semáforo no corresponde a ningún día real.
  3. `personas_trabajando` también suma históricamente → barra de personal sin sentido.
- **Veredicto:** Reescribir view (necesita `fecha`) + ajustar componente.

### `RecargosNominaGrid.tsx` ❌ (2 views rotas)
- **Estado:** Combina `v_horas_extra` + `v_horas_nocturnas`. Ambas APIs devuelven **todas las filas** (sin filtro de fecha). El componente mergea por `empleado_nombre` sumando **5 semanas mezcladas** → totales de HE/recargos infladísimos, sin relación con el período.
- **Problema:** Un “Esta Semana” muestra HE acumuladas de 5 semanas. Engañoso.
- **Veredicto:** Reescribir ambas views (necesitan `fecha`) + componente (hoy是对的, solo le faltan datos del período).

### `GapsCoberturaAlerts.tsx` ❌ (view rota)
- **Estado:** API filtra `tipo_alerta != 'NORMAL'` pero **sin fecha** → 24 rows (patrón promedio por hora). El componente los muestra como “alertas” con `Hora X:00` pero **no hay `fecha`** → no se sabe qué día pasó el gap. Son un patrón promedio disfrazado de alertas concretas.
- **Problemas:**
  1. Sin `fecha` no es una “alerta” operacional, es un “patrón típico”.
  2. `areas_afectadas` del summary se mapea de `r.area` pero las cards no muestran área (solo hora/personas/revenue) → info parcial.
  3. `r.revenue_por_persona` se muestra sin contexto de fecha.
- **Veredicto:** Reescribir view (necesita `fecha` + `area`) + componente (mostrar fecha/área, no solo hora).

### `ProductividadAreaRadar.tsx` ❌ (view rota, a pesar del nombre no es radar)
- **Estado:** API no filtra por fecha → 13 rows (área × dia_semana). API y componente agregan por área → **ROI = revenue histórico / costo histórico** por área, no del período.
- **Problemas:**
  1. ROI/rev‑por‑hora son totales históricos, no del período seleccionado.
  2. El nombre dice “Radar” pero es una **tabla**. No hay gráfico radar.
  3. ROI = revenue/costo_nómina >1 se vende como “rentable” pero revenue ≠ utilidad (ignora costo de comida). El tooltip aclara “cuánto genera cada peso en personal”, OK como framing, pero el semáforo rojo “<1 = pérdida” es impreciso (es pérdida sobre nómina, no operacional).
- **Veredicto:** Reescribir view (necesita `fecha`) + renombrar a tabla + aclarar semáforo.

### `ReservasConversionTable.tsx` ✅ (view correcta)
- **Estado:** API filtra por `fecha` ✅. Componente muestra filas por fecha, destacando eventos ≥15 pax, con $/persona. Funciona.
- **Veredicto:** Conservar tal cual.

### `useSemanticModel.ts` (hook)
- **Problemas:**
  1. `fetchingRef` bloquea refetch si hay una petición en vuelo → al cambiar de período mientras carga, el fetch del nuevo período se **cae silenciosamente** y queda data stale.
  2. Solo captura `firstError` (primera falla); las demás endpoints fallidas quedan en null sin reportar cuáles.
  3. No pasa `compareFrom/compareTo` → ningún componente semántico tiene comparación vs período anterior (el panel principal sí la tiene). Falta de contexto: “ratio 18%… ¿comparado con qué?”.
- **Veredicto:** Conservar. Arreglar guard, reportar errores parciales, opcionalmente pasar compare.

---

## 2. Views a reescribir (dimensión temporal correcta)

Las 5 views deben **agregar `fecha` (date)** como columna de agrupación, además de mantener `dia_semana`/`hora` para patrones. Esto permite filtrar por el período seleccionado Y, opcionalmente, mostrar el patrón promedio cuando se quiera.

| View | Dimensión temporal actual | Dimensión requerida | Nota |
|---|---|---|---|
| `v_revenue_vs_turnos_hora` | `hora` + `dia_semana` (168 rows) | `fecha` + `hora` | Una fila por fecha×hora. El gráfico de “operación por hora” suma sobre el período correctamente. |
| `v_horas_extra` | `dia`(0‑6) + `semana` ("2026‑W26") | `fecha` | Una fila por empleado×fecha. El grid suma dentro del período. |
| `v_horas_nocturnas` | `area` + `dia_semana` + `empleado` | `fecha` + `area` + `empleado` | Filtrar por período. |
| `v_gaps_cobertura` | `hora` (24 rows) | `fecha` + `hora` + `area` | Alertas reales con fecha; el semáforo tiene sentido. |
| `v_productividad_area` | `area` + `dia_semana` (13 rows) | `fecha` + `area` | ROI del período, no histórico. |

Alternativa si reescribir las views es caro: **filtrar en la API por `semana`/`dia_semana` derivados del `from`/`to`** del cliente (p.ej. mapear rango de fechas → conjunto de semanas ISO). Es un parche peor (no resuelve días sueltos en “Hoy”/“Ayer”/rango custom que cruza semanas), pero tapa la hemorragia para presets semanales. La solución correcta es `fecha`.

Las 2 views que ya tienen `fecha` (`v_nomina_vs_ventas`, `v_reservas_vs_ventas`) **no se tocan**.

---

## 3. Componentes: conservar / modificar / eliminar

**Conservar sin tocar (correctos):**
- `RentabilidadPanel`, `InformesDashboard`, `ProductoDesgloseTable`, `MetricasClave`, `ReservasConversionTable`.

**Modificar:**
- `InformesRayoPanel` — conectar UI de zona o eliminar estado `zone`; quitar “Resumen para Junta” duplicado.
- `NominaRatioCard` — usar `summary` del período en vez de un solo día.
- `useSemanticModel` — arreglar guard de refetch, reportar errores parciales.
- Helper de formato de moneda compartido (unificar `formatCOP` casero vs `Intl.NumberFormat`).

**Reescribir (view + componente):**
- `OperacionHoraChart`, `RecargosNominaGrid`, `GapsCoberturaAlerts`, `ProductividadAreaRadar` — dependen de las 5 views rotas. Los componentes en sí están bien construidos; el problema es 100% de datos. Una vez arregladas las views + filtro por fecha en la API, funcionan.

**Eliminar:**
- `PeriodSelector.tsx` — no se importa en ningún lado; el panel tiene su selector inline. Mover su dropdown de zona al panel inline y borrar el archivo.

---

## 4. Redundancias y faltantes

**Redundancias:**
- “Resumen para Junta” (panel) ≈ KPIs de `MetricasClave`. Quitar uno.
- `ProductividadAreaRadar` (revenue/costo/ROI por área) se solapa conceptualmente con `InformesDashboard` “Por Zona” (revenue/cheques/ticket por zona) — pero el radar aporta costo y ROI que la tabla de zona no tiene. **Complementario, no redundante** una vez arreglada la view.

**Componentes faltantes para visión operacional real de Felipe:**
1. **Staff por turno/día** — cuánta gente trabajó por día del período, vs PAX/reservas. Hoy el panel principal trae `staff` (top vendedores) pero no dotación por día.
2. **Evolución del ratio nómina/ventas en el tiempo** — hoy NominaRatioCard muestra un punto; falta una mini‑serie diaria del período.
3. **Comparación vs período anterior en el modelo semántico** — todos los componentes semánticos carecen de delta. El panel ya calcula `compareFrom/compareTo`; solo hay que pasarlos.
4. **Reservas convertidas vs walk‑ins** — `v_reservas_vs_ventas` ya trae reservas+revenue, pero falta separar cheques que llegaron sin reserva (conversión real).
5. **Heatmap de gaps por día×hora** — con `fecha` en `v_gaps_cobertura` se podría mostrar un calendario de gaps, no una lista plana.

---

## 5. Reorganización visual propuesta

Hoy todo es un scroll vertical único. Felipe pierde contexto. Propuesta por **tabs/secciones**:

```
Informes Rayo
├─ [Selector período + comparar + zona]   ← único, arriba
│
├─ Tab 1 — RESUMEN (¿cómo nos fue?)
│    ├─ MetricasClave (KPIs + deltas)
│    ├─ InformesDashboard (top productos, pagos, zonas)
│    └─ ReservasConversionTable  ✅
│
├─ Tab 2 — RENTABILIDAD (¿ganamos plata?)
│    └─ RentabilidadPanel completo
│
├─ Tab 3 — OPERACIÓN (¿cómo funcionamos?)   ← Modelo Semántico arreglado
│    ├─ NominaRatioCard (ratio período, con delta vs período anterior)
│    ├─ OperacionHoraChart (revenue vs personas por hora DEL período)
│    ├─ GapsCoberturaAlerts (con fecha + área)
│    ├─ RecargosNominaGrid (HE + nocturnas DEL período)
│    └─ ProductividadAreaRadar→tabla (ROI por área DEL período)
│
└─ Tab 4 — PRODUCTOS (¿qué vendimos?)
     ├─ ProductoDesgloseTable (heatmap hora/día)
     └─ (export CSV ya existe)
```

Orden lógico: de lo agregado (¿cómo nos fue?) a lo operacional (¿por qué?) a lo granular (¿qué producto?). El Modelo Semántico deja de ser un apéndice misterioso al final y se convierte en el tab de “Operación”, que es donde aporta valor único (nómina, dotación, recargos).

---

## 6. Prioridades (qué arreglar primero)

**P0 — Detiene la hemorragia de datos falsos:**
1. Reescribir las 5 views con `fecha` (o, parche mínimo, filtrar por `semana` derivada en las APIs de `horas-extra`/`horas-nocturnas`).
2. Agregar `.gte('fecha', from).lte('fecha', to)` en las 5 API routes (revenue-vs-turnos, horas-extra, horas-nocturnas, gaps-cobertura, productividad-area).
3. Mientras tanto, **marcar esos 4 componentes como “datos históricos/promedio”** o ocultarlos, para no mostrar cifras engañosas.

**P1 — Sin sentido pero visibles:**
4. `NominaRatioCard`: usar `summary` (ratio del período).
5. `useSemanticModel`: arreglar guard de refetch y errores parciales.
6. Unificar formateador de moneda.

**P2 — Limpieza estructural:**
7. Eliminar `PeriodSelector.tsx` (muerto) o conectarlo.
8. Quitar “Resumen para Junta” duplicado.
9. Conectar o eliminar el estado `zone` del panel.

**P3 — Reorganización + valor nuevo:**
10. Tabs (Resumen / Rentabilidad / Operación / Productos).
11. Pasar `compareFrom/compareTo` al modelo semántico para deltas.
12. Componentes faltantes: dotación por día, serie de ratio nómina, heatmap de gaps.

---

## 7. Nota sobre la documentación

`SEMANTIC_MODEL_VIEWS.sql` y `SEMANTIC_MODEL_TASK.md` **describen un esquema que no existe** (campo `fecha` en las 7 views, nombres de campo distintos). Esto indujo a escribir APIs que asumían `fecha` y luego a “corregirlas” quitando el filtro. **Antes de cualquier reescritura, actualizar esos dos archivos** con las columnas reales para que el próximo desarrollador no repita el ciclo.