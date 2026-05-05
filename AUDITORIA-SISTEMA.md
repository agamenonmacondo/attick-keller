# 🔍 Auditoría Completa del Sistema — Attick & Keller

**Fecha:** 4 de mayo 2026, 9:20 PM (hora Colombia)
**Estado:** Post-deploy del fix de zona horaria (commit `1fe9793`)

---

## 1. FLUJO DE ESTADOS DE RESERVA

### Estado actual del flujo

```
Cliente reserva → status: 'pending' → Host confirma → 'confirmed' → Sentar → 'seated' → Completar → 'completed'
                                      ↓                    ↓                ↓
                                   'no_show'          'cancelled'      'cancelled'
```

### ⚠️ PROBLEMA IDENTIFICADO: `pending` es invisible en los módulos operativos

| Módulo | Qué busca | ¿Ve `pending`? | Consecuencia |
|--------|-----------|-----------------|--------------|
| **Disponibilidad** `/api/availability` | `.in('status', ['confirmed', 'pre_paid', 'seated'])` | ❌ NO | Las reservas `pending` NO ocupan horarios → se pueden duplicar |
| **Plano** `/api/admin/floorplan` | `.in('status', ['confirmed', 'pre_paid', 'seated'])` | ❌ NO | Las reservas `pending` NO aparecen en el plano |
| **Ocupación** `/api/admin/occupancy` | `.in('status', ['confirmed', 'pre_paid', 'seated'])` | ❌ NO | Las reservas `pending` NO cuentan como ocupadas |
| **Dashboard** `/api/admin/dashboard` | `.in('status', ['pending', 'pre_paid', 'confirmed', 'seated'])` | ✅ SÍ | Las ve como contador pero NO como mesas ocupadas |
| **POST creación (customer)** `/api/reservations` | `.neq('status', 'cancelled')` para verificar conflicto | ✅ SÍ | Cuenta `pending` como conflicto → SÍ bloquea mesa asignada |
| **PATCH seated** `/api/reservations` | `.neq('status', 'cancelled')` para verificar conflicto | ✅ SÍ | Cuenta `pending` como conflicto |
| **Algoritmo asignación** `table-assignment.ts` | `.neq('status', 'cancelled')` | ✅ SÍ | Cuenta `pending` como conflicto al asignar |
| **Host Panel** `HostTableMap.tsx` | Filtra `['confirmed', 'pre_paid', 'pending']` sin mesa | ✅ PARCIAL | Las muestra en cola de espera pero NO en el plano visual |
| **Host Quick Actions** | Busca `status === 'pending'` para "Confirmar siguiente" | ✅ SÍ | Funciona correctamente |

### Consecuencia operativa real

1. **Cliente reserva en la web** → `pending` → mesa asignada por algoritmo ✅
2. **Reserva `pending` NO aparece en el plano del host** como ocupada → ❌
3. **Disponibilidad NO reduce cupos por reservas `pending`** → ❌
4. **Host tiene que confirmar manualmente** cada reserva para que se vuelva visible → ❌

**El `pending` ES un cuello de botella operativo.** La reserva existe en BD, tiene mesa asignada, pero no se muestra en los módulos operativos hasta que alguien la confirme manualmente.

---

## 2. FLUJO DE CREACIÓN DE RESERVA (Customer)

### Web (`POST /api/reservations`)

```
1. Auth check (user obligatorio)
2. Buscar/crear customer por auth_user_id + phone
3. Fetch mesas activas
4. Fetch reservas existentes (excluyendo cancelled)
5. Fetch combinaciones activas
6. Ejecutar assignTable() → sugerir mesa
7. INSERT reservation con status: 'pending'
8. Enviar email "Reserva Recibida" (pending)
9. Redirigir a /reservar/confirmado
```

**Nota:** El algoritmo SÍ asigna mesa en creación, pero el estado queda `pending`.

### Admin/Host (`POST /api/admin/reservations`)

```
1. Auth check (staff obligatorio: admin/host/store_admin)
2. Buscar/crear customer por nombre + teléfono
3. Si zone_id provisto: lookup naive de primera mesa disponible (.gte('capacity', party_size).limit(1))
   ⚠️ NO USA EL ALGORITMO DE ASIGNACIÓN
4. INSERT reservation con status: 'confirmed'
5. Enviar email "Reserva Confirmada" (confirmed)
```

**Problema:** El endpoint admin usa una búsqueda naive por zona, NO el algoritmo `assignTable()`.

### Walk-in (`HostWalkInForm.tsx`)

```
1. Calcula time_start = ahora, time_end = ahora + 2h
2. POST a /api/admin/reservations con source: 'presencial'
3. Resultado: status 'confirmed' + mesa asignada (naive)
```

---

## 3. FLUJO DE CONFIRMACIÓN

