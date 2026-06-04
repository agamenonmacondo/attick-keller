# /api/admin/nomina-staff

- **Metodos**: GET, POST, PATCH
- **Que hace**: CRUD de empleados (personal de nomina) para el sistema de turnos
- **Datos**: Tabla `pos_nomina_staff` + `staff_aliases` (para alias)
- **GET**: 
  - Query params: `?area=` (opcional, filtra por area)
  - Retorna staff con campos: id, nombre_completo, cargo, area, secondary_areas, salario_mensual, alias, sede, cedula, correo, contrato, activo, aplica_propinas, auxilio_no_salarial, modalidad, es_medio_tiempo, fecha_ingreso
- **POST**:
  - Body: `{ nombre_completo, cargo, area, contrato, cedula?, correo?, salario_mensual, alias? }`
  - Crea en `pos_nomina_staff` con sede fija dependiendo del area
- **PATCH**:
  - Body: `{ id, nombre_completo?, cargo?, area?, contrato?, cedula?, correo?, salario_mensual?, activo? }`
  - Actualiza campos enviados
- **Pitfalls**:
  - `salario_mensual` se persiste como `salario` en la BD (naming legacy de SoftRestaurant)
  - La sede se asigna implicitamente (no es parametro del request)

| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-06-02 | Ninja | Creacion del doc |
