# menu/items/[id]/ingredients/route.ts

## Proposito

API route CRUD para la relacion many-to-many entre platos del menu e ingredientes POS. Permite:
- **GET**: Listar ingredientes asociados a un plato, con nombre, unidad, costo y `is_composite`
- **POST**: Agregar un ingrediente a un plato (con validacion de duplicados)
- **PATCH**: Actualizar la cantidad de un ingrediente asociado
- **DELETE**: Eliminar un ingrediente de un plato

Endpoints:
- `GET /api/admin/menu/items/[id]/ingredients`
- `POST /api/admin/menu/items/[id]/ingredients`
- `PATCH /api/admin/menu/items/[id]/ingredients`
- `DELETE /api/admin/menu/items/[id]/ingredients`

**Auth**: Todos los metodos requieren `store_admin` o `super_admin` (via `getAdminUser`).

## Datos

### Tablas Supabase
- `menu_item_ingredients` — Tabla pivot (CRUD completo)
  - Campos: `id`, `menu_item_id`, `pos_ingredient_id`, `quantity`, `restaurant_id`, `created_at`
- `menu_items` — Verificacion de existencia (read)
- `pos_ingredients` — Join para obtener name, unit, is_composite (este SI tiene FK, usa notacion Supabase)
- `pos_ingredient_costs` — Join para obtener avg_cost, cost, cost_with_tax (tambien con FK)

### Nota sobre joins
Este endpoint SI puede usar joins Supabase porque `menu_item_ingredients` tiene FKs definidas a `pos_ingredients` y `pos_ingredient_costs`. A diferencia de `pos-ingredients/route.ts` que hace merge manual, aqui se usa la notacion `.select('..., pos_ingredients(...), pos_ingredient_costs(...)')`.

### Validaciones
- **POST**: Verifica que el plato exista, valida `pos_ingredient_id` requerido, `quantity >= 0`, y que no haya duplicado (409 si ya existe)
- **PATCH**: Valida `pos_ingredient_id` y `quantity >= 0`
- **DELETE**: Acepta `pos_ingredient_id` via JSON body o query param (flexible para diferentes clientes)

## Dependencias

### Lo usa
- `MenuItemForm.tsx` — CRUD de ingredientes al agregar/quitar/editar cantidad
- Posibles componentes de receta/costeo futuros

### Usa a
- `getAdminUser`, `getServiceClient`, `RESTAURANT_ID` from `@/lib/utils/admin-auth`

## Pitfalls

- **El GET SI usa joins, pero maneja arrays**: Supabase puede retornar relaciones como array u objeto segun la cardinalidad. Este endpoint maneja ambos casos:
  ```typescript
  const ing = Array.isArray(row.pos_ingredients)
    ? row.pos_ingredients[0]
    : row.pos_ingredients
  ```
  Si se agrega otra relacion, el mismo patron debe aplicarse.
- **POST sin transaccion**: Al crear un plato nuevo desde `MenuItemForm`, se hace POST al plato primero y luego N POSTs individuales a `/ingredients`. Este endpoint no tiene batches — cada ingrediente es una llamada separada. Si el modal se cierra antes de terminar, quedan ingredientes incompletos.
- **DELETE acepta body JSON y query param**: El DELETE acepta `pos_ingredient_id` tanto del body como de `?pos_ingredient_id=...`. Esto es porque algunos clientes (como `fetch` con `method: 'DELETE'`) pueden enviar body, mientras que otros prefieren query params. Pero podria causar confusion sobre cual tiene prioridad (body tiene prioridad si ambos existen).
- **PATCH usa composite key**: Actualiza por `(menu_item_id, pos_ingredient_id, restaurant_id)` en vez de por `id` de la tabla pivot. Esto es correcto pero diferente del patron REST habitual.
- **`RESTAURANT_ID` importado de admin-auth**: Se importa de `admin-auth` en vez de `constants`. Verificar que sean el mismo valor. Si uno cambia y el otro no, los queries filtrarian incorrectamente.
- **Error 409 como string**: El mensaje de error `'Este ingrediente ya está asociado a este plato'` esta en espanol hardcoded. Si se internacionaliza, hay que cambiar esto.

## Historial
| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-05-26 | Ninja | feat: selector de ingredientes POS en MenuItemForm con typeahead, calculo de costo y margen |