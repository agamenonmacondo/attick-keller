# Navbar.tsx

- **Que hace**: Barra de navegacion fixed que cambia de transparente a solida al scroll, con CTA Reservar Mesa y link de perfil
- **Datos**: useAuth para mostrar Admin/Mi Perfil segun rol; scroll state via addEventListener
- **Dependencias**: useAuth, cn, Next.js Link, Phosphor icons no utilizados (layout puro)
- **Pitfalls**: El efecto de scroll se registra en mount y se limpia en unmount; useAuth.loading retorna null durante carga
