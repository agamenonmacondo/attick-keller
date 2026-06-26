# Plan de Implementación: Tab "Mi Turno" en el Panel Admin

## 1. Matriz de Acceso por Rol

| Rol | ¿Ve "Mi Turno"? | Tabs visibles |
|---|---|---|
| `super_admin` | ✅ Sí | `mi-turno` + todos los demás tabs existentes |
| `store_admin` | ❌ No | Tabs actuales sin cambios |
| `lider_area` | ❌ No | Solo `turnos` (gestión de turnos del área) |
| `host` | ❌ No | `reservas`, `ocupacion` |
| `colaborador` | ✅ Sí (únicamente) | Solo `mi-turno` |
| `reservante` | ❌ No | No ve el panel admin |

**Nota clave:** `super_admin` ve "Mi Turno" para consultar su propio horario personal (si también tienen perfil de colaborador). `colaborador` ve **solo** este tab, no tiene acceso a ningún otro tab del panel.

---

## 2. Componentes Necesarios

### 2.1. Componentes a Construir (nuevos)

| Componente | Ubicación | Descripción |
|---|---|---|
| `MiTurnoPanel` | `src/components/admin/miturno/MiTurnoPanel.tsx` | Panel principal que contiene los sub-tabs internos y la navegación de semana. Reemplaza la lógica de `MiTurnoPage` |
| `MiTurnoSchedule` | `src/components/admin/miturno/MiTurnoSchedule.tsx` | Vista del horario semanal del colaborador (tab "horario"). Se extrae del contenido de `MiTurnoPage` |
| `MiTurnoCheckInOut` | `src/components/admin/miturno/MiTurnoCheckInOut.tsx` | Vista de check-in/out del turno actual (tab "checkin"). Reutiliza `CheckInOut.tsx` existente |
| `MiTurnoHours` | `src/components/admin/miturno/MiTurnoHours.tsx` | Vista de horas trabajadas (tab "horas"). Se extrae de `MiTurnoPage` |
| `MiTurnoNovedad` | `src/components/admin/miturno/MiTurnoNovedad.tsx` | Vista de reporte de contingencia (tab "novedad"). Reutiliza `ContingencyReport.tsx` existente |

### 2.2. Componentes a Reutilizar (sin cambios)

| Componente | Ubicación | Uso |
|---|---|---|
| `CheckInOut` | `src/components/admin/shifts/CheckInOut.tsx` | Componente de check-in/out con geolocalización. Se usa dentro de `MiTurnoCheckInOut` |
| `ContingencyReport` | `src/components/admin/shifts/ContingencyReport.tsx` | Formulario de reporte de novedades. Se usa dentro de `MiTurnoNovedad` |
| `AdminHeader` | `src/components/admin/AdminHeader.tsx` | Header existente del panel admin. Sin cambios |
| `AdminTabBar` | `src/components/admin/AdminTabBar.tsx` | Barra de tabs del panel. Se modifica para agregar el tab `mi-turno` |

### 2.3. Decisión de diseño: sub-tabs internos

El panel "Mi Turno" tendrá **4 sub-tabs internos** (como la página `/mi-turno` actual):

1. **Mi Horario** — Calendario semanal con turnos asignados
2. **Check In/Out** — Registro de entrada/salida del turno de hoy
3. **Novedad** — Reporte de contingencia (falta, tarde, permiso, incapacidad)
4. **Mis Horas** — Resumen de horas trabajadas en la semana

Estos sub-tabs se renderizan **dentro** del panel `MiTurnoPanel`, no como tabs de nivel superior en `AdminTabBar`.

---

## 3. Rutas API Necesarias

### 3.1. APIs Existentes (sin modificación necesaria)

