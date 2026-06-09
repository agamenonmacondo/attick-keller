# Attick & Keller — Sistema de Componentes

> Documentación viva del sistema. Última actualización: junio 2026.

## Arquitectura General

```
┌─────────────────────────────────────────────────┐
│  Next.js 16 App (src/)                         │
│  ├── /admin       → AdminShell (panel gerencial)│
│  ├── /host        → HostShell  (anfitriones)   │
│  ├── /reservar    → ReservarPage (público)      │
│  ├── /perfil      → PerfilPage (cliente)        │
│  ├── /mi-turno    → MiTurnoPage (empleados)     │
│  └── /auth/login  → LoginPage                   │
├─────────────────────────────────────────────────┤
│  Backend: Next.js API Routes (/api/)            │
│  ├── /api/admin/*    → 50+ endpoints (auth req) │
│  ├── /api/reservations → CRUD reservas         │
│  ├── /api/host/*     → datos anfitrión          │
│  ├── /api/availability → disponibilidad mesas   │
│  └── /api/auth       → autenticación            │
├─────────────────────────────────────────────────┤
│  Base de Datos: Supabase (PostgreSQL)           │
│  ├── Tablas: pos_sales, pos_sale_items,         │
│  │   pos_products, pos_product_recipes,         │
│  │   pos_ingredient_costs, pos_purchases,      │
│  │   reservations, customers, shift_*,          │
│  │   pos_nomina_staff, user_roles, etc.         │
│  └── RPCs: pos_dashboard_kpis,                  │
│      pos_dashboard_daily, get_analytics_overview,│
│      pos_dashboard_product_hourly,               │
│      get_product_margins                         │
└─────────────────────────────────────────────────┘
```

---

## A. Panel Admin (`/admin`)

### A.1 AdminShell.tsx
**Propósito:** Shell raíz del panel administrativo. Controla la navegación por tabs.
- **Props:** Ninguna (componente de página)
- **Datos:** `useAuth()` para verificación de rol
- **Renderiza:** `AdminHeader`, `AdminTabBar`, contenido según tab activo
- **Tabs:** Operación, Resultados, Costos, Catálogo, Informes, Turnos, Nomina, Equipo, Clientes

### A.2 AdminHeader.tsx
**Propósito:** Barra superior con nombre del restaurante, badge de rol, toggle dark/light
- **Datos:** `useAuth()` (nombre, rol), `useTheme()` (dark mode)
- **Dependientes:** AdminShell

### A.3 AdminTabBar.tsx
**Propósito:** Navegación horizontal con íconos Phosphor
- **Props:** `activeTab`, `onTabChange`
- **Dependientes:** AdminShell

---

## B. POS Dashboard (`src/components/admin/pos-dashboard/`)

### Diagrama de Datos

```
usePOSDashboard(filters)
  └── GET /api/admin/pos-dashboard?zone=&category=&from=&to=
      └── Supabase RPC: pos_dashboard_kpis, pos_dashboard_daily
      └── Retorna: POSDashboardData

usePOSDayOfWeekDetail(dayOfWeek, zone, category, from, to)
  └── GET /api/admin/pos-dashboard/day-of-week?...
      └── Mismas RPCs filtradas por día de semana
      └── Retorna: POSDashboardData

useProductMargins(from, to, category)
  └── GET /api/admin/informes-rayo/margins?...
      └── Supabase RPC: get_product_margins
      └── Retorna: MarginsData (kpis, importan, drenan, todos)

useProductoHourly()
  └── GET /api/admin/informes-rayo/productos-hora?...
      └── Supabase RPC: pos_dashboard_product_hourly
      └── Retorna: ProductoHoraItem[]
```

### Componentes

