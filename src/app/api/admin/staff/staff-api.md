# staff-api (route.ts)

## Proposito
API route para gestion del equipo. Permite listar todo el personal con roles y emails (GET), y asignar un rol a un usuario existente por email (POST). Es la unica via para agregar roles desde el frontend (TeamPanel → AddStaffForm).

## Datos
- **GET /api/admin/staff** — Lista staff con roles, emails, estado activo, pos_nomina_staff_id y area
  - Tabla: user_roles (select donde restaurant_id = RESTAURANT_ID y role IN ['host','store_admin','super_admin','lider_area','colaborador','reservante'])
  - Lookup: auth.users via `sb.auth.admin.listUsers()` para obtener emails
  - Workaround: Cruza user_roles con auth.users en memoria porque user_roles no tiene columna email. Se arma un emailMap con Map de userId → email.
- **POST /api/admin/staff** — Asigna un rol a un usuario existente
  - Parametros: email (obligatorio), role (obligatorio), pos_nomina_staff_id (obligatorio para lider_area/colaborador/reservante), area (opcional)
  - Validacion: role debe estar en la lista permitida ['host','store_admin','super_admin','lider_area','colaborador','reservante']
  - Logica: Busca usuario por email en auth.users. Si ya tiene el rol y esta activo → 409. Si tiene el rol pero inactivo → reactiva. Si no tiene el rol → inserta nuevo registro.
  - Tablas: user_roles (insert/update), auth.users (lectura)

## Dependencias
- **Lo usa**: TeamPanel (via AddStaffForm), StaffList
- **Usa a**:
  - getAdminUser — valida que el request venga de un admin
  - getServiceClient — cliente Supabase con service role key
  - RESTAURANT_ID — constante de admin-auth

## Pitfalls
- **listUsers() sin paginacion**: Llama `sb.auth.admin.listUsers()` sin parametros, trae TODOS los usuarios del tenant. En un tenant con muchos usuarios, esto es lento y puede exceder el limite de Supabase (default 1000). Deberia usar paginacion.
- **Busqueda de email case-insensitive**: Usa `toLowerCase()` para comparar emails, lo cual es correcto, pero si Supabase almacena emails con diferente casing, puede fallar.
- **Race condition en POST**: Si dos admins agregan el mismo rol al mismo usuario simultaneamente, ambos pueden pasar la verificacion `existing` y uno recibira error de DB (unique constraint). No hay manejo graceful de este error.
- **Validacion de roles hardcodeada**: La lista de roles validos esta en un array literal, no se sincroniza con la DB ni con el tipo TypeScript. Agregar un rol nuevo requiere cambiar este array Y el formulario frontend Y el middleware.
- **Reactivate sin notificar**: Al reactivar un rol inactivo, no se envia notificacion al usuario. El rol cambia a is_active=true silenciosamente.
- **No hay DELETE endpoint**: Solo esta GET y POST. Para eliminar (que hace TeamPanel via DELETE /api/admin/staff/{id}), el handler esta en otro archivo ([id]/route.ts).
- **pos_nomina_staff_id obligatorio solo para ciertos roles**: La validacion es inconsistente — no se valida que pos_nomina_staff_id sea un ID valido en pos_nomina_staff, solo que exista.

## Historial
| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-05-29 | Ninja | fix: agregar rol reservante al enum, API, formulario y middleware |
| 2026-05-28 | Ninja | fix: panel equipo con pos_nomina_staff_id y area para colaboradores + API actualizados |
| 2026-05-28 | Ninja | fix: agregar lider_area y colaborador como roles validos en API staff |