# ContingencyReport.tsx

- **Que hace**: Formulario de reporte de novedades (falta, tarde, permiso, incapacidad) para empleados
- **Datos**: POST a /api/admin/shift-novedades con employeeId, type, date, description
- **Dependencias**: Phosphor icons (WarningCircle, PaperPlaneTilt)
- **Pitfalls**: scheduleId es opcional; tipo falta/tarde/permiso/incapacidad hardcoded en NOVEDAD_TYPES