| Componente | Propósito | Datos (de dónde) | Renderiza |
|---|---|---|---|
| **POSDashboardPanel** | Orquestador principal. Tabs: Operación, Resultados, Costos, Catálogo. Filtros de fecha/zona/categoría. Clck en día → DetailPanel. | `usePOSDashboard(filters)`, `usePOSDashboard(resultsFilters)`, `usePOSDayOfWeekDetail()`, `useProductMargins()` | Todos los sub-componentes de POS |
| **POSDailyTrendChart** | Barras de revenue por día de semana (Lun-Dom). Click → detalle por día. | Props: `data[]` (dates con revenue/cheques/propina), `onDayClick` | Recharts BarChart |
| **DayOfWeekMasterPanel** | Panel inmersivo al seleccionar un día. KPIs, zonas, horas, categorías, personal, pagos. Filtros zona/categoría propios. Drill-downs. | Props: `dayData`, `data: POSDashboardData` | DayOfWeekDetailCard, KPIRow, ZoneRevenueChart, HourlyRevenueChart, etc. |
| **DayOfWeekDetailCard** | Tarjeta resumen de un día específico (KPIs + comparación) | Props: `dayData`, `data` | Inline KPIs |
| **CategoryDayDetail** | Desglose por categoría para un día seleccionado | Props: `dayData` | Inline tables |
| **DrillDownPanel** | Panel de detalle al hacer click en producto/zona/personal. Tabs internos con datos granulares. | Props: `type`, `id`, `from`, `to`, datos del hook padre | Tablas detalladas |
| **HourlyRevenueChart** | Barras de revenue por hora del día | Props: `data[]` (hourly) | Recharts BarChart |
| **KPIRow** / **KPICard** | Fila de tarjetas KPI (ventas, cheques, ticket, propina, personas) | Props: métricas + deltas | Números animados |
| **RevenueHeatmapCalendar** | Calendario tipo heatmap con color por monto diario. Click → filtrar por fecha. | Props: `dailyTrend[]`, `onDayClick` | Grid de días coloreados |
| **ZoneRevenueChart** | Donut de revenue por zona | Props: `zones[]` | Recharts PieChart |
| **TopProductsTable** | Tabla de top productos vendidos | Props: `products[]` | Tabla ordenable |
| **StaffPerformanceTable** | Tabla de rendimiento del personal | Props: `staff[]` | Tabla |
| **PaymentMethodsChart** | Donut de métodos de pago | Props: `methods[]` | Recharts PieChart |
| **CategoryBreakdown** | Categorías expandibles con productos internos | Props: `categories[]` | Lista expandible |
| **TopProductByCategoryChart** | Barras horizontales: top producto por categoría | Props: `categories[]` | Recharts BarChart |
| **CategoryCompanionsCard** | Qué categorías se piden juntas | Props: `companions[]` | Lista de pares |
| **AnimatedCard** | Wrapper con fade-in al montar | Props: `delay`, `className` | `<div>` animado |
| **SectionHeading** | Título de sección estilizado | Props: `children`, `className` | `<h3>` |

### Flujo de Filtros (3 capas independientes)

```
Operación ──→ filters (zone, category, from, to)
Resultados ──→ resultsFilters (resultsZone, resultsCategory, 2026-01-01 a 2026-06-30)
Día de semana → dayDetailZone, dayDetailCategory (propios del detail panel)
```

Cada capa tiene sus propios handlers de zona/categoría. No se comparte estado entre capas.

---

## C. Informes Rayo (`src/components/admin/informes/`)

### Diagrama de Datos

```
useInformesRayo()
  └── GET /api/admin/informes-rayo?from=&to=&zone=&compareFrom=&compareTo=
      └── Supabase: pos_sales, pos_sale_items, pos_product_groups, pos_products
      └── Retorna: { kpis, daily, zones, staff, payments, clientSplit, topProducts, comparison }

useProductMargins(from, to, category?)
  └── GET /api/admin/informes-rayo/margins?from=&to=&category=
      └── Supabase RPC: get_product_margins
      └── Retorna: { kpis, resumen_ejecutivo, importan, drenan, todos }

useProductoHourly()
  └── GET /api/admin/informes-rayo/productos-hora?from=&to=&zone=
      └── Supabase RPC: pos_dashboard_product_hourly
      └── Retorna: ProductoHoraItem[]

GET /api/admin/informes-rayo/analyze-v2?from=&to=
  └── Groq API (gpt-oss-120b) → análisis IA en español
  └── Fallback: reglas locales si Groq falla
```

### Componentes

