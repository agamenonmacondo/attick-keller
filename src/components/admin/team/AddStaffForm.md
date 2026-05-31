# AddStaffForm.tsx

- **Que hace**: Formulario para agregar personal al equipo con seleccion de rol y vinculo a empleado de nomina
- **Datos**: Carga staff activo de /api/admin/pos-nomina-staff?activo=true; llama onAdd(email, role, posNominaStaffId, area)
- **Dependencias**: Phosphor icons (Plus, Warning)
- **Pitfalls**: Roles lider_area/colaborador/reservante requieren posNominaStaffId obligatorio; roles host/store_admin/super_admin no lo necesitan
