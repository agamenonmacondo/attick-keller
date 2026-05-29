# pos-ingredients/route.ts

## Proposito

API route que retorna la lista completa de ingredientes POS con sus categorias y costos promedio. Es la unica fuente de ingredientes para el formulario `MenuItemForm` y el catalogo de costos.

Endpoint: `GET /api/admin/pos-ingredients`

Parametros query:
- `search` — Filtro de busqueda por nombre (ilike)
- `category` — Filtrar por `pos_category_id`
- `include_bar` — Si `"true"`, incluye categorias con classification=2 (bar)
- `include_wine` — Si `"true"`, incluye categorias con classification=3 (vino)
- `limit` — Maximo ingredientes a retornar (default 50, max 2000)

**Auth**: Requiere `store_admin` o `super_admin` (via `getAdminUser`).

## Datos

### Tablas Supabase
- `pos_ingredients` — Maestro de ingredientes (lectura)
  - Campos: `pos_ingredient_id`, `name`, `unit`, `is_composite`, `pos_category_id`
- `pos_ingredient_categories` — Categorias de ingredientes (lectura)
  - Campos: `pos_category_id`, `name`, `classification`
- `pos_ingredient_costs` — Costos promedio por ingrediente (lectura)
  - Campos: `pos_ingredient_id`, `avg_cost`

### Workaround critico: 3 queries + merge manual
Supabase no tiene FKs entre `pos_ingredients`, `pos_ingredient_categories` y `pos_ingredient_costs`, por lo que NO se puede hacer `.select('*, pos_ingredient_categories(name), pos_ingredient_costs(avg_cost)')`. En su lugar:
1. **Step 1**: Obtener IDs de categorias excluidas (`NO USAR`, bar, vino segun flags)
2. **Step 2**: Fetch de `pos_ingredients` filtrado, excluyendo categorias excluidas
3. **Step 3**: Fetch de `pos_ingredient_categories` para los `pos_category_id` obtenidos
4. **Step 4**: Fetch de `pos_ingredient_costs` para los `pos_ingredient_id` obtenidos
5. **Step 5**: Merge manual en JS: cada ingrediente se le adjunta `category_name` y `avg_cost`

### Filtro de exclusion
- Se excluyen categorias con nombre que contenga `"NO USAR"` siempre
- Se excluyen categorias con `classification=2` (bar) si `include_bar` no es `"true"`
- Se excluyen categorias con `classification=3` (vino) si `include_wine` no es `"true"`

## Dependencias

### Lo usa
- `MenuItemForm.tsx` — Fetch de ingredientes para el selector
- `ProductCostTable` / catalogo de costos — Posible consumidor
- Cualquier componente que necesite listar ingredientes disponibles

### Usa a
- `getAdminUser` from `@/lib/utils/admin-auth` — Autenticacion
- `getServiceClient` from `@/lib/utils/admin-auth` — Cliente Supabase service role
- `RESTAURANT_ID` hardcoded — Filtra ingredientes por restaurante

## Pitfalls

- **NO hay joins, todo es merge manual**: Si se agregan FKs en el futuro entre las tablas, este endpoint deberia reescribirse para usar joins nativos de Supabase. Mientras tanto, cualquier cambio de esquema en las 3 tablas requiere actualizar los campos del Step 5 manualmente.
- **Exclusion por nombre `"NO USAR"`**: El filtro usa `ilike.%NO USAR` que es un string hardcoded. Si alguien cambia ese nombre en la BD, la exclusion falla. Mejor usar un flag `is_active` o similar.
- **`classification` es string, no numero**: Los valores `classification.eq.2` y `.eq.3` se comparan como strings en Supabase. Verificar que la columna sea consistente.
- **Limite default bajo**: El default es 50 ingredientes, pero el `MenuItemForm` pide `limit=1000`. Si se llama sin limite, solo retorna 50. Verificar que todos los consumidores pasen un limite adecuado.
- **No maneja ingredientes sin categoria**: Si un ingrediente tiene `pos_category_id` nulo o que no exista en `pos_ingredient_categories`, se le asigna `"Sin categoria"`. Esto es correcto pero podria ocultar datos sucios.
- **`avg_cost` default es 0**: Si un ingrediente no tiene entrada en `pos_ingredient_costs`, se le asigna `avg_cost: 0`. Esto hace que el calculo de margen en `MenuItemForm` sea incorrecto. Deberia haber un warning o valor por defecto mas visible.
- **Restaurant ID hardcodeado**: Usa el string literal `'a0000000-0000-0000-0000-000000000001'`. Si se agregan multi-tenant, esto se rompe. Preferir `RESTAURANT_ID` de constants (que ya existe pero no se usa aqui en el query, se podria pasar como param).

## Historial
| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-05-28 | Ninja | fix: APIs sin joins Supabase — FK no definidas causaban queries vacias en pos_ingredients |
| 2026-05-28 | Ninja | fix: MenuItemForm rediseño — pills de categoria, un solo fetch, sin acordeon |
| 2026-05-26 | Ninja | feat: selector de ingredientes POS en MenuItemForm con typeahead, calculo de costo y margen |