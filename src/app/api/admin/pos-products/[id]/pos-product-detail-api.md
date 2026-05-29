# pos-products/[id]/route.ts

- **Que hace**: PATCH actualiza un producto POS individual; DELETE elimina
- **Datos**: `pos_products`
- **Auth**: `getAdminUser` — roles super_admin, store_admin
- **Pitfalls**: DELETE es soft (marca is_active=false). PATCH acepta campos parciales