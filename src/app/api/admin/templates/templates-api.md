# templates/route.ts

- **Que hace**: GET lista templates de email; POST crea template; DELETE elimina template por query param id
- **Datos**: `email_templates`
- **Auth**: `getAdminUser` — roles super_admin, store_admin, lider_area
- **Pitfalls**: POST con nombre duplicado retorna 409. DELETE usa query param `?id=UUID`, no body