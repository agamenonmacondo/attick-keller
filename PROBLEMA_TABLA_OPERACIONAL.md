# Problema Tabla Operacional — Auditoria Dashboard POS

**Fecha:** 2026-05-26  
**Proyecto:** Attick & Keller — web-rosy-nine-64.vercel.app  
**Tab:** Operacion POS  

---

## Resumen

Los componentes del dashboard de Operacion no muestran datos consistentes. Cuando se activa el modo "Consolidado", varios componentes siguen mostrando datos de dia individual en vez del consolidado mensual. Ademas, los totales entre componentes no cuadran y hay fallos en drill-down.

---

## Bug 1: Top Productos — No muestra nombre del producto

**Componente:** `TopProductsTable.tsx`  
**Sintoma:** La tabla muestra cantidad y revenue pero el nombre del producto aparece vacio o en blanco.  
**Posible causa:** El campo `productName` llega vacio desde la API, o el mapeo `productInfo.get(item.pos_product_id)` no resuelve el nombre correctamente.  
**Verificar:** 
- API response campo `topProducts[].productName` 
- En `route.ts` linea ~362: `productInfo.get(item.pos_product_id)` — verificar que `info.name` no sea undefined
- La tabla `pos_products` tiene datos (853 productos confirmados), pero el map `productInfo` puede no estar poblado si el query a Supabase falla silenciosamente

---

## Bug 2: Categoria del producto — Totales no concuerdan con ingresos del periodo

**Componente:** `CategoryBreakdown.tsx`  
**Sintoma:** La suma de revenue por categoria no coincide con el total de ingresos mostrado en los KPIs del periodo.  
**Posible causa:** 
- Los KPIs usan `sales.total` (valor del cheque) mientras que categorias usan `quantity * unit_price` de items
- Los items con `unit_price = NULL` o `0` se excluyen del calculo de categorias pero se incluyen en el total de cheques
- Productos como propinas (ID 1620039) con 707 items sin precio descuadran los totales
- Cheques con IVA incluido vs items sin IVA  
**Verificar:**
- Comparar `SUM(pos_sales.total)` vs `SUM(pos_sale_items.quantity * unit_price)` para el periodo
- Cuantificar la diferencia y determinar si es IVA, items sin precio, o otro factor

---

## Bug 3: Producto estrella por categoria — Total desalineado

**Componente:** `TopProductByCategoryChart.tsx`  
**Sintoma:** Mismo problema que Bug 2 — el total mostrado no cuadra con el total del periodo.  
**Causa raiz:** Misma que Bug 2 — la suma de category breakdown se calcula de items (qty*price), no de sales.total

---

## Bug 4: Modo Consolidado — Componentes muestran datos de dia, no de mes

**Componente:** `POSDashboardPanel.tsx` + `usePOSDashboard.ts`  
**Sintoma:** Cuando se activa "Consolidado", el toggle limpia `from/to` en los filtros, pero algunos componentes siguen mostrando datos de un dia individual en vez del mes completo.  
**Causa probable:** El estado `effectiveFilters` actualiza los params del hook `usePOSDashboard`, pero la API puede estar cacheando la respuesta anterior o el estado de React no se propaga correctamente a todos los hijos.  
**Verificar:**
- `usePOSDashboard` usa `useMemo` con `params` como dependencia — cuando `from/to` cambian a undefined, los params deberian cambiar
- La API recibe el param `from=` vacio y deberia retornar datos del mes completo
- Confirmar con console.log en el navegador que la API se llama con los params correctos

---

## Bug 5: Drill-down no muestra data del componente seleccionado

