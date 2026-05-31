# menu (public)/route.ts

- **Que hace**: GET menu publico: categorias y items activos
- **Datos**: `menu_categories`, `menu_items` (solo WHERE is_available=true)
- **Auth**: Sin autenticacion (endpoint publico)
- **Pitfalls**: Restaurant ID hardcoded (a0000000-0000-0000-0000-000000000001). No filtra por horario ni disponibilidad dinámica