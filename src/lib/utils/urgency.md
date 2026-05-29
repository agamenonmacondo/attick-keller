# urgency.ts

- **Que hace**: Calcula nivel de urgencia de una reserva y retorna estilos CSS
- **Datos**: Exporta getUrgencyLevel(reservation), getUrgencyStyles(level)
- **Dependencias**: Usado por ReservationTimeline, HostReservationQueue
- **Pitfalls**: Los niveles son: low, medium, high, critical. Los estilos incluyen colores para dark theme
