# HostQuickActions.tsx

- **Que hace**: Boton de accion rapida Confirmar llegada que envia PATCH a la siguiente reserva confirmed
- **Datos**: Props onSeatNext callback, confirmedCount (numero de reservas confirmadas)
- **Dependencias**: cn, Phosphor Armchair
- **Pitfalls**: Se deshabilita si confirmedCount=0; la logica de cual reserva sentar esta en HostShell
