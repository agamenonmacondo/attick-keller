# shift-schedules-api (route.ts)

## Proposito
API route para cronogramas de turnos. Permite obtener un cronograma completo con personal y tipos de turno (GET), y crear un nuevo cronograma vacio (POST). Es la fuente de datos principal para ShiftSchedulePanel.

## Datos
- **GET /api/admin/shift-schedules?area=X&week_str=Y** — Obtiene datos completos para armar el cronograma
  - Parametros requeridos: area (cocina/barra/servicio), week_str (formato ISO: 2026-W23)
  - Queries:
    1. `shift_schedules` — Busca schedule para area+week_str, ordenado por version desc, limite 1 (toma la version mas reciente)
    2. Si no hay schedule: carga personal base y tipos de turno sin asignaciones
    3. Si hay schedule: carga `shift_assignments` para ese schedule_id
    4. `pos_nomina_staff` — Personal del area, filtrado por sede='C75', excluyendo areas 'apoyo' y 'admin', incluyendo secondary_areas via operador `.cs.{area}`
    5. `shift_types` — Tipos de turno del area, ordenados por code
    6. `staff_aliases` — Aliases del personal, cruzado por employee_id
  - Workaround: 3-4 queries separadas + merge manual + alias fallback (primer nombre). No usa joins ni relaciones de Supabase.
  - Tablas: shift_schedules, shift_assignments, pos_nomina_staff, shift_types, staff_aliases

- **POST /api/admin/shift-schedules** — Crea un nuevo cronograma vacio
  - Parametros: area, week_str (obligatorios)
  - Logica: Valida permiso de admin, crea registro en shift_schedules con status='draft', version=1
  - Tabla: shift_schedules (insert)
  - Nota: El ShiftTypeEditor usa esta misma ruta con action='create_shift_type' en el body para crear tipos de turno

## Dependencias
- **Lo usa**: ShiftSchedulePanel, ShiftTypeEditor (interno)
- **Usa a**:
  - getAdminUser — valida permisos de admin
  - getServiceClient — cliente Supabase service role
  - RESTAURANT_ID — constante de admin-auth

## Pitfalls
- **version siempre = 1**: Al crear schedule, siempre setea version=1. Si se quiere soportar versiones (borrador → revision), la logica de versionado no existe. GET si ordena por version desc, pero POST no incrementa.
- **Sede hardcoded 'C75'**: El filtro `.eq('sede', 'C75')` esta hardcodeado. Si el restaurante tiene mas sedes o cambia el codigo, hay que modificar este endpoint.
- **Operador `.cs.{area}` para secondary_areas**: Usa el operador `cs` (contains) de PostgREST para buscar `secondary_areas` que contengan el area. Si secondary_areas es null, este filtro podria no funcionar correctamente — verificar que todos los registros tengan un array valido.
- **Alias fallback poco robusto**: Si no hay alias en staff_aliases, usa `nombre_completo.split(' ')[0]` (primer nombre). Esto falla si nombre_completo es vacio o tiene formato inesperado.
- **Salario mapeado a salario_mensual**: La consulta selecciona `salario` de pos_nomina_staff pero el frontend espera `salario_mensual`. El GET mapea explicitamente `salario_mensual: s.salario ?? 0` para compensar. Si se cambia la consulta o se agrega unselect, se rompe el calculo de costos.
- **No valida permiso por area**: Los comentarios dicen "TODO: verificar area del lider cuando user_roles tenga columna area" — un lider_area puede crear cronogramas de cualquier area.
- **Doble logica para personal**: El codigo para obtener staff + aliases se repite casi exacto en la rama "no hay schedule" y "si hay schedule" (lineas 34-63 vs 79-108). Cambios en uno deben replicarse en el otro.
- **POST action=create_shift_type**: El ShiftTypeEditor envia `{ action: 'create_shift_type', ... }` a la misma ruta, pero el handler POST no distingue esta action. Si hay un handler separado, esta logica esta en otro archivo. Si no, crear tipo de turno podria crear un schedule vacio por error.

## Historial
| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-05-28 | Ninja | fix: indentacion corregida en shift-schedules API |
| 2026-05-28 | Ninja | fix: mapear salario -> salario_mensual en shift-schedules API para que costos calcule correctamente |
| 2026-05-28 | Ninja | fix: modulo turnos — arreglar calculo HE, quitar apoyo del cronograma, agregar tab Personal |