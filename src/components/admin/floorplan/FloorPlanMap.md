# FloorPlanMap.tsx

- **Que hace**: Mapa interactivo SVG del piso con mesas posicionables, estados de color (disponible/reservada/ocupada), sidebar de detalle y edicion de posiciones drag-and-drop
- **Datos**: Hook `useFloorPlan` (API `/api/admin/floor-plan`), PATCH para actualizar posiciones, reservations para overlay de estado
- **Dependencias**: framer-motion, `usePrefersReducedMotion`, Phosphor icons
- **Pitfalls**: 925 lineas — componente mas grande del proyecto. Las posiciones se guardan como coordenadas SVG (no pixels); el drag usa `pointer-events` que se desactiva durante animacion. Las mesas no posicionadas se muestran en sidebar aparte