| Componente | Propósito | Datos | Renderiza |
|---|---|---|---|
| **InformesRayoPanel** | Orquestador de informes. PeriodSelector, KPIs, Rentabilidad, Dashboard, AnalisisIA, PDF. | `useInformesRayo`, `useProductMargins` | Todos los sub-componentes |
| **PeriodSelector** | Selector de período con presets (hoy, ayer, 7d, 30d, este mes, custom) + comparación | Props: `period`, `onPeriodChange` | Controles de fecha |
| **MetricasClave** | 6 KPIs con deltas: Ventas, Cheques, Ticket Prom, Personas, Propina, Prop/Persona | Props: `metricas`, `vs?` | 6 tarjetas KPI |
| **RentabilidadPanel** | Panel de rentabilidad: resumen ejecutivo, semáforos por macrocategoría, top importan/drenan, bullets para junta | `useProductMargins()` | Inline cards con semáforos |
| **ProductoDesgloseTable** | Heatmap de ventas por producto × hora del día | Props: `producto`, `hourlyData`, `dailyData` | Grid coloreado |
| **InformesDashboard** | Gráficas de informes: top productos (barras), pagos (donut), zonas (tabla) | Props: `data.topProducts`, `data.paymentMethods`, `data.zones` | Recharts |
| **AnalisisIA** | Análisis de IA (Groq) con secciones estructuradas. Fallback a reglas locales. | fetch `/api/admin/informes-rayo/analyze-v2` | Secciones de texto |
| **PDFExportButton** | Genera PDF 4 páginas (portada, datos, análisis, junta) vía html2canvas + jsPDF | fetch margins + analyze-v2 APIs | Botón de descarga |

---

## D. Turnos y Nómina (`src/components/admin/shifts/`)

### Diagrama de Datos

```
useShiftData(area, weekStr)
  └── Supabase directo: shift_types, pos_nomina_staff, staff_aliases,
      shift_schedules, shift_assignments

useSalesAverages()
  └── GET /api/admin/sales-averages
      └── Supabase: pos_sales (histórico por día de semana)

useNomina(from, to)
  └── GET /api/admin/nomina?from=&to=
      └── Supabase: pos_nomina_staff, shift_novedades, shift_assignments

useNominaOpsCosts(periodo, sede)
  └── GET /api/admin/nomina/ops-costs?periodo=&sede=
```

### Componentes

| Componente | Propósito | Datos | Renderiza |
|---|---|---|---|
| **ShiftSchedulePanel** | Orquestador de turnos. Tabs: cronograma, nómina, referencia, horarios, personal. | `useShiftData(area, weekStr)`, `useTheme()` | ShiftGrid, CostEstimationBar, StaffPanel, ShiftTypeModal, ShiftTimelineView |
| **ShiftGrid** | Grilla semanal (empleados × días) con selectores de turno, alertas legales, costos por empleado | Props: staff, shiftTypes, assignments, grid, onChange | Tabla interactiva + versión móvil |
| **CostEstimationBar** | Costo estimado por semana: desglose por empleado (salario base, recargo nocturno, dominical, HE), resumen por área | Props: staff, shiftTypes, grid, weekStr | Recharts BarChart + tabla |
| **SalesReferenceTab** | Cruza costos de nómina vs ventas históricas. Ratio nómina/ventas por día. | `useSalesAverages()` | KPIs + tabla de referencia |
| **StaffPanel** | CRUD de empleados: nombre, cargo, área, salario, tipo contrato | fetch `/api/admin/nomina-staff` | Tabla editable + cards móviles |
| **ShiftTypeModal** | Modal crear/editar tipo de turno con segmentos (turnos partidos), presets, cálculo horas automático | Props: `isOpen`, `area`, `shiftType?`, `onSave` | Formulario con TimeSelect |
| **MyShiftView** | Vista del empleado: su horario semanal, check-in/out, novedades | fetch `/api/admin/shift-my-week` | Lista de días con botones |
| **ContingencyReport** | Formulario de novedades (ausencia, tardanza, permiso médico) | Props: `employeeId`, `scheduleId?` | Formulario inline |
| **ShiftTimelineView** | Línea visual de tipos de turno con distribución HO/HN/HE | Props: `shiftTypes`, `area` | Barras de tiempo |
| **CheckInOut** | Botón check-in/out con geolocalización vs coordenadas del restaurante | Props: assignment data | Botón + estado |

### Calculadora de Costos (`lib/utils/costCalculator.ts`)

Funciones clave para nómina colombiana:
- `calcularCostoTurnoEmpresa(shiftType, salario, esDomingo)` → costo total empleador
- `calcularCostoEmpresa(salario)` → desglose completo (EPS, pensión, ARL, caja, SENA, ICBF, prima, cesantías, vacaciones, auxilio transporte)
- `formatCOP(value)` → formato pesos colombianos

---

