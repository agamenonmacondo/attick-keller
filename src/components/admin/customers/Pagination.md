# Pagination.tsx

- **Que hace**: Control de paginacion generico con selector de items por pagina, botones anterior/siguiente y numeros de pagina con elipsis
- **Datos**: Recibe page, totalPages, total, perPage, onPageChange, onPerPageChange via props
- **Dependencias**: `cn` utility, Phosphor CaretLeft/CaretRight
- **Pitfalls**: Si `totalPages` cambia externamente mientras el usuario esta en una pagina alta, no resetea automaticamente a pagina 1