| Ruta | Método | Descripción | Auth actual | ¿Funciona para colaborador? |
|---|---|---|---|---|
| `/api/admin/shift-my-week` | GET | Semana del colaborador | `getAdminUser` ∨ `getEmployeeUser` | ✅ Sí — ya acepta empleados |
| `/api/admin/shift-my-hours` | GET | Horas trabajadas | `getAdminUser` ∨ `getEmployeeUser` | ✅ Sí — ya acepta empleados |
| `/api/admin/shift-checkin` | POST | Registrar entrada | `getAdminUser` ∨ `getEmployeeUser` | ✅ Sí — ya acepta empleados |
| `/api/admin/shift-checkout` | POST | Registrar salida | `getAdminUser` ∨ `getEmployeeUser` | ✅ Sí — ya acepta empleados |
| `/api/admin/shift-novedades` | POST | Reportar novedad | `getAdminUser` ∨ `getEmployeeUser` | ✅ Sí — ya acepta empleados |

**Conclusión:** Todas las APIs ya soportan tanto admin como empleado. **No se requiere modificación en las APIs.**

### 3.2. Cambio en middleware para acceso a APIs

El middleware actual bloquea `/api/admin/*` para roles que no sean `store_admin`, `super_admin`, `host` o `lider_area`. Se debe agregar `colaborador` a la lista permitida.

---

## 4. Diagrama de Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────┐
│                     AdminShell.tsx                               │
│                                                                 │
│  useAuth() ──► roles[] ──► computeAllowedTabs(roles)           │
│       │                         │                               │
│       │                         ▼                               │
│       │              ┌──────────────────────┐                 │
│       │              │  ROLE_TABS             │                 │
│       │              │  super_admin: [...,    │                 │
│       │              │    'mi-turno']         │                 │
│       │              │  colaborador:           │                 │
│       │              │    ['mi-turno']        │                 │
│       │              └──────────────────────┘                 │
│       │                         │                               │
│       │                         ▼                               │
│       │              AdminTabBar (muestra tabs permitidos)    │
│       │                         │                               │
│       │                         ▼                               │
│       │              ┌──────────────────────┐                 │
│       │              │  MiTurnoPanel          │                 │
│       │              │  ┌──────────────────┐  │                 │
│       │              │  │ Sub-tabs:        │  │                 │
│       │              │  │ • Mi Horario     │  │                 │
│       │              │  │ • Check In/Out   │  │                 │
│       │              │  │ • Novedad        │  │                 │
│       │              │  │ • Mis Horas      │  │                 │
│       │              │  └──────────────────┘  │                 │
│       │              │         │               │                 │
│       │              │         ▼               │                 │
│       │              │  ┌──────────────────┐  │                 │
│       │              │  │  APIs:           │  │                 │
│       │              │  │  shift-my-week   │  │                 │
│       │              │  │  shift-my-hours  │  │                 │
│       │              │  │  shift-checkin   │  │                 │
│       │              │  │  shift-checkout  │  │                 │
│       │              │  │  shift-novedades │  │                 │
│       │              │  └──────────────────┘  │                 │
│       │              └──────────────────────┘                 │
│       │                                                         │
│       │              Para super_admin:                         │
│       │              Si tiene pos_nomina_staff_id, muestra     │
│       │              sus datos personales. Si no, muestra       │
│       │              un mensaje "No tienes perfil de           │
│       │              colaborador".                              │
│       └─────────────────────────────────────────────────────────┘
```

### Flujo para colaborador (ruta de acceso):

```
Usuario (colaborador) ──► /admin
    │
    ├── middleware.ts (verifica rol)
    │   └── hasAnyRole(['super_admin', 'store_admin', 'host', 'lider_area', 'colaborador'])
    │       └── ✅ Permitido
    │
    └── AdminShell.tsx
        ├── useAuth() → roles = ['colaborador']
        ├── computeAllowedTabs(['colaborador']) → ['mi-turno']
        ├── hasAnyAdminAccess(['colaborador']) → true (porque 'colaborador' está en ROLE_TABS)
        ├── activeTab = 'mi-turno'
        └── Renderiza <MiTurnoPanel />
