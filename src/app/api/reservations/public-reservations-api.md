# reservations (public)/route.ts

- **Que hace**: POST crea reserva publica (auto-asigna mesa via algoritmo); PUT modifica reserva; PATCH cambia estado (incluye cancelar); GET no disponible
- **Datos**: `customers`, `reservations`, `tables`, `table_zones`, `table_combinations`, `availability`
- **Auth**: Usuario autenticado (customer) via cookies. PATCH/PUT permite admin o owner
- **Pitfalls**: POST crea o busca customer automaticamente (by auth_user_id, then email, then phone). PUT re-asigna mesa si cambia zone_id o party_size. PATCH: owners solo pueden cancelar, admins pueden cambiar cualquier estado. Emails fire-and-forget