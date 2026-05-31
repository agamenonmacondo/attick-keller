# Attick & Keller — Arquitectura del Proyecto

> **Punto de entrada** para cualquier agente o desarrollador que trabaje en este proyecto.
> **Ultima actualizacion**: 2026-05-29 por Ninja

---

## Stack

| Capa | Tecnologia | Notas |
|------|-----------|-------|
| Framework | Next.js 14 (App Router) | Server Components + Client Components |
| Backend | Supabase (Postgres + Auth + Storage) | Project: `pbllaipsdfypelnwrvpy` |
| Deploy | Vercel | `web-rosy-nine-64.vercel.app` |
| Email | Resend API | Remitente: `ventas@ccs724.com` |
| Estilos | Tailwind CSS + CSS vars | Dark mode nativo |
| Iconos | Phosphor Icons | Sin emojis en UI |
| Fuentes | Playfair Display (headings), Inter (body) | Branding A&K |

---

## Estructura de Directorios

```
src/
├── app/                    # Rutas Next.js App Router
│   ├── (auth)/            # Login, signup, callback
│   ├── (public)/          # Sitio publico (navbar, hero, menu)
│   ├── admin/             # Panel admin (protegido por rol)
│   ├── api/               # API routes (48 endpoints)
│   │   ├── admin/         # APIs internas (service_role)
│   │   └── auth/          # Auth endpoints
│   ├── host/              # Interface de host (mesas, reservas)
│   ├── mi-turno/          # Vista colaborador (turnos propios)
│   └── perfil/            # Perfil de usuario
├── components/
│   ├── admin/             # 100+ componentes del panel admin
│   │   ├── menu/          # Menu panel + MenuItemForm
│   │   ├── shifts/        # Turnos (ShiftSchedulePanel, 678 lineas)
│   │   ├── team/          # Equipo (AddStaffForm, StaffList, TeamPanel)
│   │   ├── dashboard/     # POS dashboard
│   │   ├── reservations/  # Reservas
│   │   ├── customers/     # CRM
│   │   ├── nomina/        # Nomina
│   │   └── rodrigo/       # Seadotec/Rodri (instancia Supabase separada)
│   ├── host/              # 9 componentes de stand
│   ├── public/            # 5 componentes del sitio publico
│   └── ui/                 # Componentes base reutilizables
├── lib/
│   ├── auth/              # AuthProvider + useAuth
│   ├── supabase/          # 3 clientes (browser, server, rodri)
│   ├── utils/             # admin-auth, constants, helpers
│   ├── types/             # TypeScript interfaces
│   └── email/             # Sistema de correo (5 tipos)
└── docs/                  # Documentacion del proyecto
    ├── ARCHITECTURE.md    # Este archivo — punto de entrada
    ├── CODEMAP.md         # Mapa completo de componentes/APIs/hooks
    └── DATABASE.md        # Esquema BD + pitfalls
```

---

## Flujos de Datos Principales

### 1. Reserva → Ocupacion → POS

```
Reserva creada (reservations)
  → Host asigna mesa (tables + table_combinations)
  → Cliente se sienta (status: seated)
  → POS registra venta (pos_sales + pos_sale_items)
  → Dashboard muestra ocupacion en tiempo real
```

### 2. POS → Nomina → Turnos

```
POS upload (pos_sales, pos_sale_items, pos_staff, pos_shifts)
  → Nomina calcula pagos (nomina_detalle, he_recargos, provisiones)
  → Shift schedules asignan turnos (shift_schedules → shift_assignments)
  → Colaborador ve sus turnos (/mi-turno)
```

### 3. Menu → POS → Costos

```
Menu publico (menu_categories + menu_items)
  ↔ Vinculado a POS (pos_menu_mapping)
  → Receta POS (pos_product_recipes + pos_ingredients)
  → Costeo (pos_ingredient_costs)
  → MenuItemForm muestra pills + costos
```

### 4. Auth → Roles → Permisos

```
Supabase Auth (signup/login)
  → user_roles (7 roles: customer, host, store_admin, super_admin, lider_area, colaborador, reservante)
  → Middleware redirige segun rol
  → AuthProvider inyecta isAdmin/isHost/isEmployee
```

---