## E. Equipo (`src/components/admin/team/`)

| Componente | Propósito | Datos |
|---|---|---|
| **TeamPanel** | Gestión de equipo de trabajo | fetch `/api/admin/shift-types`, `/api/admin/shift-schedules` |
| **StaffList** | Lista de personal con CRUD | fetch `/api/admin/staff` |

---

## E. Clientes (`src/components/admin/customers/`)

| Componente | Propósito | Datos |
|---|---|---|
| **CampaignComposer** | Componer y enviar campañas de email a segmentos | fetch `/api/admin/customers`, `/api/admin/campaigns` |

Hooks relacionados: `useCustomers()`, `useCustomerAnalytics()`, `useCustomerDetail()`, `useCustomerTags()`, `useVIPInactive()`, `useWeeklyTrends()`, `useNoShowToday()`, `useTableDemand()`

---

## F. Host / Anfitriones (`src/components/host/`)

### Diagrama de Datos

```
useHostDashboard()
  └── GET /api/admin/dashboard?date=colombiaToday
      └── Supabase: reservations, tables, table_zones
      └── Suscripción realtime: canal "host-dashboard" + polling 30s

useHostOccupancy()
  └── GET /api/admin/occupancy?date=colombiaToday
      └── Supabase: tables, table_zones, reservations, table_combinations
      └── Suscripción realtime: canal "host-occupancy" + polling 30s

useTableInventory()
  └── GET /api/admin/inventory/*
      └── CRUD completo de mesas, zonas, combinaciones
      └── Suscripción realtime: canal "admin-inventory"
```

### Componentes

| Componente | Propósito | Datos | Renderiza |
|---|---|---|---|
| **HostShell** | Shell raíz del anfitrión. Tabs: mesas, reservas, ocupación | `useHostDashboard()`, `useAuth()` | HostHeader, HostTabBar, contenido por tab |
| **HostTableMap** | Mapa visual interactivo del piso. Mesas coloreadas por urgencia. Drag para asignar. | Props: tables, zones, reservations | Zonas + mesas con urgencia |
| **HostReservationQueue** | Cola de reservas por estado (pendiente/confirmada/sentada/etc.) | Props: reservations | Tarjetas de reserva con acciones |
| **HostOccupancySummary** | Métricas de ocupación actual por zona | Props: table data | Stats cards + barras por zona |
| **HostQuickActions** | Botones rápidos (walk-in, actualizar) | Props: callbacks | Botones con íconos |
| **ReservationDetail** | Detalle de una reserva con acciones (confirmar, sentar, cancelar, WhatsApp) | Props: reservation data | Modal con campos |
| **ReassignModal** | Reasignar reserva de mesa | PATCH `/api/reservations` | Selector de mesa destino |
| **HostWalkInForm** | Crear reserva walk-in (sin reserva previa) | POST `/api/reservations` | Formulario rápido |

---

## G. Páginas Públicas

| Página | Ruta | Propósito | Datos |
|---|---|---|---|
| Home | `/` | Landing: Hero, Menú, Foto CTA, Footer | Estático |
| Reservar | `/reservar` | Wizard de reserva en 2 pasos | GET `/api/availability`, POST `/api/reservations` |
| Confirmado | `/reservar/confirmado` | Confirmación de reserva | URL search params |
| Perfil | `/perfil` | Perfil del cliente: reservas, editar, cancelar | GET/PATCH `/api/reservations` |
| Login | `/auth/login` | Autenticación (email + Google OAuth) | `useAuth().signInWithEmail/signInWithGoogle` |
| Signup | `/auth/signup` | Registro (nombre, email, teléfono, password) | `useAuth().signUpWithEmail` |
| Mi Turno | `/mi-turno` | Vista del empleado: horario, check-in/out, novedades | GET `/api/admin/shift-my-week`, `/api/admin/shift-my-hours` |

---

## H. Librerías de Soporte (`src/lib/`)

### H.1 Hooks (`src/lib/hooks/`)

