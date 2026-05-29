# zones (public)/route.ts

- **Que hace**: GET lista zonas disponibles para reserva (solo id y nombre)
- **Datos**: `table_zones` (WHERE restaurant_id, ORDER BY name)
- **Auth**: Sin autenticacion (endpoint publico)
- **Pitfalls**: Restaurant ID hardcoded. Solo retorna id y name (sin mesas, sin configuracion)