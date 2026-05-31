# staff/list-employees/route.ts

- **Que hace**: GET lista empleados activos para dropdowns (id, nombre, cargo, area)
- **Datos**: `pos_nomina_staff` (WHERE activo=true)
- **Auth**: `getAdminUser` — cualquier rol admin
- **Pitfalls**: Retorna solo campos minimos para selects. Ordenado por nombre_completo