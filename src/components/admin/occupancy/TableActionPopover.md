# TableActionPopover.tsx

- **Que hace**: Popover/bottom-sheet contextual para acciones sobre mesa: ver info de reserva, sentar cliente, marcar no-show, liberar mesa o asignar reserva sin asignar
- **Datos**: Recibe datos de mesa y reservas via props; PATCH `/api/admin/reservations/[id]` con `{status}` para cambios de estado
- **Dependencias**: framer-motion, createPortal, `formatTime` utility, Phosphor icons
- **Pitfalls**: Usa `createPortal` para renderizar fuera del DOM — en mobile se renderea como bottom sheet, en desktop como popover flotante. La posicion se calcula via `getBoundingClientRect` y puede desalinearse si la ventana se redimensiona con el popover abierto