```

---

## 5. Descripción del Layout UI (Mobile-First)

### 5.1. Vista general del panel "Mi Turno"

```
┌──────────────────────────────────────┐
│  ← Admin Header →                    │
├──────────────────────────────────────┤
│  [Mi Turno] tab en AdminTabBar       │
│  (icono: UserCircle / Clock)         │
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐  │
│  │ 👤 Alias del colaborador       │  │
│  │ Cargo — Área                   │  │
│  └────────────────────────────────┘  │
│                                      │
│  ◄ 2026-W25 ►  (navegador semana)   │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ Mi Horario │ Check │ Nov │ Horas│  │
│  │   (sub-tabs internos)          │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ Contenido del sub-tab activo   │  │
│  │                                │  │
│  │ (horario/checkin/novedad/horas)│  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

### 5.2. Sub-tab: Mi Horario

- Tarjeta por cada día de la semana (Lun-Dom)
- Día actual resaltado con borde borgoña
- Muestra: código de turno, nombre, horario (entrada-salida), horas totales
- Días sin turno muestran "Descanso" en gris
- Badges de check-in/out si existen
- Badges de novedad si existen (falta, tarde, etc.)

### 5.3. Sub-tab: Check In/Out

- Card "Turno de hoy" con información del turno asignado
- Componente `CheckInOut` con botones de check-in y check-out
- Validación de geolocalización (ya implementada en CheckInOut)
- Estado visual: sin check → botón verde "Check-in" → botón azul "Check-out" → "Turno registrado" ✓

### 5.4. Sub-tab: Novedad

- Formulario `ContingencyReport` existente
- Selector de tipo: falta, tarde, permiso, incapacidad
- Selector de fecha
- Campo de descripción (opcional)
- Validación de 24h de anticipación (para colaboradores, no para admin)

### 5.5. Sub-tab: Mis Horas

- Card con total de horas trabajadas en la semana (número grande, color borgoña)
- Lista de registros diarios con:
  - Fecha (día de la semana)
  - Hora de check-in → check-out
  - Horas calculadas
  - Tipo de novedad si aplica (falta, tarde, etc.)

### 5.6. Para super_admin

Si el super_admin no tiene `pos_nomina_staff_id`, el panel muestra un mensaje:
> "No tienes un perfil de colaborador asociado. Este tab muestra tu horario personal si tienes asignaciones de turno."

Si sí tiene perfil, funciona igual que para un colaborador.

---

## 6. Pasos de Implementación (en orden)

### Paso 1: Modificar tipos — `AdminTab` y `TABS` en `AdminTabBar.tsx`

**Archivo:** `src/components/admin/AdminTabBar.tsx`

Agregar `'mi-turno'` al tipo `AdminTab` y agregar la entrada en el array `TABS`:

```tsx
export type AdminTab = 'reservas' | 'ocupacion' | 'mesas' | 'plano' | 'metricas' | 'operacion' | 'clientes' | 'menu' | 'equipo' | 'nomina' | 'turnos' | 'app-rodri' | 'informes' | 'mi-turno'

// En el array TABS, agregar al final:
{ key: 'mi-turno', label: 'Mi Turno', icon: <UserCircle size={18} weight="regular" /> },
```

**Nota:** Se necesita importar `UserCircle` de `@phosphor-icons/react`. Alternativa: `ClockUser` o `CalendarCheck`.

### Paso 2: Modificar `ROLE_TABS` en `AdminShell.tsx`

**Archivo:** `src/components/admin/AdminShell.tsx`

```tsx
const ROLE_TABS: Record<string, AdminTab[]> = {
  super_admin: ['reservas', 'ocupacion', 'mesas', 'plano', 'metricas', 'operacion', 'clientes', 'menu', 'equipo', 'nomina', 'turnos', 'app-rodri', 'informes', 'mi-turno'],
  store_admin: ['reservas', 'ocupacion', 'mesas', 'plano', 'metricas'],
  host: ['reservas', 'ocupacion'],
  lider_area: ['turnos'],
  colaborador: ['mi-turno'],
}
```

