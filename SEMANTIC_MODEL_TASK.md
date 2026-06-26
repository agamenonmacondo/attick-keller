# Implementar Modelo Semántico — API Routes + Componentes

## Contexto

El proyecto Attic & Keller (A&K) es un dashboard administrativo para un restaurante en Bogotá.
Ubicación: `/mnt/f/attick-keller/web/`
Stack: Next.js 14 App Router + TypeScript + Supabase + Phosphor Icons

Ya existen 7 views materializadas en Supabase que pre-calculan analíticos. Necesitamos crear:
1. **6 API routes** que consultan estas views
2. **6 componentes** que las consumen y se integran en Informes Rayo

## Views disponibles en Supabase (ya creadas, solo SELECT)

### 1. v_revenue_vs_turnos_hora
Campos: fecha, hora, dia_semana, revenue, personas_en_turno, costo_turnos, revenue_por_persona, estado (PICO/GAP/SOBRANDO)

### 2. v_horas_extra
Campos: fecha, pos_staff_id, nombre, area, horas_extra, costo_extra, recargo_pct, tipo_recargo (25%/75%/100%)

### 3. v_horas_nocturnas
Campos: fecha, area, pos_staff_id, nombre, horas_ordinarias, horas_nocturnas, pct_nocturno, recargo_nocturno

### 4. v_productividad_area
Campos: fecha, area, revenue, horas_turno, costo_turnos, revenue_por_hora, costo_por_hora, roi

### 5. v_nomina_vs_ventas
Campos: fecha, nomina_total, ventas_total, ratio_pct, estado (EFICIENTE/ATENCION/CRITICO)

### 6. v_gaps_cobertura
Campos: fecha, hora, area, personas_en_turno, revenue, revenue_por_persona, tipo_alerta (GAP_COCINA/SOBRA/DESFASE/NORMAL)

### 7. v_reservas_vs_ventas
Campos: fecha, num_reservas, total_pax, evento_grande, revenue, staff_asignado, revenue_por_persona

## API Routes existentes (patrón a seguir)

Las API routes usan este patrón (ver `src/app/api/admin/informes-rayo/route.ts`):
- Importan `getAdminUser` y `getServiceClient` de `@/lib/utils/admin-auth`
- `getAdminUser` valida auth del request
- `getServiceClient` retorna cliente Supabase con service_role
- Aceptan query params: from, to, zone (opcional)
- Retornan JSON

