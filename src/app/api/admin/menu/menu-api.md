# menu/route.ts

- **Que hace**: GET devuelve todo el menu: categorias e items para administracion
- **Datos**: `menu_categories`, `menu_items`
- **Auth**: `getAdminUser` — cualquier rol admin
- **Pitfalls**: Retorna todo sin paginar. Los items se ordenan por sort_order