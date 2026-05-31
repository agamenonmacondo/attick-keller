# menu/items/route.ts

- **Que hace**: GET lista items del menu; POST crea nuevo item
- **Datos**: `menu_items`
- **Auth**: `getAdminUser` — cualquier rol admin
- **Pitfalls**: POST requiere `name`, `price`, `category_id`. Duplicate name retorna 409