# HostHeader.tsx

- **Que hace**: Header del panel Host con logo, badge Host, reloj en tiempo real, toggle de tema, link a admin y logout
- **Datos**: useAuth (user, signOut, isAdmin), useTheme (toggle)
- **Dependencias**: useAuth, useTheme, Phosphor icons (SignOut, Clock, Sun, Moon), Next.js Link
- **Pitfalls**: Reloj se actualiza cada segundo con setInterval; link a /admin solo visible si isAdmin=true
