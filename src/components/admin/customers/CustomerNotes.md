# CustomerNotes.tsx

- **Que hace**: Textarea editable para notas internas de un cliente con guardado automatico via PATCH
- **Datos**: PATCH `/api/admin/customers/[customerId]` con `{notes: string}`
- **Dependencias**: Ninguna dependencia externa significativa
- **Pitfalls**: El guardado usa `setSaved(true)` con setTimeout de 2s para el feedback — si el componente se desmonta antes, el timeout no se limpia (leak menor)