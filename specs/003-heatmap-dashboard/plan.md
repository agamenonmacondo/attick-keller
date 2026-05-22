# Plan: Dashboard Operativo v2 - Mapa de Calor + Vista por Dia

## Objetivo
Redisenar el tab Operacion para que el calendario sea el eje central de navegacion. Los datos se ven PRIMERO por dia (via mapa de calor) y los componentes se adaptan al dia seleccionado.

## Problemas actuales
1. Filtros por zona/categoria ocupan mucho espacio pero no muestran la dimension temporal
2. La tendencia diaria es un bar chart generico — no se ve "de un vistazo" que dias fueron buenos/malos
3. DayPerformanceCard solo aparece si filtras manualmente a un dia — no es intuitivo
4. No hay comparacion visual rapida entre dias (mapa de calor)

## Arquitectura nueva

### Layout propuesto (arriba → abajo)

```
┌──────────────────────────────────────────────────────┐
│  MAPA DE CALOR (calendario) — eje central            │
│  Cada celda = 1 dia. Color = intensidad revenue.      │
│  Click en dia → selecciona. Hover → tooltip con KPIs │
│  Filtro: Revenue | Propinas | Cheques | Personas      │
├──────────────────────────────────────────────────────┤
│  KPIs del periodo / dia seleccionado                  │
│  Revenue | Cheques | Ticket prom | Propinas | Personas│
├──────────────────────────────────────────────────────┤
│  FILTROS: Zona | Categoria (barra compacta)          │
├──────────────────────────────────────────────────────┤
│  DESGLOSE (3 columnas)                               │
│  ┌──────────┬───────────┬──────────────┐             │
│  │ Por zona │ Hora a    │ Top productos│             │
│  │ (barras) │ hora      │ del dia/     │             │
│  │          │ (barras)  │ periodo      │             │
│  └──────────┴───────────┴──────────────┘             │
├──────────────────────────────────────────────────────┤
│  DETALLE EXPANDIDO (segundo nivel)                   │
│  ┌──────────────┬──────────────┐                     │
│  │ Producto     │ Meseros      │                     │
│  │ estrella por │ (tabla)      │                     │
│  │ categoria    │              │                     │
│  └──────────────┴──────────────┘                     │
│  ┌──────────────┬──────────────┐                     │
│  │ Metodos pago │ Clientes     │                     │
│  │ (dona)       │ (tiers)     │                     │
│  └──────────────┴──────────────┘                     │
└──────────────────────────────────────────────────────┘
```

### Componente 1: RevenueHeatmapCalendar (NUEVO)

**Libreria**: `react-activity-calendar@3.2.0`
- React 19 compatible, date-fns ya instalada
- SVG con CSS override → Tailwind friendly
- Tooltips built-in, tema oscuro, leyenda

**Data que consume**:
```ts
Array<{ date: string; count: number; level?: number }>
```
- `count` = revenue del dia (o cheques, o propinas, segun filtro)
- `level` = auto-calculado (0-4) por cuartiles

**Filtros del heatmap** (toggle buttons):
- Revenue (default)
- Propinas
- Cheques
- Personas

**Interactividad**:
- Click en dia → `setFilters({ from: date, to: date })` 
- Tooltip: "$X COP · Y cheques · Z propinas"
- Leyenda de color: escala borgona (claro → oscuro)

**API**: Reutiliza `dailyTrend` del endpoint existente. No necesita query nueva.

### Componente 2: Redisenar POSFiltersBar

**Cambios**:
- Mover zona/categoria a barra compacta debajo del calendario
- Botones rapidos (Hoy/Semana/Mes) se mantienen
- Eliminar el date-picker popup (el calendario heatmap LO REEMPLAZA)
- El calendario heatmap ES el selector de fecha

### Componente 3: Adaptar DayPerformanceCard

**Cambios**:
- Cuando un dia esta seleccionado en el heatmap → aparece automaticamente
- Cuando no hay dia seleccionado → muestra resumen del periodo
- Agregar comparacion vs promedio del periodo (↑↓ flechas)
  - Ej: "Revenue $22.5M ↑ 15% vs promedio"

### Componente 4: MiniKPIBar (NUEVO - reemplaza KPIRow en vista por dia)

KPIs compactos en una sola fila con compara vs promedio:
```ts
interface MiniKPIBarProps {
  kpis: POSKPIs
  averages?: POSKPIs  // promedio del periodo para comparar
}
```

## Endpoints API: sin cambios

El endpoint `/api/admin/pos-dashboard` ya devuelve `dailyTrend` con `{date, revenue, cheques, propina}`. Solo necesitamos agregar `personas` al dailyTrend ( JOIN con pos_sales.party_size ).

## Tareas de implementacion

1. `npm install react-activity-calendar`
2. Crear `RevenueHeatmapCalendar.tsx` — wrapper de ActivityCalendar con tema borgona
3. Modificar API route: agregar `party_size` (personas) al dailyTrend
4. Modificar `POSFiltersBar.tsx` — remover date-picker, zona/categoria pasan abajo
5. Redisenar `POSDashboardPanel.tsx` — calendario arriba como eje
6. Crear `DayKPIBar.tsx` — KPIs con comparacion vs promedio
7. Adaptar `DayPerformanceCard.tsx` — comparaciones vs promedio
8. Agregar hook type: `dailyTrend` incluye `personas`
9. Test visual + deploy

## Estilos del heatmap (escala borgona)

```css
level 0: var(--bg-card)           /* sin datos */
level 1: #8B5E5E                 /* bajo - borgona claro */
level 2: #6B2737                 /* medio - borgona base */
level 3: #5A1F2D                 /* alto - borgona oscuro */
level 4: #3D1520                 /* muy alto - borgona intenso */
```

## Decisiones pendientes

1. **Mes anterior visible?**: Mostrar marzo 31-abril 30, o solo abril? → Recomendo solo mes con datos
2. **Dias futuros**: Ocultar o mostrar en gris? → Ocultar (no tienen data)
3. **Multi-dia select**: Permitir seleccionar rango en el heatmap? → v2 futuro, por ahora solo 1 dia