### Perfil del cliente (`/perfil`)

- Botón "Confirmar" disponible SOLO si `isAdminUser && r.status === 'pending'`
- Llama `PATCH /api/reservations` con `{ status: 'confirmed' }`
- Pero PATCH normal solo permite al dueño cancelar → host/admin confirman por otro lado

### Host Panel ("Confirmar siguiente")

- Busca la primera reserva `pending` en orden de `time_start`
- Llama `PATCH /api/admin/reservations/{id}` con `{ status: 'confirmed' }`
- Al confirmar: envía email "Reserva Confirmada"

### Detalle de reserva admin (`ReservationDetail.tsx`)

- Muestra botones según estado:
  - `pending` → Confirmar / No asistió / Cancelar
  - `pre_paid` → Confirmar / No asistió
  - `confirmed` → Sentar / No asistió
  - `seated` → Completar

### Transiciones permitidas (`admin/reservations/[id]/route.ts`)

```typescript
const ALLOWED_TRANSITIONS = {
  pending: ['confirmed', 'cancelled', 'no_show'],
  pre_paid: ['confirmed', 'no_show'],
  confirmed: ['seated', 'no_show', 'cancelled'],
  seated: ['completed'],
  // completed, cancelled, no_show son terminales
}
```

---

## 4. ASIGNACIÓN DE MESAS

### Algoritmo `assignTable()` (6 fases implementadas)

**Ubicación:** `src/lib/algorithms/table-assignment.ts` (686 líneas)

**Pesos:** capacity 40% + zone 30% + waste 20% + combine 10%

**Reglas:**
1. PROTEGER combinables (can_combine=true) — NUNCA asignar parejas ahí
2. PRIORIZAR combinación para grupos de 4+
3. RELEGAR grupos pequeños (2-3pax) a zonas de baja prioridad
4. COMBINACIÓN libera mesas grandes para grupos de 10+
5. RUTEO por hora: temprano → zonas bajas; pico → zonas altas

**Zonas (orden popularidad):** Tipi (B) > Taller (A) > Jardín (C) > Chispas (D) > Ático (E)

### Dónde se usa el algoritmo vs naive

| Flujo | Usa algoritmo | Usa naive |
|-------|--------------|-----------|
| Customer crea reserva | ✅ `assignTable()` | ❌ |
| Admin crea reserva | ❌ | ✅ `.gte('capacity', party_size).limit(1)` |
| PATCH seated sin mesa | ✅ `assignTable()` | ❌ |
| PUT modificación | ✅ `assignTable()` | ❌ |
| Host sugerencia | ✅ `assignTable()` via `/api/admin/table-suggestion` | ❌ |

### Auto-aprendizaje (FASE 6)

- Tabla `assignment_corrections` creada ✅
- `PUT /api/admin/table-suggestion` registra correcciones del host
- Ajuste automático de scores por zona: **NO implementado aún** (necesita datos)

---

## 5. DISPOSIBILIDAD (AVAILABILITY)

### Endpoint `GET /api/availability?date&party_size`

1. Fetch mesas + zonas + combinaciones + reservas del día
2. Filtra reservas con `.in('status', ['confirmed', 'pre_paid', 'seated'])`
3. ⚠️ **NO cuenta `pending`** como ocupada
4. Ejecuta `checkAvailability()` para cada horario
5. Retorna lista de horarios con `available: true/false`

**Problema:** Si el cliente reserva a las 9pm y queda `pending`, el siguiente cliente ve las 9pm como disponible, creando doble reserva en el mismo horario.

---

## 6. EMAILS TRANSACCIONALES

| Status | Asunto | Disparador |
|--------|--------|-------------|
| `pending` | "Tu reserva en Attick & Keller fue recibida" | POST creación (customer) |
| `confirmed` | "Tu reserva en Attick & Keller esta confirmada!" | PATCH confirmación |
| `seated` | "Tu mesa esta lista" | PATCH sentar |
| `completed` | "Gracias por visitar Attick & Keller!" | PATCH completar |
| `no_show` | "Tu reserva fue marcada como no atendida" | PATCH no_show |
| `cancelled` | "Reserva cancelada" | PATCH cancelar |
| welcome | Email de bienvenida | Signup |
| first_login | Primer inicio de sesión | Auth |

**Nota:** NO existe email `pre_paid`. Si se usa ese estado, no se envía email.

---

## 7. AUTENTICACIÓN Y ROLES

### Roles en el sistema

| Rol | Permisos |
|-----|----------|
| `customer` | Crear reservas, ver perfil, cancelar reservas propias |
| `store_admin` | CRUD completo (admin panel) |
| `super_admin` | CRUD completo + gestión de staff |
| `host` | Ver dashboard, cambiar status, asignar mesas |

### Rutas protegidas

