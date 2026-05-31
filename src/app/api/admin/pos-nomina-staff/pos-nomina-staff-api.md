# pos-nomina-staff/route.ts

- **Que hace**: GET lista personal activo del POS para dropdowns de nomina
- **Datos**: `pos_nomina_staff` (WHERE activo=true)
- **Auth**: `getAdminUser` — cualquier rol admin
- **Pitfalls**: Retorna solo id, nombre_completo, cargo, area. Ordenado por nombre