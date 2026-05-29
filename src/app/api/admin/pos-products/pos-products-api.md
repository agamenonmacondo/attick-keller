# pos-products/route.ts

- **Que hace**: GET lista productos POS; POST crea producto; PUT actualiza lote
- **Datos**: `pos_products`
- **Auth**: `getAdminUser` — roles super_admin, store_admin
- **Pitfalls**: POST requiere name, unit, category. PUT acepta array para actualizacion en lote