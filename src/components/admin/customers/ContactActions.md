# ContactActions.tsx

- **Que hace**: Botones de accion rapida para contactar cliente: WhatsApp link y email link
- **Datos**: Recibe phone, email, name via props
- **Dependencias**: `whatsappLink`, `emailLink` de `@/lib/utils/whatsapp`
- **Pitfalls**: Link de WhatsApp asume codigo pais +57; si el telefono ya tiene prefijo, se duplica