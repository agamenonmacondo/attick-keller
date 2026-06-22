# Plan: Refactor Cálculo de Costos por Turno — Solo Recargos y Extras

**Fecha**: 2026-06-22
**Objetivo**: Separar costo fijo (salario ya comprometido) de costo variable (recargos nocturnos, dominicales, HE) en la app de turnos.

## Problema Actual

`calcularCostoTurnoEmpresa()` multiplica el costo del turno por un factor ~1.66 (prestaciones + aportes patronales). Esto hace que cada turno asignado parezca costar ~$97K cuando el costo real **variable** de asignar ese turno es solo el recargo nocturno/dominical/HE — típicamente entre $0 y $44K.

El salario fijo se paga completo independientemente de cuántos turnos se asignen. Lo que el jefe de área necesita saber para tomar decisiones operativas es: **¿cuánto recargo/extra genera este turno?**

## Funciones y Componentes Afectados

### Core (cálculo)

| Archivo | Función | Cambio |
|---------|----------|--------|
| `costCalculator.ts` | `calcularCostoTurno()` | **Sin cambio** — ya calcula base + recargos correctamente |
| `costCalculator.ts` | `calcularCostoTurnoEmpresa()` | **Eliminar factor empresa** — retornar solo recargos (nocturno, dominical, HE) |
| `costCalculator.ts` | `calcularCostoSemanal()` | **Modificar** — sumar solo recargos, no costo total |
| `costCalculator.ts` | `calcularCostoEmpresa()` | **Sin cambio** — se sigue usando en StaffPanel para costo mensual fijo |
| `costCalculator.ts` | NUEVA: `calcularRecargosTurno()` | **Crear** — retorna solo recargos sin base pay |

### Componentes UI

| Componente | Uso actual | Cambio |
|------------|-----------|--------|
| `StaffPanel.tsx` | `costoEmpresaMensual()` para totales | **Sin cambio** — costo empresa mensual sigue siendo correcto |
| `CostEstimationBar.tsx` | `calcularCostoTurnoEmpresa()` con factor | **Modificar** — mostrar solo recargos desglosados |
| `ShiftGrid.tsx` | `calcularCostoTurnoEmpresa()` por celda | **Modificar** — mostrar solo recargos |
| `ShiftSchedulePanel.tsx` | `calcularCostoTurnoEmpresa()` al guardar | **Modificar** — guardar solo recargos como `estimated_recargos` |
| `SalesReferenceTab.tsx` | `calcularCostoTurnoEmpresa()` para comparar vs ventas | **Modificar** — comparar recargos vs margen, NO costo empresa |

### API / BD

| Archivo/Tabla | Cambio |
|---------------|--------|
| `shift_assignments` | Agregar columna `estimated_recargos` (nocturno + dominical + HE) |
| `/api/admin/shift-assignments` | Guardar `estimated_recargos` además de `estimated_cost` |

## Nueva Lógica: `calcularRecargosTurno()`

```typescript
interface RecargosTurno {
  recargo_nocturno: number;    // 35% × valorHora × horasNocturnas
  recargo_dominical: number;    // 75% × valorHora × totalHoras (si es domingo)
  horas_extra_diurnas: number;  // 25% × valorHora × heDiurnas
  horas_extra_nocturnas: number;// 75% × valorHora × heNocturnas
  he_dominical_diurna: number;  // 105% × valorHora × heDomDiurnas
  he_dominical_nocturna: number;// 175% × valorHora × heDomNocturnas
  total_recargos: number;       // suma de todo lo anterior
}
```

Principio: el salario base ya está comprometido. Los recargos son el **costo variable** de asignar un turno. Ese es el número que le importa al jefe de área.

## CostEstimationBar — Nuevo diseño

Antes (incorrecto):
```
Turno B10 (11:00-18:00) | Costo empresa: $96,880
```

Después (correcto):
```
Turno B10 (11:00-18:00) | Recargos: $0 (8h ordinarias diurnas)
Turno B11 (09:00-17:00) | Recargos: $0 (8h ordinarias diurnas)
Turno C1  (18:00-02:00) | Recargos: $17,873 (7h nocturnas × 35%)
Turno Dom (12:00-20:00) | Recargos: $43,773 (8h dominicales × 75%)
Turno HE  (09:00-21:00) | Recargos: $10,943 (2h extra diurnas × 25%)
```

## ShiftGrid — Celdas por turno

Antes: badge con costo empresa ($96K)
Después: badge con recargos ($0 si ordinario, $17K si nocturno, etc.)

Badge semanal: "Recargos semanales: $78K" (no costo empresa total)

## SalesReferenceTab — Comparativa

Antes: % costo empresa / ventas
Después:
- **% Turnos/Ventas** = recargos semanales / ventas (sin costos fijos)
- **% Total/Ventas** = costo empresa mensual / ventas (con costos fijos)

Los dos KPIs siguen existiendo, pero el cálculo de turnos ahora solo usa recargos, no factor empresa.

## Orden de ejecución

1. Crear `calcularRecargosTurno()` en `costCalculator.ts`
2. Modificar `calcularCostoTurnoEmpresa()` para que retorne recargos (mantener nombre por compatibilidad, cambiar implementación)
3. Actualizar `CostEstimationBar.tsx` — mostrar recargos desglosados
4. Actualizar `ShiftGrid.tsx` — badge con recargos
5. Actualizar `ShiftSchedulePanel.tsx` — guardar `estimated_recargos`
6. Actualizar `SalesReferenceTab.tsx` — % turnos/ventas con recargos
7. Agregar columna `estimated_recargos` en BD (migration)
8. Deploy y verificar

## Notas

- `StaffPanel.tsx` NO se toca — costo empresa mensual es correcto ahí
- `calcularCostoEmpresa()` NO se toca — se sigue usando para nómina mensual
- Los recargos se calculan sobre `salario/30/8 = valorHora`, sin factor empresa
- HE dominicales usan tarifa compuesta: diurna 2.0x, nocturna 2.5x (base + dom + HE)