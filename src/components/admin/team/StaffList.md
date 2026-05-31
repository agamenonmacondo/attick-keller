# StaffList.tsx

- **Que hace**: Lista de personal con toggle activo/inactivo y boton de eliminar con confirmacion
- **Datos**: Props staff[] con id, email, role, is_active, pos_nomina_staff_id, area
- **Dependencias**: Phosphor icons (ToggleLeft, ToggleRight, Trash, Warning)
- **Pitfalls**: ROLE_LABELS y ROLE_COLORS hardcoded para 5 roles; confirmDeleteId es estado local peligroso si se re-renderiza