| Hook | API Endpoint | Retorna | Usado por |
|---|---|---|---|
| `usePOSDashboard(filters)` | `GET /api/admin/pos-dashboard` | `{ data, loading, error, refetch, drillDown, fetchDrillDown }` | POSDashboardPanel |
| `usePOSDayOfWeekDetail(day, zone, cat, from, to)` | `GET /api/admin/pos-dashboard/day-of-week` | `{ data, loading, error }` | DayOfWeekMasterPanel (via POSDashboardPanel) |
| `useProductMargins(from, to, cat?)` | `GET /api/admin/informes-rayo/margins` | `{ data, loading, error }` | RentabilidadPanel (via InformesRayoPanel) |
| `useProductoHourly()` | `GET /api/admin/informes-rayo/productos-hora` | `{ data, loading, error, fetchData }` | ProductoDesgloseTable |
| `useInformesRayo()` | `GET /api/admin/informes-rayo` | `{ data, loading, error, fetchReport }` | InformesRayoPanel |
| `usePOSCalendar(zone?)` | `GET /api/admin/pos-calendar` | `{ dailyTrend, availableMonths, loading }` | POSDashboardPanel |
| `usePOSCosts(filters)` | `GET /api/admin/pos-costs` | `{ data, loading, error, refetch }` | POSDashboardPanel (tab Costos) |
| `useProductCostCatalog()` | `GET /api/admin/product-costs` | `{ data, loading, error, refetch }` | POSDashboardPanel (tab Catálogo) |
| `useSalesAverages()` | `GET /api/admin/sales-averages` | `{ data, loading }` | SalesReferenceTab |
| `useShiftData(area, weekStr)` | Supabase directo (no API) | `{ shiftTypes, staff, assignments, loading }` | ShiftSchedulePanel |
| `useNomina(from, to)` | `GET /api/admin/nomina` | `{ data, loading, error, refetch }` | ShiftSchedulePanel (tab Nómina) |
| `useNominaContable()` | `GET /api/admin/nomina?action=contable` | Múltiples endpoints nómina | ShiftSchedulePanel |
| `useNominaOpsCosts(periodo)` | `GET /api/admin/nomina/ops-costs` | `{ data, loading, error }` | CostEstimationBar |
| `useHostDashboard()` | `GET /api/admin/dashboard` | `{ data, loading, refetch }` + realtime | HostShell |
| `useHostOccupancy()` | `GET /api/admin/occupancy` | `{ data, loading, refetch }` + realtime | HostShell |
| `useTableInventory()` | `GET /api/admin/inventory/*` | CRUD completo + realtime | HostTableMap (admin) |
| `useAdminDashboard(date)` | `GET /api/admin/dashboard?date=` | `{ data, loading, error, refetch }` + realtime | AdminShell |
| `useAdminReservations(date, status)` | `GET /api/admin/reservations` | `{ reservations, total, loading }` + realtime | HostReservationQueue |
| `useCustomers()` | `GET /api/admin/customers` | Paginación, filtros, segmentos | Panel de Clientes |
| `useCustomerAnalytics()` | `GET /api/admin/customers/analytics` | Overview, retención, segmentos | Panel de Clientes |
| `useRodriData()` | `GET /api/admin/rodri?action=all` | Empleados, turnos, ventas (BD Seadotec externa) | Dashboard de Rodri |

### H.2 Utilidades (`src/lib/utils/`)

| Archivo | Propósito | Exporta |
|---|---|---|
| `costCalculator.ts` | Cálculos nómina colombiana (prestaciones, parafiscales, recargos) | `calcularCostoTurnoEmpresa`, `calcularCostoEmpresa`, `formatCOP`, `getWeekStr`, `getWeekDates` |
| `formatDate.ts` | Formateo de fechas en es-CO, manejo de timezone | `formatDate`, `getLocalDate`, `addDays`, `formatTime` |
| `time.ts` | Hora Colombia (server-safe con Intl) | `getColombiaDate`, `getColombiaTime`, `timeToMinutes`, `isTimeInRange` |
| `cn.ts` | Merge de clases Tailwind | `cn(...inputs)` |
| `zone-letter.ts` | Mapeo zona → letra (para algoritmo de asignación) | `getZoneLetter(zoneName)` |
| `whatsapp.ts` | Links de WhatsApp y email | `whatsappLink(phone, msg)`, `emailLink(email, subject)` |
| `urgency.ts` | Cálculo de urgencia de reserva | `computeUrgency`, `classifyReservationTime`, `getUrgencyBadge` |

### H.3 Informes Rayo (`src/lib/informes-rayo/`)

