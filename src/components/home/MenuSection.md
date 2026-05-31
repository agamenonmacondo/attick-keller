# MenuSection.tsx

- **Que hace**: Seccion de menu publico con tabs por categoria, items con precio, y animaciones de entrada (staggered)
- **Datos**: GET /api/menu (categorias + items); filtra items por categoria seleccionada
- **Dependencias**: Framer Motion, fetch interno
- **Pitfalls**: Carga todas las categorias e items de una vez; scroll automatico al panel al cambiar categoria; featured items tienen estilo especial
