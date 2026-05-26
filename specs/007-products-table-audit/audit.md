# Auditoria: Top Products Table — Nombres no visibles

**Fecha:** 2026-05-26
**Componente:** `TopProductsTable.tsx` en tab Operacion
**Sintoma:** Al cargar el tab de Operacion con "Todos los productos" y "Todas las zonas", la tabla muestra subtotales (revenue, qty) pero NO muestra el nombre de los productos.

---

## Hallazgo #1: Mismatch campo `name` vs `productName` (CRITICO)

**Causa raiz del bug reportado.**

La API (`/api/admin/pos-dashboard/route.ts`, linea 523-526) construye `topProducts` asi:

```js
const filteredProductRevenueMap = new Map<string, { name: string; category: string; quantity: number; revenue: number }>()
// ...
const topProducts = [...filteredProductRevenueMap.values()]
  .map(p => ({ ...p, revenue: Math.round(p.revenue) }))
```

Resultado JSON: `{ name: "HUMMUS CON VEGETALES", category: "Entradas", quantity: 45, revenue: 1845000 }`

Pero `TopProductsTable.tsx` espera (linea 17-23):

```ts
interface TopProductsTableProps {
  data: Array<{
    productId: string    // <-- NO existe en la respuesta
    productName: string   // <-- la API envia "name", no "productName"
    category: string
    quantity: number
    revenue: number
  }>
}
```

En runtime, `p.productName` es `undefined` porque el campo se llama `name` en el JSON. React renderiza `undefined` como string vacio.

**Impacto:** Nombres de productos invisibles. `productId` undefined impide drill-down click.

**Fix:** Renombrar `name` a `productName` e incluir `productId` en la respuesta de la API, O mapear en el hook.

---

## Hallazgo #2: Columna "Categoria" siempre vacia en modo "Todos" (MEDIO)

En `TopProductsTable.tsx` linea 104-106:

```jsx
{!categoryProducts && (
  <td className="py-2 pr-3 text-[var(--text-secondary)] max-w-[120px] truncate">
    {p.label !== p.productName ? p.label : ''}
  </td>
)}
```

Cuando no hay filtro de categoria, `displayData` se construye (linea 48-54) con `label: p.productName`. La condicion `p.label !== p.productName` es **siempre false**, then la celda muestra `''` (vacio).

Deberia mostrar `p.category`, pero `p.category` ni siquiera esta en `displayData` -- solo se pasa `label` que es redundante con `productName`.

**Fix:** La columna categoria deberia mostrar el field `category` directamente, no un campo `label` derivado.

---

## Hallazgo #3: Campo `productId` faltante en topProducts API (MEDIO)

El `filteredProductRevenueMap` usa `item.pos_product_id` como clave del Map, pero solo hace spread del value (que tiene `name, category, quantity, revenue`). El `productId` (que es la clave del Map) **se pierde** en el `.values()`.

Linea 523:
```js
const topProducts = [...filteredProductRevenueMap.values()]
```

Deberia ser:
```js
const topProducts = [...filteredProductRevenueMap.entries()]
  .map(([productId, p]) => ({ productId, ...p, revenue: Math.round(p.revenue) }))
```

**Impacto:** El drill-down click no funciona porque `onProductDrillDown(p.productId, p.productName)` recibe `undefined`.

---

## Hallazgo #4: Inconsistencia tipo - Map key es string pero pos_product_id podria ser numerico (BAJO)

Los `pos_product_id` en Supabase son strings (`"01001"`, `"038006"`), y tanto `productInfo` como `filteredProductRevenueMap` los usan como strings. Sin embargo, en la linea 506:

```js
allItems = allItems.filter((item: any) => categoryProductIds.has(String(item.pos_product_id)))
```

El cast `String()` indica que hubo problemas de tipo en el pasado. Actualmente los IDs son strings en ambas tablas, pero el `String(item.pos_product_id)` en el filtro de categoria del item es un parche que no se aplica consistente (el Map usa `.get(item.pos_product_id)` sin cast en la linea 512).

**Riesgo:** Si en el futuro algun pos_product_id llega como numero desde Supabase (auto-cast), el `.get()` fallaria silenciosamente y el producto seria skippeado (`if (!info) continue`).

---

## Hallazgo #5: Mismo bug en `topProductByCategory` (MEDIO)

En la construccion de `topProductByCategory` (linea 413), el campo se llama `productName`:

```js
topProd = { productId: prodId, productName: info?.name || 'Desconocido', ... }
```

Este SI usa `productName`, inconsistente con `topProducts` que usa `name`. Funciona por accidente porque `TopProductByCategoryChart` espera `productName` y lo recibe bien. Pero la inconsistencia entre endpoints del mismo API es confusa.

---

## Hallazgo #6: productsByCategory falta field `category` en items (BAJO)

En `productsByCategory` (linea 434-449), cada producto tiene `productId`, `productName`, `quantity`, `revenue`, `cheques` -- pero no incluye `category`. La interfaz `ProductInCategory` de `TopProductsTable` tampoco lo define. Esto es correcto para el caso filtrado (categoria ya se conoce), pero limita la utilidad del campo para otros consumidores.

---

## Plan de Fix

### P1 — Mismatch name/productName (fix del bug reportado)

**Archivo:** `src/app/api/admin/pos-dashboard/route.ts`, linea 510-526

Cambiar:
```js
const filteredProductRevenueMap = new Map<string, { name: string; category: string; quantity: number; revenue: number }>()
```
A:
```js
const filteredProductRevenueMap = new Map<string, { productName: string; category: string; quantity: number; revenue: number }>()
```

Y en la construccion (linea 517):
```js
filteredProductRevenueMap.set(key, { productName: info.name, category: cat, quantity: 0, revenue: 0 })
```

Y en la salida (linea 523-526):
```js
const topProducts = [...filteredProductRevenueMap.entries()]
  .sort((a, b) => b[1].revenue - a[1].revenue)
  .slice(0, 15)
  .map(([productId, p]) => ({ productId, ...p, revenue: Math.round(p.revenue) }))
```

### P2 — Columna Categoria vacia

**Archivo:** `src/components/admin/pos-dashboard/TopProductsTable.tsx`, linea 40-54 y 104-106

Incluir `category` en `displayData` y mostrarlo directamente en vez del campo `label`.

### P3 — productId faltante en topProducts

Ya incluido en P1 (usar `.entries()` en vez de `.values()`).

---

## Verificacion post-fix

1. `npx tsc --noEmit` — sin errores
2. Cargar `/admin` → tab Operacion → verificar:
   - Nombres de productos visibles en tabla
   - Columna Categoria muestra el nombre de la categoria
   - Click en producto abre drill-down
3. Filtrar por categoria especifica → verificar:
   - Tabla muestra "Top Productos — [Categoria]"
   - Nombres siguen visibles