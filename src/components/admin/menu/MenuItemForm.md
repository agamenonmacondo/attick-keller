# MenuItemForm

## Proposito

Formulario modal para crear y editar platos del menu. Permite:
- Crear un plato nuevo o editar uno existente (mismo componente, modo `isEditing`)
- Asignar nombre, descripcion, precio, categoria, imagen y destacar
- Asociar ingredientes POS al plato con cantidad y calculo de costo/margen
- Visualizar el margen de ganancia en tiempo real (costo ingredientes vs precio venta)

Usado por `MenuPanel.tsx` como modal flotante sobre la lista de platos.

## Datos

### APIs consumidas
- `GET /api/admin/pos-ingredients?limit=1000&include_bar=false&include_wine=false` — Lista todos los ingredientes POS (con `category_name` y `avg_cost` armados client-side desde la API)
- `GET /api/admin/menu/items/[id]/ingredients` — Ingredientes ya guardados para ese plato (solo si `isEditing`)
- `POST /api/admin/menu/items` — Crear plato nuevo
- `PATCH /api/admin/menu/items/[id]` — Editar plato existente
- `POST /api/admin/menu/items/[id]/ingredients` — Agregar ingrediente (se llama individualmente al hacer click en "Agregar")
- `PATCH /api/admin/menu/items/[id]/ingredients` — Actualizar cantidad de ingrediente asociado
- `DELETE /api/admin/menu/items/[id]/ingredients` — Eliminar ingrediente del plato

### Tablas Supabase
- `menu_items` — CRUD de platos (campos: name, description, price, category_id, image_url, is_featured)
- `menu_item_ingredients` — Relacion many-to-many entre platos e ingredientes POS
- `pos_ingredients` — Maestro de ingredientes (lectura via API)
- `pos_ingredient_costs` — Costos promedio por ingrediente (lectura via API)
- `pos_ingredient_categories` — Categorias de ingredientes (lectura via API)

### Workaround
- **3 queries + merge manual**: La API `/api/admin/pos-ingredients` no puede usar `JOIN` porque no hay FKs definidas en Supabase entre `pos_ingredients`, `pos_ingredient_categories` y `pos_ingredient_costs`. La API hace 3 queries separadas y arma el resultado en un paso final (Step 5: Assemble).

## Dependencias

### Lo usa
- `MenuPanel.tsx` — Invoca `<MenuItemForm>` como modal de creacion/edicion

### Usa a
- `@/lib/utils/formatCOP` — Formateo de precios en COP
- `/api/admin/pos-ingredients` — Listado de ingredientes
- `/api/admin/menu/items/[id]/ingredients` — CRUD de ingredientes asociados
- `/api/admin/menu/items` — CRUD de platos
- `@phosphor-icons/react` — Iconos (X, Plus, Trash, Spinner)

## Pitfalls

- **No hay transaccion al crear**: Al crear un plato nuevo, primero se hace `POST /api/admin/menu/items` y luego se iteran los ingredientes agregados localmente haciendo N llamadas `POST /ingredients` individuales. Si alguna falla, el plato queda sin ingredientes parciales y NO hay rollback.
- **Guardado optimista de ingredientes**: Al agregar/quitar/cambiar cantidad de ingredientes, se llama la API inmediatamente (`POST`/`DELETE`/`PATCH`) pero los errores se ignoran con `.catch(() => {})`. Esto significa que la UI puede mostrar un cambio que no se persistio en BD.
- **Categoria por defecto**: Si `categories[0]?.id` no existe al montar el componente, `categoryId` queda vacio y el submit falla con "Categoria requerida". Asegurar que `categories` siempre tenga al menos un elemento activo.
- **Pills togglean entre agregar/quitar**: El boton del ingrediente en la lista llama a `addIng()` que, si ya esta agregado, lo elimina. Es un toggle silencioso — no hay confirmacion visual clara de la accion destructiva.
- **Single fetch limitado**: El fetch de ingredientes usa `limit=1000` hardcoded. Si hay mas de 1000 ingredientes, los ultimos no aparecen en el selector.
- **Exclusiones de bar/vino**: Se pasan `include_bar=false` y `include_wine=false` siempre. Si se quieren ingredientes de bar/vino en un plato, hay que cambiar esos parametros en el fetch.
- **Calculo de margen depende de `avg_cost`**: Si `avg_cost` es 0 o nulo en `pos_ingredient_costs`, el margen se calcula mal. No hay validacion ni warning visual cuando un ingrediente tiene costo 0.
- **Race condition al crear**: Cuando se crea un plato nuevo y luego se asocian ingredientes secuencialmente, el usuario puede cerrar el modal antes de que terminen las N llamadas y quedar con ingredientes incompletos.

## Historial
| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-05-29 | Ninja | fix: rol reservante en tipos AdminUser, no en este componente per se |
| 2026-05-28 | Ninja | fix: pills de categoria + single fetch en MenuItemForm |
| 2026-05-28 | Ninja | fix: dark theme colors, debug bar removida |
| 2026-05-28 | Ninja | feat: MenuItemForm rewrite — formulario basico funcional para crear platos con ingredientes |
| 2026-05-27 | Ninja | feat: ingrediente por categorias en MenuItemForm — acordeon expandible |
| 2026-05-26 | Ninja | feat: selector de ingredientes POS en MenuItemForm con typeahead, calculo de costo y margen |