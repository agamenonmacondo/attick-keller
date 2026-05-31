# MenuPanel

## Proposito
Panel de gestion del menu del restaurante con 3 tabs: Menu del Sitio (categorias y platos con CRUD completo), Catalogo POS (productos del POS agrupados por categorias, con detalle de costo/receta al hacer click), y Vinculacion (mapeo entre platos del menu y productos del POS con busqueda y verificacion). Es el componente mas grande del admin (~1200 lineas).

## Datos
- **GET /api/admin/menu** — Carga categorias y platos del menu del sitio
- **PATCH /api/admin/menu/items/{id}** — Actualiza disponibilidad, pos_product_id de un plato
- **DELETE /api/admin/menu/items/{id}** — Oculta (soft-delete) un plato del menu
- **PATCH /api/admin/menu/categories/{id}** — Actualiza is_active de una categoria
- **GET /api/admin/pos-products?q=X&group_id=Y&linked=true&unlinked=true&limit=200&offset=0** — Busca productos POS con filtros
- **POST /api/admin/pos-products** — Agrega un producto POS al menu del sitio (crea menu_item)
- **GET /api/admin/pos-products?linked=true&limit=200&offset=0** — Carga datos de vinculacion (mappings)
- **PATCH /api/admin/pos-products/mappings/{id}** — Verifica un mapeo (marca verified=true)
- **GET /api/admin/menu/{id}/recipe** — Carga receta de un plato (ingredientes, costos, margen)
- **GET /api/admin/pos-products/{id}** — Carga detalle de producto POS con receta
- **Tablas**: menu_categories, menu_items, pos_products, pos_groups, menu_item_pos_mappings, pos_ingredients, recipe_ingredients
- **Workaround**: RESTAURANT_ID hardcoded como 'a0000000-0000-0000-0000-000000000001'. No hay multi-tenant real.

## Dependencias
- **Lo usa**: AdminShell (tab 'menu')
- **Usa a**:
  - MenuItemForm — formulario de creacion/edicion de platos
  - CategoryForm — formulario de creacion/edicion de categorias
  - AnimatedCard — componente de animacion de entrada
  - formatCOP — utilidad de formateo de moneda COP

## Pitfalls
- **3 fetchers independientes con useEffect**: fetchMenu, fetchPOSProducts, fetchMappings se disparan segun activeTab. fetchPOSProducts tiene dependencias [posSearch, posGroupFilter] — cada cambio de filtro re-ejecuta el fetch completo sin debounce.
- **RESTAURANT_ID hardcoded**: La constante `RESTAURANT_ID` esta hardcodeada en vez de obtenerse del contexto o auth. Si se agrega multi-tenant, hay que cambiarlo.
- **Silent failure pattern**: La mayoria de handlers usan `catch { // Silently fail }`. Errores de red o permisos se tragan enteros — el usuario no recibe feedback de fallo.
- **Recipe panel state dual**: Hay estado separado para recipe de menu items (`recipeItem`/`recipeData`) y recipe de POS products (`posRecipeProduct`/`posRecipeData`). Logica duplicada, facil confundir ambos.
- **AddModal state sprawl**: addModalProduct, addModalCategory, adding, addError — 4 estados para el modal de agregar POS al menu. Facil dejar modal abierto si hay error y el usuario cierra de otro modo.
- **Link search sin debounce**: handleLinkSearch ejecuta fetch si query.length >= 2 sin debounce. En conexiones lentas, dispara many requests.
- **Mapping verification**: handleVerifyMapping solo setea verified=true via PATCH. No maneja el caso donde el mapeo fue eliminado concurrentemente por otro admin.
- **PosProducts fetch con linked+unlinked**: Al cargar POS catalog, pide ambos linked y unlinked, pero la respuesta no distingue claramente en el frontend — depende de pos_product_id vinculado al menu_item para determinar estado.
- **Estado expandido de categorias**: Se expanden TODAS las categorias por default al cargar. Si hay muchas, el scroll vertical puede ser problematico en mobile.

## Historial
| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-05-29 | Ninja | feat: click en producto POS muestra detalle de costo con ingredientes y margen |
| 2026-05-29 | Ninja | feat: catalogo POS con navegacion por categorias - click para expandir productos |
| 2026-05-29 | Ninja | feat: catalogo POS agrupado por categorias con precio y badge de conteo |
| 2026-05-29 | Ninja | fix: corregir camelCase en recipe unitCost/totalCost |
| 2026-05-29 | Ninja | feat: vincular menu del sitio con catalogo POS - tabs catalogo/vinculacion/receta - API pos-products + recipe |
| 2026-05-20 | Ninja | feat: dark mode completo - calendario, clientes, host, floorplan, metricas |
| 2026-05-20 | Ninja | feat: dark mode completo - ThemeProvider, CSS vars, toggle Sun/Moon |