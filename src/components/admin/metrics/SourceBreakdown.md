# SourceBreakdown.tsx

- **Que hace**: Desglose visual de fuentes de reserva (Web, WhatsApp, Telefono, Presencial, Instagram) con barras de progreso horizontales y porcentajes
- **Datos**: Recibe `sources` (Array<{source, count}>) via props del hook `useAdminMetrics`
- **Dependencias**: SectionHeading
- **Pitfalls**: Los labels y colores estan hardcoded en `SOURCE_COLORS` y `SOURCE_LABELS` — si la API devuelve una fuente nueva (ej: "facebook"), no se mostrara con color adecuado y usara fallback genérico