## Roles y Permisos

| Rol | Acceso | Requiere pos_nomina_staff_id |
|-----|--------|------------------------------|
| `super_admin` | Todo el panel admin | No |
| `store_admin` | Panel admin (sin super) | No |
| `host` | Interface de host ( reservas, mesas) | No |
| `lider_area` | /mi-turno + area especifica | Si |
| `colaborador` | /mi-turno | Si |
| `reservante` | /mi-turno | Si |
| `customer` | Sitio publico unicamente | No |

### Como funciona la auth

1. **Middleware** (`middleware.ts`) — protege rutas, redirige segun rol
2. **Server-side** (`admin-auth.ts`) — `getAdminUser`, `getHostUser`, `getEmployeeUser`, `getStaffUser`
3. **Client-side** (`auth-provider.tsx`) — `useAuth()` provee `isAdmin`, `isHost`, `isEmployee`
4. **API routes** — usan `getServiceClient()` (service_role key) para bypass RLS

---

## Pitfalls Criticos (LEER ANTES DE TOCAR CODIGO)

### 1. FKs Faltantes = Joins Rotos

Las tablas `pos_ingredients`, `pos_ingredient_costs`, `pos_product_recipes`, `pos_sales`, `pos_sale_items`, `pos_sale_payments` **NO tienen FKs** a las tablas que referencian. Resultado: los joins de Supabase JS client (`sb.from('x').select('*, y(nombre)')`) retornan `null` silenciosamente.

**Solucion**: Queries separadas + merge manual. Ver `docs/DATABASE.md` para la lista completa.

### 2. pos_product_id tiene TRAILING SPACES

Los valores de `pos_product_id` en `pos_products` tienen espacios al final (ej: `"01001 "`). **SIEMPRE hacer TRIM** al comparar.

### 3. Supabase `.in()` tiene limite BATCH=200

PostgREST trunca resultados de `.in()` en 200 items para el plan gratuito. Si una query puede retornar mas, usar paginacion.

### 4. Vercel Cachea Deploys

Despues de deploy, puede servir version vieja. Usar `npx vercel --prod --yes --token $TOKEN` + `git push origin master` + hard refresh del navegador.

### 5. `pos_ingredient_categories` clasificacion 2 y 14

- **classification=2** (bar/vinos): excluir por defecto de ingredientes de cocina
- **pos_category_id=14** ("NO USAR"): 8 ingredientes, excluir SIEMPRE

### 6. Dark Theme

Usar CSS vars (`var(--color-ak-dorado)`, `var(--color-ak-oliva)`) o colores con opacity (`bg-red-500/10`). Los colores hardcoded tipo `bg-red-50`, `text-amber-600` solo funcionan en light mode.

---

## Documentacion de Referencia

| Archivo | Que contiene | Cuando leerlo |
|---------|-------------|---------------|
| **`docs/ARCHITECTURE.md`** | Este archivo — vision general, flujos, pitfalls | **SIEMPRE** — punto de entrada |
| **`docs/CODEMAP.md`** | 277 archivos mapeados, 48 APIs, 27 hooks | Antes de tocar un componente o API |
| **`docs/DATABASE.md`** | 62 tablas, FKs, pitfalls, data sucio | Antes de hacer queries o cambiar esquema |

---

## Branding A&K

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-ak-borgona` | `#6B2737` | Primario, botones, acentos |
| `--color-ak-dorado` | `#C9A94E` | Acentos secundarios, hover |
| `--color-ak-oliva` | `#6B7B3C` | Tags, badges |
| Heading font | Playfair Display | Titulos |
| Body font | Inter | Todo lo demas |
| Modo | Dark por defecto | Soporta light |

---

## Convenciones

- **Sin emojis** en UI del proyecto
- **Phosphor Icons** para iconos
- **Frontend**: camelCase (`unitCost`, `totalCost`)
- **Base de datos**: snake_case (`unit_cost`, `total_cost`)
- **Commits**: prefijos `feat:`, `fix:`, `docs:`
- **Deploy**: `vercel --prod --yes --token` + `git push origin master`
- **No usar joins de Supabase JS** en tablas POS — queries separadas + merge
- **No borrar BD** sin autorizacion explicita de Alejandro