Ejemplo de patrón:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { searchParams } = request.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  if (!from || !to) return NextResponse.json({ error: 'from and to required' }, { status: 400 })
  
  const sb = getServiceClient()
  const { data, error } = await sb.from('v_nomina_vs_ventas')
    .select('*')
    .gte('fecha', from)
    .lte('fecha', to)
    .order('fecha', { ascending: false })
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
```

## Componentes existentes en Informes Rayo

Ubicación: `src/components/admin/informes/`
- InformesRayoPanel.tsx (panel principal, maneja tabs/periodos)
- MetricasClave.tsx (KPIs principales)
- RentabilidadPanel.tsx (análisis de rentabilidad)
- InformesDashboard.tsx (gráficos)
- ProductoDesgloseTable.tsx (tabla de productos)
- PeriodSelector.tsx (selector de período)
- WhatsAppExportButton.tsx, PDFExportButton.tsx (exports)

Hooks existentes en `src/lib/hooks/`:
- useInformesRayo (datos principales)
- useProductoHourly (productos por hora)
- useProductMargins (márgenes)

## Tarea: Crear 6 API Routes nuevas

Crear estos archivos:

### 1. `src/app/api/admin/informes-rayo/nomina-vs-ventas/route.ts`
Consulta `v_nomina_vs_ventas` con filtros from/to.
Retorna: data array con { fecha, nomina_total, ventas_total, ratio_pct, estado }

### 2. `src/app/api/admin/informes-rayo/horas-extra/route.ts`
Consulta `v_horas_extra` con filtros from/to.
Retorna: data array + summary { total_he, total_costo, promedio_por_empleado }

### 3. `src/app/api/admin/informes-rayo/horas-nocturnas/route.ts`
Consulta `v_horas_nocturnas` con filtros from/to.
Retorna: data array + summary { total_nocturnas, total_recargo, area_mas_nocturna }

### 4. `src/app/api/admin/informes-rayo/revenue-vs-turnos/route.ts`
Consulta `v_revenue_vs_turnos_hora` con filtros from/to.
Retorna: data array + summary { total_revenue, promedio_personas, hora_pico }

### 5. `src/app/api/admin/informes-rayo/gaps-cobertura/route.ts`
Consulta `v_gaps_cobertura` con filtros from/to, filtra solo tipo_alerta != 'NORMAL'.
Retorna: data array + summary { total_gaps, total_sobras, areas_afectadas }

### 6. `src/app/api/admin/informes-rayo/productividad-area/route.ts`
Consulta `v_productividad_area` con filtros from/to.
Retorna: data array + summary { roi_promedio, mejor_area, peor_area }

## Tarea: Crear 6 Componentes nuevos

Crear en `src/components/admin/informes/`:

### 1. NominaRatioCard.tsx
Card compacta que muestra ratio nómina/ventas del día.
- Semáforo: verde (EFICIENTE <15%), amarillo (ATENCION 15-20%), rojo (CRITICO >20%)
- Muestra: nómina total, ventas total, ratio %
- Formato pesos colombianos
- Recibe prop: data del API nomina-vs-ventas

### 2. RecargosNominaGrid.tsx
Grid con HE y nocturnas combinadas.
- Tabla: empleado, área, HE, costo HE, nocturnas, recargo nocturno, total recargos
- Summary al final: totales
- Recibe props: dataHorasExtra, dataHorasNocturnas

### 3. OperacionHoraChart.tsx
Gráfico de barras simple (sin librerías externas) mostrando revenue vs personas por hora.
- Eje X: horas (0-23)
- Barras dobles: revenue (dorado) y personas (burgundy)
- Línea de $/persona sobre las barras
- Estados coloreados: PICO=verde, GAP=rojo, SOBRANDO=amarillo
- Recibe prop: data del API revenue-vs-turnos

### 4. GapsCoberturaAlerts.tsx
Lista de alertas de cobertura.
- Tarjetas por tipo: GAP_COCINA (rojo), SOBRA (amarillo), DESFASE (naranja)
- Muestra: fecha, hora, área, personas, revenue esperado
- Solo muestra tipo_alerta != 'NORMAL'
- Recibe prop: data del API gaps-cobertura

### 5. ProductividadAreaRadar.tsx
Tabla comparativa de productividad por área.
- Columnas: área, revenue, horas turno, revenue/hora, costo/hora, ROI
- Semáforo ROI: verde >3, amarillo 1-3, rojo <1
- Recibe prop: data del API productividad-area

### 6. ReservasConversionTable.tsx
Tabla de reservas vs ventas vs staff.
- Columnas: fecha, reservas, pax, evento grande, revenue, staff, $/persona
- Destaca eventos grandes (pax≥15) con borde dorado
- Recibe prop: data del API reservas-vs-ventas (usar v_reservas_vs_ventas)

## Reglas importantes

1. **Phosphor Icons**: verificar SIEMPRE que el icon existe antes de importar. Seguros: Lightning, Warning, CurrencyDollar, Clock, ChartBar, Users, Calendar
2. **Sin librerías de gráficos externas** — usar divs/flexbox para barras y tablas HTML
3. **Pesos colombianos**: formatear con `new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor)`
4. **Colores A&K**: bg #1A1412, gold #C9A94E, burgundy #C44D63, madera #3E2723, cal #F5E6D3
5. **Responsive**: mobile-first, todo debe verse bien en 375px de ancho
6. **TypeScript**: todos los componentes con tipos explícitos, sin `any` en lo posible
7. **'use client'**: todos los componentes nuevos deben tener esta directiva
8. **No modificar archivos existentes** — solo crear archivos nuevos
9. **Hooks**: crear un hook `useSemanticModel` en `src/lib/hooks/useSemanticModel.ts` que fetchee los 6 endpoints en paralelo
10. **Integración**: al final, agregar los 6 componentes nuevos como imports opcionales en InformesRayoPanel.tsx (pero NO romper lo existente)

## Orden de implementación

1. Crear las 6 API routes
2. Crear el hook useSemanticModel
3. Crear los 6 componentes
4. Agregar imports en InformesRayoPanel.tsx

## Supabase

- URL: https://wpmxbskqzjgqfkuppdzt.supabase.co
- Las views ya existen en la BD, solo consultarlas con `.from('view_name').select('*')`
- getServiceClient() tiene acceso total (service_role), no hay RLS

Implementa todo ahora. Crea los archivos en orden.