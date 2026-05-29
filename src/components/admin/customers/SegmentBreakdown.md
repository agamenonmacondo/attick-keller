# SegmentBreakdown.tsx

- **Que hace**: Desglose visual de segmentos de clientes (VIP, regular, ocasional, nuevo, sin actividad) con iconos, barras de progreso y porcentajes
- **Datos**: Recibe `segments` (Record<string, number>) y `total` via props del analytics overview
- **Dependencias**: AnimatedCard, Phosphor icons (Crown, Medal, ThumbsUp, Sparkle, Minus)
- **Pitfalls**: Mapea claves `vip`, `regular`, `occasional`, `new`, `none` a configuracion hardcoded — si la API devuelve claves diferentes, no se mostraran