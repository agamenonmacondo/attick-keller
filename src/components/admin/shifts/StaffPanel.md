# StaffPanel.tsx

- **Que hace**: Tab Personal — CRUD de empleados con lista filtrable por area, formulario de agregar/editar, desglose de costo empresa por persona
- **Datos**: API REST `/api/admin/nomina-staff` (GET filtrado por area, POST crear, PATCH actualizar)
- **Dependencias**: `calcularCostoEmpresa`, `formatCOP`, Phosphor icons (Plus, PencilSimple, Check, X, User, CaretDown, CaretRight)
- **Interfaz StaffRow**: id, nombre_completo, cargo, area, secondary_areas, salario_mensual, alias, sede, cedula, correo, contrato (fijo|turnante), activo, aplica_propinas, auxilio_no_salarial, modalidad, es_medio_tiempo, fecha_ingreso
- **Secciones**:
  1. Resumen KPIs: Total salarios, Auxilios transporte, Costo total empresa (mensual)
  2. Filtro por area + boton Agregar persona
  3. Formulario agregar: se adapta al tipo de contrato (fijo → "Salario mensual", turnante → "Pago por turno")
  4. Lista mobile (tarjetas expandibles) y desktop (tabla con detalle desplegable)
  5. Desglose detallado: Prima, Cesantias, Intereses, Vacaciones, EPS, Pension, ARL, Caja, SENA, ICBF, Auxilio, Propinas
- **Pitfalls**:
  - `costoEmpresaMensual()` es un wrapper de `calcularCostoEmpresa()` que respeta `auxilio_no_salarial` de la BD
  - El formulario de agregar muestra "Pago por turno (COP)" cuando contrato='turnante', con placeholder "Dejar 0 para usar SMLV"
  - Si un turnante se crea con salario 0, `calcularCostoTurnoEmpresa()` usa SMLV ($1.750.905) como fallback
  - Editing inline: al hacer clic en editar, las celdas se convierten en inputs

| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-06-02 | Ninja | costoEmpresaMensual ahora usa calcularCostoEmpresa(). Formulario se adapta a contrato turnante |
