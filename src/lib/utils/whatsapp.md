# whatsapp.ts

- **Que hace**: Genera links de WhatsApp y mailto para comunicaciones
- **Datos**: Exporta getWhatsAppLink(phone, message), getEmailLink(email, subject, body)
- **Dependencias**: Usado por ContactActions, ReservationDetail
- **Pitfalls**: Numero de telefono debe incluir codigo pais (57 para Colombia). El mensaje se codifica como URI component.