- `/admin/*` → Requiere `store_admin` o `super_admin`
- `/host` → Requiere `host`, `store_admin` o `super_admin`
- `/perfil` → Cualquier usuario autenticado
- `/reservar` → Cualquier usuario autenticado

### Middleware (`src/middleware.ts`)

Protege rutas con auth. Redirige no autenticados.

---

## 8. COMPONENTES DEL HOST PANEL

| Componente | Función |
|------------|---------|
| `HostShell.tsx` | Orquestador principal. Tabs: Mesas · Reservas · Plano |
| `HostHeader.tsx` | Header con logo, hora, link a pantalla completa |
| `HostQuickActions.tsx` | Botones "Confirmar siguiente" y "Sentar siguiente" |
| `HostReservationQueue.tsx` | Lista de reservas con filtros por status |
| `HostOccupancySummary.tsx` | Tarjetas de capacidad + resumen por zona |
| `HostTableMap.tsx` | Mapa de mesas por zona con colores + sugerencia de algoritmo |
| `HostWalkInForm.tsx` | Formulario walk-in (nombre, teléfono, personas, zona) |
| `HostFloorPlan.tsx` | Wrapper read-only del floor plan interactivo |

### Hooks

| Hook | Función | Endpoint |
|------|---------|----------|
| `useHostDashboard` | Stats + reservas de hoy | `GET /api/admin/dashboard?date=YYYY-MM-DD` |
| `useHostOccupancy` | Ocupación por zona | `GET /api/admin/occupancy?date=YYYY-MM-DD` |
| `useTableSuggestion` | Sugerencia de mesa | `POST /api/admin/table-suggestion` |
| `useFloorPlan` | Plano interactivo | `GET /api/admin/floorplan?date=YYYY-MM-DD` |

---

## 9. API ROUTES COMPLETAS

### Customer-facing

| Route | Método | Función |
|-------|--------|---------|
| `/api/reservations` | POST | Crear reserva (auth user, status pending) |
| `/api/reservations` | PATCH | Cambiar status (auth user, solo cancelar) |
| `/api/reservations` | PUT | Modificar reserva (auth user, re-asignar mesa) |
| `/api/availability` | GET | Consultar horarios disponibles |
| `/api/zones` | GET | Listar zonas (deprecated para formulario) |

### Admin/Host

| Route | Método | Función |
|-------|--------|---------|
| `/api/admin/reservations` | POST | Crear reserva (staff, status confirmed) |
| `/api/admin/reservations` | GET | Listar reservas con paginación |
| `/api/admin/reservations/[id]` | PATCH | Cambiar status/editar con transiciones validadas |
| `/api/admin/dashboard` | GET | Stats generales del día |
| `/api/admin/occupancy` | GET | Ocupación por zona |
| `/api/admin/floorplan` | GET/PATCH | Plano interactivo (get=posiciones, PATCH=guardar) |
| `/api/admin/table-suggestion` | POST | Sugerir mesa para reserva |
| `/api/admin/table-suggestion` | PUT | Registrar corrección del host |
| `/api/admin/inventory/tables` | GET/PATCH | CRUD de mesas |
| `/api/admin/inventory/tables/[id]` | PATCH/DELETE | Toggle activo/eliminar mesa |
| `/api/admin/inventory/zones` | GET/POST/PATCH/DELETE | CRUD de zonas |
| `/api/admin/inventory/combinations` | GET/POST/PATCH/DELETE | CRUD de combinaciones |
| `/api/admin/customers` | GET | Listar clientes |
| `/api/admin/customers/[id]` | PATCH/DELETE | Editar/eliminar cliente |
| `/api/admin/menu` | GET/POST | Menú digital |
| `/api/admin/metrics` | GET | Métricas generales |
| `/api/admin/staff` | GET/POST | Gestión de personal |
| `/api/admin/campaigns` | POST | Campañas de email |
| `/api/admin/tags` | CRUD | Tags de clientes |
| `/api/admin/segments` | GET | Segmentos de clientes |
| `/api/admin/templates` | GET | Templates de email |
| `/api/admin/dates-with-reservations` | GET | Días con reservas (para calendario) |

---

## 10. BASE DE DATOS (17 tablas, 5 módulos)

### Módulos

1. **Core Restaurante** — `restaurants`, `table_zones`, `tables`, `table_combinations`, `availability`
2. **Menú Digital** — `menu_categories`, `menu_items`
3. **Clientes y Fidelización** — `customers`, `visit_history`, `customer_stats`, `loyalty_rewards`, `customer_rewards`
4. **Reservas** — `reservations`, `reservation_status_log`, `payments`
5. **Sistema** — `user_roles`, `reminders`

### Estado de migraciones

- `003_remove_phone_unique.sql` — Phone uniqueness removed ✅
- `008_floorplan_positions.sql` — Position columns + floor_num ✅
- `assignment_corrections` table — Created ✅
- **⚠️ Verificar:** ¿Se aplicaron todas las migraciones? María manejó algunas vía Supabase Dashboard.

