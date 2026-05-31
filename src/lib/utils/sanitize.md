# sanitize.ts

- **Que hace**: Escapa caracteres especiales para queries PostgreSQL ILIKE
- **Datos**: Exporta sanitize(value) → escapa %, _, \
- **Dependencias**: Usado por APIs de busqueda de clientes, productos
- **Pitfalls**: CRITICO — siempre sanitizar input de usuario antes de pasar a ILIKE para prevenir SQL injection via patron
