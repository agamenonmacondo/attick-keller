# VisitHistory.tsx

- **Que hace**: Tabla de historial de visitas de un cliente mostrando fecha, monto, personas y rating con estrellas
- **Datos**: Recibe `visits` (Array<Record<string, unknown>>) via props desde CustomerDetail
- **Dependencias**: Phosphor Star icon, `formatDate`, `formatCOP`
- **Pitfalls**: Los ratings se muestran como estrellas pero el campo viene como numero sin validacion — si `visit.rating` es undefined, no muestra estrellas