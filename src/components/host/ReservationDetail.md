# ReservationDetail.tsx (host)

- **Que hace**: Componente expandible de detalle de reserva dentro del mapa de mesas del host (version compacta del admin)
- **Datos**: Props reservation (ReservationTimeline type), compact (boolean)
- **Dependencias**: Framer Motion, cn, formatTimeRangeColombia, formatTime12, Phosphor icons, getWhatsAppUrl
- **Pitfalls**: Status configurable tiene mapeo completo de 7 estados; getWhatsAppUrl hardcodea prefijo 57; expandible solo si hay detalles (phone/email/requests)
