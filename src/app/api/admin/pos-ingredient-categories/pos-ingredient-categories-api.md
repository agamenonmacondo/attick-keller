# pos-ingredient-categories/route.ts

## Proposito

API route que retorna las categorias de ingredientes POS con conteo de ingredientes por categoria. Usado por `MenuItemForm` para los pills de categoria y por otros componentes del catalogo.

Endpoint: `GET /api/admin/pos-ingredient-categories`

**Sin parametros de query.**

**Auth**: Requiere `store_admin` o `super_admin` (via `getAdminUser`).

## Datos

### Tablas Supabase
- `pos_ingredient_categories` — Categorias de ingredientes (lectura)
  - Campos: `pos_category_id`, `name`, `classification`, `priority`
- `pos_ingredients` — Ingredientes (lectura, solo para `count`)

### Workaround: 2 queries + merge manual
No se puede usar `JOIN` porque no hay FK definida. Se hace:
1. **Step 1**: Fetch de categorias activas (excluyendo `"NO USAR"`, solo `classification=1`)
2. **Step 2**: Contar ingredientes por categoria haciendo query a `pos_ingredients` con `.select('pos_category_id')` y contando en JS

### Filtros
- Se excluye `name != 'NO USAR'`
- Se filtra solo `classification = '1'` (cocina/comida)
- Se ordena por `priority` ascendente

## Dependencias

### Lo usa
- `MenuItemForm.tsx` — Posible consumidor indirecto (los pills de categoria se arman con los datos del endpoint de ingredientes)
- Componentes del catalogo de costos
- Cualquier formulario que necesite listar categorias de ingredientes

### Usa a
- `getAdminUser` from `@/lib/utils/admin-auth` — Autenticacion
- `getServiceClient` from `@/lib/utils/admin-auth` — Cliente Supabase service role

## Pitfalls

- **Solo classification=1**: Este endpoint retorna solo categorias de cocina (`classification='1'`). Bar (`2`) y vino (`3`) se excluyen permanentemente. Si se necesitan en el futuro, agregar parametro query.
- **Exclusion por nombre `"NO USAR"`**: Igual que `pos-ingredients`, usa `.neq('name', 'NO USAR')`. Es un filtro fragil que depende del nombre exacto.
- **Conteo se hace en JS, no en BD**: El Step 2 trae TODOS los `pos_category_id` de ingredientes y los cuenta en JavaScript. Esto es ineficiente para muchos ingredientes — Seria mejor usar un RPC o vista materializada.
- **No hay paginacion**: Retorna todas las categorias de una vez. Si crecen mucho, necesitara paginacion.
- **`ingredient_count` puede ser 0**: Categorias sin ingredientes aparecen con `ingredient_count: 0`. Esto podria confundir al usuario. Considerar filtrar en el cliente o agregar `.gt('count', 0)` cuando Supabase lo soporte.
- **Sin busqueda**: No hay parametro `search`. Si se necesita buscar categorias, hay que filtrar client-side.

## Historial
| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-05-28 | Ninja | fix: APIs sin joins Supabase — FK no definidas causaban queries vacias |
| 2026-05-27 | Ninja | feat: ingredientes por categorias en MenuItemForm — acordeon expandible |