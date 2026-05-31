# menu/categories/route.ts

- **Que hace**: GET lista categorias de menu; POST crea nueva categoria
- **Datos**: `menu_categories`
- **Auth**: `getAdminUser` — cualquier rol admin
- **Pitfalls**: POST requiere `name`; duplicados por nombre+restaurant_id fallan con 409