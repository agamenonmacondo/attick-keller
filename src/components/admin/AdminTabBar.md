# AdminTabBar.tsx

- **Que hace**: Barra de tabs del admin con 12 tabs: reservas, ocupacion, mesas, plano, metricas, operacion, clientes, menu, equipo, nomina, turnos, app-rodri
- **Datos**: Props active (AdminTab), onChange callback
- **Dependencias**: cn, Phosphor icons (12 iconos especificos)
- **Pitfalls**: AdminTab type define las 12 tabs; agregar un tab requiere actualizar el tipo y el array TABS; overflow-x-auto en mobile