### Columnas clave de `reservations`

```
id, date, time_start, time_end, party_size, status, source,
customer_id, table_id, table_combination_id, restaurant_id,
special_requests, created_at
```

`status` values: pending, pre_paid, confirmed, seated, completed, cancelled, no_show

### Columnas clave de `tables`

```
id, number, name_attick, capacity, capacity_min, can_combine, combine_group,
zone_id, is_active, position_x, position_y, floor_num, restaurant_id
```

---

## 11. DEPLOY Y VERIFICACIÓN

### Deploy actual

- **Rama productiva:** `master` (Vercel lee esta)
- **Flujo:** `main` → force-push → `master` → Vercel deploy auto
- **Último commit productivo:** `1fe9793` (fix de zona horaria Colombia)
- **Verificado:** Vercel deploy a Production exitoso ✅

### Verificación post-deploy

```
1. https://web-rosy-nine-64.vercel.app → funciona
2. Dashboard muestra reservas del día actual (Colombia UTC-5) ✅
3. Plano muestra reservas confirmed/seated ✅
4. Algoritmo de asignación operativo ✅
```

---

## 12. PROBLEMAS IDENTIFICADOS Y PLAN DE ACCIÓN

### 🔴 CRÍTICO: Reservas `pending` son invisibles en operación

**Problema:** Cuando un cliente reserva por la web, la reserva queda `pending`. Esto significa:
- NO aparece como ocupada en disponibilidad
- NO aparece en el plano
- NO cuenta como asiento ocupado
- El host TIENE que confirmar manualmente para que se vuelva visible

**Solución propuesta por Alejandro:** Auto-confirmar reservas → crear directamente en estado `confirmed`.

**Cambios necesarios:**
1. `POST /api/reservations` (línea 275): cambiar `status: 'pending'` → `status: 'confirmed'`
2. Cambiar email de `pending` → `confirmed` en el envío post-crear
3. Verificar que `confirmed` sea visible en todos los módulos operativos ✅ (ya lo es)
4. Simplificar: eliminar botón "Confirmar siguiente" del host o transformarlo en "Ver siguiente reserva"

### 🟡 MEDIO: Admin endpoint no usa algoritmo

**Problema:** `POST /api/admin/reservations` hace lookup naive de mesa por zona en vez de usar `assignTable()`.

**Solución:** Reemplazar el bloque de lookup naive (líneas ~93-99) con la misma lógica de `assignTable()` que ya usa el customer endpoint.

### 🟡 MEDIO: Walk-in no calcula hora Colombia

**Problema:** `HostWalkInForm.tsx` usa `new Date().toISOString().split('T')[0]` para calcular la fecha, que puede dar fecha UTC incorrecta después de las 7pm Colombia.

**Solución:** Reemplazar con `getColombiaDate()`.

### 🟢 MENOR: Email `pre_paid` no existe

**Problema:** Si se usa el status `pre_paid`, no hay template de email definido.

**Solución:** Agregar template `pre_paid` en `send.ts` o eliminar el status si no se usa.

### 🟢 MENOR: Auto-aprendizaje sin datos

El módulo FASE 6 está implementado pero no ajusta scores porque no hay suficientes correcciones del host. Requiere uso real para calibrar.

---

## 13. RESUMEN EJECUTIVO

| Componente | Estado | Nota |
|------------|--------|------|
| Auth (Google, Facebook, Phone, Email) | ✅ Funcional | |
| Formulario de reserva (2 pasos, disponibilidad dinámica) | ✅ Funcional | |
| Algoritmo de asignación de mesas (6 fases) | ✅ Funcional | |
| Host Panel (Mesas, Reservas, Plano) | ✅ Funcional | |
| Admin Panel (Dashboard, Inventario, Reservas, Mesas) | ✅ Funcional | |
| Plano interactivo (2 pisos, drag & drop) | ✅ Funcional | |
| Emails transaccionales (Resend) | ✅ Funcional | |
| Disponibilidad dinámica | ✅ Funcional | |
| Sugerencia de mesa + correcciones | ✅ Funcional | |
| Status `pending` → `confirmed` manual | ⚠️ Cuello de botella | Alejandro quiere auto-confirmar |
| Admin crea reserva sin algoritmo | ⚠️ Inconsistente | Naive lookup en vez de assignTable() |
| Zona horaria Colombia | ✅ Corregido | Commit 1fe9793 |
| Auto-aprendizaje zona scores | 🔵 Sin datos | Necesita uso real |
| `reservation_status_log` | 🔵 Sin código | Tabla existe, no se escribe desde endpoint |
| Phone uniqueness | ✅ Eliminado | Migración 003 |