Agregar `colaborador` como nueva key con valor `['mi-turno']`.

Agregar `'mi-turno'` al array de `super_admin`.

### Paso 3: Modificar `hasAnyAdminAccess` en `AdminShell.tsx`

La función actual `hasAnyAdminAccess` ya funciona correctamente porque verifica si algún rol del usuario está en `ROLE_TABS`. Al agregar `colaborador` a `ROLE_TABS`, un colaborador pasará esta verificación.

**No se requiere cambio en la función**, pero confirmar que funciona:

```tsx
function hasAnyAdminAccess(roles: string[]): boolean {
  return roles.some(r => r in ROLE_TABS)  // 'colaborador' ahora SÍ está en ROLE_TABS
}
```

### Paso 4: Modificar `middleware.ts` — Permitir acceso de colaborador a `/admin` y `/api/admin/*`

**Archivo:** `src/middleware.ts`

Cambio 1 — Protección de `/api/admin/*` (línea ~55):

```tsx
// Antes:
const allowed = await hasAnyRole(['store_admin', 'super_admin', 'host', 'lider_area'])

// Después:
const allowed = await hasAnyRole(['store_admin', 'super_admin', 'host', 'lider_area', 'colaborador'])
```

Cambio 2 — Protección de `/admin` (línea ~66):

```tsx
// Antes:
const allowed = await hasAnyRole(['store_admin', 'super_admin', 'host', 'lider_area'])

// Después:
const allowed = await hasAnyRole(['store_admin', 'super_admin', 'host', 'lider_area', 'colaborador'])
```

**Importante:** No se agrega `colaborador` a la protección de `/host` porque los colaboradores no deben acceder al panel de host.

### Paso 5: Modificar `auth-provider.tsx` — Actualizar `isAdmin`

**Archivo:** `src/lib/auth/auth-provider.tsx`

La propiedad derivada `isAdmin` actualmente es:

```tsx
const isAdmin = roles.includes('super_admin') || roles.includes('store_admin') || roles.includes('lider_area') || roles.includes('host')
```

Se debe actualizar para incluir `colaborador`:

```tsx
const isAdmin = roles.includes('super_admin') || roles.includes('store_admin') || roles.includes('lider_area') || roles.includes('host') || roles.includes('colaborador')
```

Esto es necesario porque `isAdmin` se usa en otros lugares (como redirecciones y renderizado condicional) para determinar si un usuario debe ser enviado al panel admin. Sin este cambio, un colaborador podría ser redirigido a `/perfil` en lugar de `/admin`.

**Nota:** Verificar todos los usos de `isAdmin` en el código para asegurar que no haya efectos secundarios no deseados. Buscar usos con: `grep -r "isAdmin" src/`.

### Paso 6: Crear el componente `MiTurnoPanel`

**Archivo nuevo:** `src/components/admin/miturno/MiTurnoPanel.tsx`

Este componente orquesta todo el panel "Mi Turno". Contiene:

1. **Estado:** `activeSubTab`, `weekStr`, `employee`, `schedule`, `assignments`, `shiftTypes`, `loading`, `totalWorkedHours`, `dailyHours`
2. **Sub-tabs internos:** horario, checkin, novedad, horas
3. **Navegador de semana:** botones anterior/siguiente con formato `YYYY-WNN`
4. **Fetch de datos:** llama a `/api/admin/shift-my-week` y `/api/admin/shift-my-hours`
5. **Renderizado condicional** según el sub-tab activo

Se extrae casi toda la lógica de `src/app/mi-turno/page.tsx`, pero sin la navegación propia (header, logout) ya que eso ya lo provee `AdminShell`.

### Paso 7: Crear sub-componentes del panel

**Archivos nuevos:**

