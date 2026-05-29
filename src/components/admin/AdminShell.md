# AdminShell

## Proposito
Layout principal del panel de administracion. Componente orquestador que maneja autenticacion (redirige a login si no hay user, a /perfil si no es admin), navegacion por tabs, y renderizado condicional de los 11 paneles segun el tab activo. Es el entry point de toda la seccion /admin.

## Datos
- **useAuth()** — Obtiene user, loading, isAdmin, roleLoading del AuthProvider
- **router.push('/auth/login')** — Redirige si no hay user
- **router.replace('/perfil')** — Redirige si user no es admin
- No consume APIs directamente. Solo orquesta componentes hijos.

## Dependencias
- **Lo usa**: src/app/admin/page.tsx (o layout equivalente)
- **Usa a**:
  - AuthProvider (via useAuth hook) — autenticacion
  - AdminHeader — encabezado del admin
  - AdminTabBar — barra de tabs con tipo AdminTab
  - ReservationsPanel, OccupancyPanel, MetricsPanel, POSDashboardPanel, CustomersPanel, MenuPanel, TeamPanel, TablesPanel, FloorPlanMap, NominaUnifiedPanel, RodriPanel, ShiftSchedulePanel — paneles hijos

## Pitfalls
- **Auth check bloqueante**: Si `authLoading || roleLoading` es true, renderiza un spinner a pantalla completa. Si el AuthProvider tarda, el usuario ve pantalla en blanco sin contexto.
- **Redireccion sin estado**: Usa `router.push` y `router.replace` sin guardar el tab activo. Al volver al admin, siempre arranca en 'reservas' (default de useState).
- **No hay lazy loading**: Todos los paneles se importan estaticamente. Si el admin crece, el bundle initial incluye TODOS los paneles. Considerar dynamic imports.
- **selectedDate solo para reservas**: selectedDate/onDateChange se pasan solo a ReservationsPanel y OccupancyPanel, pero el estado vive en AdminShell. Si otros paneles necesitan fecha, hay que elevar mas logica.
- **isAdmin es binario**: Solo distingue admin vs no-admin. No filtra tabs por rol (lider_area ve los mismos tabs que super_admin). El middleware esta en el backend, pero el UI muestra todo.
- **return null despues de redirect**: Si user o isAdmin fallan, retorna null DESPUES de llamar router.push. Esto puede mostrar un flash de contenido vacio antes de que la navegacion ocurra.

## Historial
| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-05-28 | Ninja | chore: stage remaining shift files and minor auth changes |
| 2026-05-26 | Ninja | feat: merge nomina and contable tabs into unified panel |
| 2026-05-26 | Ninja | feat: nomina contable + ops costs with revenue ratios |
| 2026-05-24 | Ninja | feat: add Nomina tab with biometrico data dashboard |
| 2026-05-22 | Ninja | feat: Dashboard Operativo POS - tab Operacion con KPIs por zona y categoria |
| 2026-05-20 | Ninja | feat: dark mode completo - ThemeProvider, CSS vars, toggle Sun/Moon |
| 2026-05-03 | Ninja | feat: add interactive floor plan map (Plano tab) |
| 2026-05-03 | Ninja | feat: table inventory module - admin panel for zones, tables, combinations |