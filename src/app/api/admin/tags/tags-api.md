# tags/route.ts

- **Que hace**: GET lista tags de clientes; POST crea nuevo tag
- **Datos**: `customer_tags`
- **Auth**: `getAdminUser` — cualquier rol admin
- **Pitfalls**: POST con nombre duplicado retorna 409. Si la tabla no existe, GET retorna array vacio en lugar de error