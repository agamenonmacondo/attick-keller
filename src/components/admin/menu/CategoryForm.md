# CategoryForm.tsx

- **Que hace**: Formulario modal para crear/editar categorias del menu (nombre, descripcion, icono, sort_order)
- **Datos**: POST /api/admin/menu/categories (crear) o PATCH /api/admin/menu/categories/:id (editar)
- **Dependencias**: Phosphor X icon
- **Pitfalls**: sort_order=0 por defecto al crear; no hay validacion de nombre duplicado en frontend
