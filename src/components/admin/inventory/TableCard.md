# TableCard.tsx

- **Que hace**: Tarjeta individual de mesa mostrando numero, nombre attick, capacidad, zona, toggle activo/inactivo y boton de editar
- **Datos**: Recibe objeto `Table` y callbacks `onToggle`, `onEdit` via props
- **Dependencias**: Tipo `Table` de `@/lib/types/inventory`, Phosphor PencilSimple
- **Pitfalls**: Muestra `capacity_min` como rango solo cuando difiere de `capacity` — si ambos son iguales, muestra solo un numero