- `src/components/admin/miturno/MiTurnoSchedule.tsx` — Vista de horario semanal
- `src/components/admin/miturno/MiTurnoCheckInOut.tsx` — Vista de check-in/out con info del turno de hoy
- `src/components/admin/miturno/MiTurnoHours.tsx` — Vista de horas trabajadas
- `src/components/admin/miturno/MiTurnoNovedad.tsx` — Wrapper alrededor de `ContingencyReport`

### Paso 8: Integrar `MiTurnoPanel` en `AdminShell.tsx`

**Archivo:** `src/components/admin/AdminShell.tsx`

Agregar import y renderizado condicional:

```tsx
import { MiTurnoPanel } from './miturno/MiTurnoPanel'

// En el render, agregar:
{activeTab === 'mi-turno' && <MiTurnoPanel />}
```

### Paso 9: Verificar y actualizar `getEmployeeUser` en `admin-auth.ts`

**Archivo:** `src/lib/utils/admin-auth.ts`

La función `getEmployeeUser` ya incluye `colaborador` en su filtro `.in('role', ['lider_area', 'colaborador', 'reservante'])`. **No se requiere cambio.**

Las APIs `shift-my-week`, `shift-my-hours`, `shift-checkin`, `shift-checkout`, `shift-novedades` ya manejan ambos casos (admin y empleado). **No se requiere cambio en las APIs.**

### Paso 10: Redirigir `/mi-turno` a `/admin`

**Opcional pero recomendado:** Modificar `src/app/mi-turno/page.tsx` para que redirija al usuario a `/admin` con el tab `mi-turno` activo, en lugar de mantener la página independiente.

Esto se puede hacer de dos formas:
- **Opción A (recomendada):** Reemplazar el contenido de `mi-turno/page.tsx` con una redirección: `redirect('/admin')`
- **Opción B:** Mantener la página existente como fallback y agregar un enlace/badge que diga "También disponible en el panel admin"

### Paso 11: Pruebas y verificación

- [ ] Colaborador puede acceder a `/admin` y ve solo el tab "Mi Turno"
- [ ] Colaborador no ve otros tabs (reservas, ocupación, etc.)
- [ ] super_admin ve el tab "Mi Turno" junto a todos los demás tabs
- [ ] store_admin, lider_area, host NO ven el tab "Mi Turno"
- [ ] Las APIs de shift funcionan correctamente para colaborador desde `/admin`
- [ ] El middleware permite el paso de colaborador a `/admin`
- [ ] La navegación de semana funciona correctamente
- [ ] Check-in/out funciona desde el panel admin
- [ ] Reporte de novedades funciona desde el panel admin
- [ ] Horas trabajadas se muestran correctamente
- [ ] Si un super_admin sin `pos_nomina_staff_id` accede a "Mi Turno", ve un mensaje apropiado

---

## 7. Cambios Detallados en AdminShell.tsx ROLE_TABS

```diff
 const ROLE_TABS: Record<string, AdminTab[]> = {
-  super_admin: ['reservas', 'ocupacion', 'mesas', 'plano', 'metricas', 'operacion', 'clientes', 'menu', 'equipo', 'nomina', 'turnos', 'app-rodri', 'informes'],
+  super_admin: ['reservas', 'ocupacion', 'mesas', 'plano', 'metricas', 'operacion', 'clientes', 'menu', 'equipo', 'nomina', 'turnos', 'app-rodri', 'informes', 'mi-turno'],
   store_admin: ['reservas', 'ocupacion', 'mesas', 'plano', 'metricas'],
   host: ['reservas', 'ocupacion'],
   lider_area: ['turnos'],
+  colaborador: ['mi-turno'],
 }
```

Agregar en el renderizado:
```diff
+import { MiTurnoPanel } from './miturno/MiTurnoPanel'

 // ... dentro del return:
+        {activeTab === 'mi-turno' && <MiTurnoPanel />}
```

---

## 8. Cambios Detallados en middleware.ts

### Protección de `/api/admin/*` — agregar `colaborador`

