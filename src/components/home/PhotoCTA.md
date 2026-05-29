# PhotoCTA.tsx

- **Que hace**: Seccion full-bleed con grid de 3 fotos (ak_photo_01/05/08.jpg), overlay con CTA Reservar Mesa
- **Datos**: Ninguno — fotos hardcodeadas desde /public
- **Dependencias**: Framer Motion (useInView), Next.js Link
- **Pitfalls**: Las fotos (ak_photo_01.jpg, etc.) deben existir en /public; animacion se dispara con intersection observer once=true