| Archivo | Propósito | Datos de entrada |
|---|---|---|
| `analysis-pipeline.ts` | Análisis IA v1 (reglas) | KPIs del informe |
| `analysis-pipeline-v2.ts` | Análisis IA v2 (Groq + fallback reglas) | KPIs + márgenes |
| `pdf-generator-v6.ts` | Genera HTML para PDF (8 slides, tema dark) | margins + analysis data |
| `pdf-renderer-v6.ts` | Renderiza HTML → iframe → html2canvas → jsPDF | HTML string |
| `pdf-chartjs/` | Slides individuales con Chart.js (10 slides) | margins + analysis data |

### H.4 Auth (`src/lib/auth/`)

| Archivo | Propósito | Exporta |
|---|---|---|
| `auth-provider.tsx` | Contexto de autenticación Supabase. Maneja user, isAdmin, isHost, isEmployee, adminRole. Login email/Google, logout. | `AuthProvider`, `useAuth()` |

### H.5 Email (`src/lib/email/`)

| Archivo | Propósito | Usa |
|---|---|---|
| `send.ts` | Envío de emails transaccionales y campañas vía Resend API | `api.resend.com/emails`, `RESEND_API_KEY` |

Templates: reservas (6 estados), bienvenida, reset password, campañas, turnos (3 tipos). HTML inline con marca A&K.

---

## I. Shared Components (`src/components/admin/shared/`)

| Componente | Propósito | Props |
|---|---|---|
| **SectionHeading** | Título de sección estilizado | `children`, `className` |
| **EmptyState** | Placeholder vacío con ícono | `icon`, `title`, `description` |
| **ConfirmDialog** | Modal de confirmación con animación | `open`, `title`, `description`, `onConfirm`, `onCancel` |
| **AnimatedCounter** | Animación numérica (count-up) | `value`, `className` |
| **AnimatedCard** | Card con fade-in al montar | `children`, `delay`, `className` |
| **TierBadge** | Badge de lealtad (Nuevo/Bronce/Plata/Oro) | `tier`, `className` |
| **StatusBadge** | Badge de estado de reserva | `status`, `size`, `showDot` |

---

## J. Theme (`src/lib/ThemeProvider.tsx`)

Sistema de tema dark/light con CSS custom properties:

```css
/* Dark theme (default) */
--bg-card: #1a1a1a
--text-primary: #f5f5f5
--text-secondary: #a0a0a0
--text-muted: #666
--border-default: #333
--color-ak-borgona: #5D1528
--color-ak-dorado: #C9A94E
--color-ak-oliva: #6B8E23
--color-ak-madera: #3E2723

/* Light theme */
--bg-card: #F5EDE0
--text-primary: #1a1a1a
--text-secondary: #666
--color-ak-borgona: #5D1528 (mismo)
--color-ak-dorado: #C9A94E (mismo)
```

---

## K. Dependencias entre Subsistemas

```
AdminShell
  ├── POSDashboardPanel ←── usePOSDashboard, usePOSDayOfWeekDetail, useProductMargins, usePOSCalendar
  │   ├── POSDailyTrendChart (props: dailyTrend data)
  │   ├── DayOfWeekMasterPanel (props: dayDetail data)
  │   │   └── DrillDownPanel (props: drillDown data)
  │   ├── HourlyRevenueChart (props: hourlyRevenue)
  │   ├── ZoneRevenueChart (props: byZone)
  │   ├── TopProductsTable (props: topProducts)
  │   ├── CategoryBreakdown (props: topCategories)
  │   ├── StaffPerformanceTable (props: staffPerformance)
  │   ├── PaymentMethodsChart (props: paymentMethods)
  │   ├── RevenueHeatmapCalendar (props: dailyTrend)
  │   └── CategoryCompanionsCard (props: categoryCompanions)
  │
  ├── InformesRayoPanel ←── useInformesRayo, useProductMargins
  │   ├── PeriodSelector (props: period)
  │   ├── MetricasClave (props: metricas)
  │   ├── RentabilidadPanel ←── useProductMargins
  │   ├── InformesDashboard (props: topProducts, paymentMethods, zones)
  │   ├── AnalisisIA ←── fetch analyze-v2
  │   ├── ProductoDesgloseTable ←── useProductoHourly
  │   └── PDFExportButton ←── fetch margins + analyze-v2
  │
  ├── ShiftSchedulePanel ←── useShiftData, useSalesAverages
  │   ├── ShiftGrid (props: grid data)
  │   ├── CostEstimationBar (props: staff, shiftTypes, grid) ←── costCalculator
  │   ├── SalesReferenceTab (props: staff, shiftTypes, grid) ←── useSalesAverages + costCalculator
  │   ├── StaffPanel ←── fetch nomina-staff
  │   └── ShiftTypeModal (props: shiftType data)
  │
  ├── TeamPanel ←── fetch shift-types, shift-schedules
  │   └── StaffList ←── fetch staff
  │
  └── [Others: Customers, Reservations, Inventory, etc.]

HostShell
  ├── HostTableMap ←── useHostOccupancy
  ├── HostReservationQueue ←── useAdminReservations
  └── HostOccupancySummary ←── derived from occupancy data
```