```diff
-    const allowed = await hasAnyRole(['store_admin', 'super_admin', 'host', 'lider_area'])
+    const allowed = await hasAnyRole(['store_admin', 'super_admin', 'host', 'lider_area', 'colaborador'])
```

### Protección de `/admin` — agregar `colaborador`

```diff
-    const allowed = await hasAnyRole(['store_admin', 'super_admin', 'host', 'lider_area'])
+    const allowed = await hasAnyRole(['store_admin', 'super_admin', 'host', 'lider_area', 'colaborador'])
```

### Protección de `/mi-turno` — mantener pero también redirigir a `/admin`

Se puede mantener la protección existente de `/mi-turno` para compatibilidad, o cambiar la redirección:

```diff
   // Protect /mi-turno — employee only
   if (request.nextUrl.pathname.startsWith('/mi-turno')) {
     if (!user) {
       return NextResponse.redirect(new URL('/auth/login', request.url))
     }
     const allowed = await hasAnyRole(['lider_area', 'colaborador', 'reservante', 'store_admin', 'super_admin'])
     if (!allowed) {
       return NextResponse.redirect(new URL('/perfil', request.url))
     }
+    // Redirigir colaboradores al panel admin
+    if (await hasAnyRole(['colaborador']) && !await hasAnyRole(['store_admin', 'super_admin', 'host', 'lider_area'])) {
+      return NextResponse.redirect(new URL('/admin', request.url))
+    }
   }
```

**Alternativa más simple:** Cambiar la página `/mi-turno/page.tsx` para que haga `redirect('/admin')` del lado del cliente.

---

## 9. Cambios Detallados en auth-provider.tsx y admin-auth.ts

### auth-provider.tsx

```diff
-const isAdmin = roles.includes('super_admin') || roles.includes('store_admin') || roles.includes('lider_area') || roles.includes('host')
+const isAdmin = roles.includes('super_admin') || roles.includes('store_admin') || roles.includes('lider_area') || roles.includes('host') || roles.includes('colaborador')
```

**Verificar impacto:** Buscar todos los usos de `isAdmin` en el código para asegurarse de que no hay redirecciones no deseadas. Los principales usos son:

1. En `AdminShell.tsx` — `hasAnyAdminAccess` usa `ROLE_TABS`, no `isAdmin`
2. En páginas de autenticación — puede redirigir a `/admin` vs `/perfil`
3. En `mi-turno/page.tsx` — no usa `isAdmin`

**Riesgo:** Si `isAdmin` se usa en algún lugar para conceder permisos de gestión (no solo navegación), agregar `colaborador` podría ser un problema de seguridad. **Revisar todos los usos antes de hacer este cambio.**

### admin-auth.ts

**No se requieren cambios.** La función `getEmployeeUser` ya incluye `colaborador` en su filtro. Las APIs existentes ya manejan la autenticación dual admin/empleado correctamente.

Sin embargo, si se quiere agregar una función helper específica para el contexto de "Mi Turno", se podría agregar:

```typescript
// Helper nuevo (opcional): obtener cualquier usuario que pueda acceder a Mi Turno
export async function getMiTurnoUser(request: NextRequest): Promise<(AdminUser & { pos_nomina_staff_id?: string }) | EmployeeUser | null> {
  const admin = await getAdminUser(request)
  if (admin) return { ...admin, pos_nomina_staff_id: undefined }
  
  const employee = await getEmployeeUser(request)
  if (employee) return employee
  
  return null
}
```

Pero esto es opcional ya que las APIs existentes ya hacen esta lógica internamente.

---

## 10. Consideraciones Adicionales

### 10.1. Caso edge: super_admin sin perfil de colaborador

Si un `super_admin` no tiene `pos_nomina_staff_id` en la tabla `user_roles`, la API `shift-my-week` retornará error 404 ("Perfil de colaborador no encontrado"). El componente `MiTurnoPanel` debe manejar este caso mostrando un mensaje amigable:

> "No tienes un perfil de colaborador asociado. Este tab muestra información de turnos cuando tienes asignaciones como colaborador."

