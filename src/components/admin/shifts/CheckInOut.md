# CheckInOut.tsx

- **Que hace**: Boton de check-in/check-out con verificacion de ubicacion GPS (200m del restaurante)
- **Datos**: Props assignmentId, hasCheckin, hasCheckout, callbacks onCheckin/onCheckout con location data
- **Dependencias**: Phosphor icons (MapPin, CheckCircle, XCircle)
- **Pitfalls**: RESTAURANT_LOCATION hardcodeado (6.217, -75.567 — Medellin?); navigator.geolocation puede fallar en HTTP; distancia maxima 200m
