# auth/route.ts

- **Que hace**: POST auto-confirma usuario tras signup y envía email de bienvenida; PUT genera enlace de reseteo de password
- **Datos**: `customers` (auto-crea registro), Supabase Auth (admin API)
- **Auth**: Sin autenticacion (usado en flujo publico de signup/reset)
- **Pitfalls**: Usa SERVICE_ROLE_KEY directamente, no tiene autenticacion. POST crea registro en customers si no existe. PUT no revela si el email existe (respuesta generica)