### 10.2. Caso edge: colaborador con múltiples roles

Si un usuario tiene tanto `colaborador` como `lider_area`, el sistema de `ROLE_TABS` le dará acceso a ambos tabs: `['mi-turno', 'turnos']`. Esto es correcto y esperado — puede ver su horario personal Y gestionar turnos de su área.

### 10.3. Tab activo por defecto para colaborador

Cuando un `colaborador` accede a `/admin`, `allowedTabs` será `['mi-turno']`. El código actual de `AdminShell` establece:
```tsx
const [activeTab, setActiveTab] = useState<AdminTab>(() => allowedTabs[0] || 'reservas')
```

Esto funcionará correctamente: el tab activo por defecto será `'mi-turno'` (el primer y único tab permitido).

### 10.4. Redirección desde `/perfil`

Si existe lógica en `/perfil` que redirige a usuarios admin a `/admin`, se debe asegurar que los colaboradores también sean redirigidos. Buscar y actualizar cualquier lógica de redirección basada en roles.

### 10.5. Separación del `/mi-turno` existente

La página `/mi-turno` actual (416 líneas) será reemplazada funcionalmente por `MiTurnoPanel`. Se recomienda:

1. Crear `MiTurnoPanel` extrayendo la lógica de `/mi-turno/page.tsx`
2. Una vez verificado que funciona en `/admin`, simplificar `/mi-turno/page.tsx` para redirigir a `/admin`
3. No eliminar `/mi-turno/page.tsx` inmediatamente (mantener como redirect por compatibilidad con links existentes)

---

## 11. Resumen de Archivos a Modificar/Crear

### Archivos a MODIFICAR:

| Archivo | Cambio |
|---|---|
| `src/components/admin/AdminTabBar.tsx` | Agregar `'mi-turno'` al tipo `AdminTab` y entrada en `TABS` |
| `src/components/admin/AdminShell.tsx` | Agregar `'mi-turno'` a `ROLE_TABS` de super_admin, agregar `colaborador`, importar y renderizar `MiTurnoPanel` |
| `src/middleware.ts` | Agregar `'colaborador'` a `hasAnyRole` para `/admin` y `/api/admin/*` |
| `src/lib/auth/auth-provider.tsx` | Agregar `colaborador` a la condición `isAdmin` |
| `src/app/mi-turno/page.tsx` | Reemplazar con redirección a `/admin` (paso opcional) |

### Archivos a CREAR:

| Archivo | Descripción |
|---|---|
| `src/components/admin/miturno/MiTurnoPanel.tsx` | Panel principal con sub-tabs y navegación de semana |
| `src/components/admin/miturno/MiTurnoSchedule.tsx` | Vista de horario semanal |
| `src/components/admin/miturno/MiTurnoCheckInOut.tsx` | Vista de check-in/out del turno de hoy |
| `src/components/admin/miturno/MiTurnoHours.tsx` | Vista de horas trabajadas |
| `src/components/admin/miturno/MiTurnoNovedad.tsx` | Wrapper para reporte de contingencia |

### Archivos SIN CAMBIOS:

| Archivo | Razón |
|---|---|
| `src/app/api/admin/shift-my-week/route.ts` | Ya acepta admin y empleado |
| `src/app/api/admin/shift-my-hours/route.ts` | Ya acepta admin y empleado |
| `src/app/api/admin/shift-checkin/route.ts` | Ya acepta admin y empleado |
| `src/app/api/admin/shift-checkout/route.ts` | Ya acepta admin y empleado |
| `src/app/api/admin/shift-novedades/route.ts` | Ya acepta admin y empleado |
| `src/lib/utils/admin-auth.ts` | `getEmployeeUser` ya incluye `colaborador` |
| `src/components/admin/shifts/CheckInOut.tsx` | Se reutiliza sin cambios |
| `src/components/admin/shifts/ContingencyReport.tsx` | Se reutiliza sin cambios |