---

## L. Supabase — Tablas y RPCs Principales

### Tablas POS (datos del restaurante)

| Tabla | Propósito | Columnas clave |
|---|---|---|
| `pos_sales` | Ventas diarias | foliodet, fecha, zona, total, propina |
| `pos_sale_items` | Items por venta | sale_id, product_id, cantidad, precio |
| `pos_products` | Productos del menú | id, name, group_id, price |
| `pos_product_groups` | Categorías | id, name, parent_id |
| `pos_product_recipes` | Recetas/costos | product_id, ingredient_id, quantity |
| `pos_ingredient_costs` | Costo de ingredientes | ingredient_id, avg_cost, date |
| `pos_purchases` | Compras a proveedores | id, supplier, date, total |
| `pos_purchase_items` | Items de compra | purchase_id, ingredient_id, quantity, unit_cost |

### Tablas de Reservas

| Tabla | Propósito |
|---|---|
| `reservations` | Reservas (fecha, hora, personas, estado, fuente, mesa) |
| `customers` | Cliente (nombre, teléfono, email, lealtad) |
| `customer_stats` | Estadísticas agregadas por cliente |
| `customer_tags` | Tags de segmentación |
| `tables` | Mesas del restaurante |
| `table_zones` | Zonas del restaurante |
| `table_combinations` | Combinaciones de mesas |

### Tablas de Turnos/Nómina

| Tabla | Propósito |
|---|---|
| `shift_types` | Tipos de turno (con segmentos para turnos partidos) |
| `shift_type_segments` | Segmentos de turno (entrada/salida) |
| `shift_schedules` | Horarios semanales |
| `shift_assignments` | Asignaciones empleado-turno |
| `shift_novedades` | Novedades (ausencia, tardanza, etc.) |
| `pos_nomina_staff` |Datos de nómina del personal |
| `user_roles` | Roles y permisos de usuarios |

### RPCs (funciones almacenadas)

| RPC | Propósito | Usada por |
|---|---|---|
| `pos_dashboard_kpis` | KPIs agregados por período/zona/categoría | `/api/admin/pos-dashboard` |
| `pos_dashboard_daily` | Datos diarios (revenue, cheques, propina, personas) | `/api/admin/pos-calendar` |
| `pos_dashboard_product_hourly` | Ventas por producto y hora | `/api/admin/informes-rayo/productos-hora` |
| `get_product_margins` | Márgenes por producto (cruza ventas × recetas × costos) | `/api/admin/informes-rayo/margins` |
| `get_analytics_overview` | Overview de analytics de clientes | `/api/admin/customers/analytics` |

---

## M. Configuración de Deploy

| Aspecto | Valor |
|---|---|
| **Repo** | `agamenonmacondo/attick-keller` |
| **Branch producción** | `master` |
| **Branch merge** | `main` (3 commits detrás) |
| **Vercel proyecto** | `web` (ID: `prj_B5qyL2Q3o2Pfnqm7k9fgmK3nHSry`) |
| **Dominio** | `web-rosy-nine-64.vercel.app` |
| **Framework** | Next.js 16 con webpack (NO Turbopack para build) |
| **Supabase proyecto** | `pbllaipsdfypelnwrvpy` |
| **Supabase URL** | `https://pbllaipsdfypelnwrvpy.supabase.co` |
| **Email** | Resend API (`api.resend.com`) |
| **IA** | Groq Cloud (`api.groq.com`, modelo `openai/gpt-oss-120b`) |
| **PITFALL** | `next build --webpack` (Turbopack no compila @react-pdf/renderer) |
| **PITFALL** | `.env.local` en `web/` NO en raíz |
| **PITFALL** | Proyecto Vercel `attick-keller` NO tiene env vars — ignorar |