# AdminHeader.tsx

- **Que hace**: Header del panel admin con logo Attick & Keller, badge Admin, link a /host (Piso), toggle de tema, email y logout
- **Datos**: useAuth (user, signOut), useTheme (toggle)
- **Dependencias**: useAuth, useTheme, Next.js Link, useRouter, Phosphor icons (SignOut, Sun, Moon)
- **Pitfalls**: router.push('/auth/login') despues de signOut; link /host solo visible en sm+ (hidden sm:hidden por defecto)