**Componente:** `DrillDownPanel.tsx` + API `/api/admin/pos-dashboard/detail`  
**Sintoma:** Al hacer clic en un producto/categoria/staff para ver detalle, el panel de drill-down no muestra informacion del elemento seleccionado.  
**Causa probable:**
- El endpoint `/api/admin/pos-dashboard/detail` no recibe los filtros correctos (from/to vacios)
- El `pos_product_id` o `pos_staff_id` pasado al endpoint no coincide con los datos en BD
- La query de Supabase en el endpoint falla silenciosamente (retorna array vacio)  
**Verificar:**
- Console del navegador: que URL se llama al hacer drill-down
- En `route.ts` detail endpoint: agregar logging de los params recibidos
- Verificar que `fetchDrillDown` pasa `filters.from` y `filters.to` correctamente (linea 291-302 en usePOSDashboard.ts)

---

## Arquitectura del Dashboard — Mapeo de datos

```
POSDashboardPanel.tsx
├── usePOSDashboard(filters) → /api/admin/pos-dashboard
│   ├── kpis: SUM(pos_sales.total), COUNT, AVG — por cheques
│   ├── byZone: GROUP BY zone — por cheques  
│   ├── hourlyRevenue: GROUP BY hour — por cheques
│   ├── dailyTrend: GROUP BY date — por cheques
│   ├── topProducts: GROUP BY product — por ITEMS (qty * unit_price) ← DIFERENTE BASE
│   ├── topCategories: GROUP BY group_id — por ITEMS (qty * unit_price) ← DIFERENTE BASE
│   ├── staffPerformance: GROUP BY staff_id — por cheques
│   ├── paymentMethods: GROUP BY method — por payments
│   └── productsByCategory: GROUP BY product+group — por ITEMS
│
├── usePOSCalendar(zone) → /api/admin/pos-calendar  
│   └── dailyTrend: GROUP BY date — por cheques
│
└── fetchDrillDown(type, id) → /api/admin/pos-dashboard/detail
    └── queries especificas por tipo
```

### Problema arquitectural выявлен

**KPIs y zonas calculan sobre `pos_sales.total` (cheques).**  
**Categorias y productos calculan sobre `pos_sale_items.quantity * unit_price` (items).**  
Estas dos bases NO son iguales porque:
1. Items con `unit_price = NULL` o 0 no suman en categorias
2. `pos_sales.total` incluye IVA, items pueden o no
3. Propinas como producto (ID 1620039) suman en cheques pero no en items con precio

---

## Plan de Auditoria con Claude Code + Ollama DeepSeek

### Paso 1: Preparar entorno
```bash
cd /mnt/f/attick-keller/web
# Verificar Ollama corriendo
ollama list | grep deepseek
```

### Paso 2: Ejecutar Claude Code con contexto
```bash
claude --model ollama:deepseek-coder-v2 \
  --context "Auditar bugs en dashboard POS. Ver PROBLEMA_TABLA_OPERACIONAL.md para detalles." \
  "Revisa los siguientes archivos y diagnostica los 5 bugs documentados en /mnt/f/attick-keller/web/PROBLEMA_TABLA_OPERACIONAL.md:
  
  1. src/components/admin/pos-dashboard/TopProductsTable.tsx
  2. src/components/admin/pos-dashboard/CategoryBreakdown.tsx  
  3. src/components/admin/pos-dashboard/TopProductByCategoryChart.tsx
  4. src/components/admin/pos-dashboard/POSDashboardPanel.tsx
  5. src/components/admin/pos-dashboard/DrillDownPanel.tsx
  6. src/app/api/admin/pos-dashboard/route.ts
  7. src/app/api/admin/pos-dashboard/detail/route.ts
  8. src/lib/hooks/usePOSDashboard.ts
  
  Para cada bug:
  - Identifica la linea exacta del problema
  - Propone el fix
  - Verifica que el fix no rompe otros componentes"
```

### Paso 3: Aplicar fixes
Claude Code generara los patches. Revisar cada uno antes de aplicar.

### Paso 4: Verificar
```bash
npx next build && npx vercel --prod --yes --token $VERCEL_TOKEN
```

### Paso 5: Validar en produccion
- Abrir https://web-rosy-nine-64.vercel.app/admin
- Verificar cada bug con datos reales
- Comparar totales de KPIs vs categorias vs productos