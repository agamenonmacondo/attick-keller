# Analisis de Usabilidad y Necesidad de Informacion
## Pestaña Turnos y Nomina — A&K

**Fecha:** Mayo 2026  
**Base:** spec.md actual + datos reales de Supabase + observacion operativa

---

## 1. QUIEN USA ESTO Y PARA QUE

Los lideres de area deciden los horarios. Los colaboradores los consultan y marcan su entrada.

### Usuarios y sus necesidades reales

| Usuario | Que hace hoy | Que necesita del sistema | Frecuencia |
|---------|-------------|--------------------------|------------|
| **Esneider** (Cocina) | Arma horarios en Rodri/app | Ver equipo, asignar turnos, estimar costo de su area | Semanal |
| **Walter** (Barra) | Arma horarios en Excel | Ver equipo, asignar turnos, estimar costo de su area | Semanal |
| **Veronica** (Servicio) | Arma horarios en Excel | Ver equipo, asignar turnos, estimar costo de su area | Semanal |
| **Alejandro** (Admin) | Ve costos globales, aprueba | Ver todas las areas, costos totales, alertas legales | Diaria |
| **44 colaboradores** | No ven horarios hasta que estan en el restaurante | Ver su semana, marcar entrada/salida, reportar novedades | Diaria |

---

## 2. ROLES DEL SISTEMA — LOS 4 ROLES

### 2.1 Roles existentes + nuevos

El sistema YA TIENE `user_roles` con 3 roles. Agregamos 2 nuevos sin borrar los existentes:

| Rol | Descripcion | Quien | Nuevo? |
|-----|------------|-------|--------|
| `super_admin` | Acceso total a todo | Alejandro | Ya existe |
| `store_admin` | Admin de tienda, ve todo | Admin de tienda | Ya existe |
| `lider_area` | Ver/editar SOLO su area | Esneider, Walter, Veronica | **NUEVO** |
| `colaborador` | Ver SUS turnos, check-in/out, reportar novedades | 44 empleados C75 | **NUEVO** |
| `host` | Sin acceso a Turnos | Operativos de reservas | Ya existe |

### 2.2 Panel Equipo — Cambios necesarios

El panel Equipo existente (`TeamPanel`) permite agregar usuarios con `host` o `store_admin`. Se agregan los 2 roles nuevos al dropdown:

```
Actual:
<option value="host">Host</option>
<option value="store_admin">Administrador</option>

Nuevo:
<option value="super_admin">Super Admin</option>
<option value="store_admin">Administrador</option>
<option value="lider_area">Lider de Area</option>
<option value="colaborador">Colaborador</option>
<option value="host">Host</option>
```

### 2.3 Campos adicionales para roles nuevos

**Para `lider_area`:**
- Seleccionar area: `cocina` | `barra` | `servicio`
- Campo `area` en `user_roles` (texto, nullable)

**Para `colaborador`:**
- Vincular con su registro en `pos_nomina_staff`
- Campo `pos_nomina_staff_id` en `user_roles` (UUID, nullable, FK a pos_nomina_staff)
- Area se infiere automaticamente del cargo del empleado

### 2.4 Permisos por rol

| Vista/accion | super_admin | store_admin | lider_area | colaborador | host |
|-------------|-------------|-------------|------------|------------|------|
| Ver Cronograma (todas las areas) | SI | SI | NO | NO | NO |
| Ver Cronograma (su area) | SI | SI | SI | NO | NO |
| Editar asignaciones | SI | SI | SI (su area) | NO | NO |
| Ver Performance (todas) | SI | SI | NO | NO | NO |
| Ver Performance (su area) | SI | SI | SI | NO | NO |
| Auto-generar malla | SI | SI | SI (su area) | NO | NO |
| Publicar cronograma | SI | SI | SI (su area) | NO | NO |
| Ver sus turnos asignados | SI | SI | SI | SI | NO |
| Check-in / Check-out | NO | NO | NO | SI | NO |
| Reportar novedad (no puedo ir, tarde) | NO | NO | NO | SI | NO |
| Ver costos globales | SI | SI | NO | NO | NO |
| Ver costos de su area | SI | SI | SI | NO | NO |
| Panel Equipo (gestionar usuarios) | SI | SI | NO | NO | NO |

---

## 3. VISTAS — 3 SUB-TABS

### 3.1 Cronograma (lider_area + admin)

Grilla semanal por area. El lider ve solo su area, el admin ve las 3.

**Datos necesarios:**
- Empleados de su area (`pos_nomina_staff` filtrado por cargo)
- Catalogo de turnos de su area (`shift_types`)
- Asignaciones existentes (`shift_assignments`)
- Calculo de costo en tiempo real (client-side)
- Alertas legales automaticas (>8h, >44h, sin descanso)

### 3.2 Performance (lider_area + admin)

Horas reales vs estimadas, costos, alertas.

**Datos necesarios:**
- Horas reales del biometrico (`bio_reporte` de Rodri)
- Horas estimadas de los turnos asignados (`shift_assignments` + `shift_types`)
- Calculo de costo real vs estimado
- Cruce por nombre/cedula con `pos_nomina_staff`

### 3.3 Mi Turno (colaborador)

Vista del colaborador: su semana, check-in/out, reportar novedad.

**Datos necesarios:**
- Turnos asignados a el (`shift_assignments` filtrado por employee_id)
- Hora actual para check-in/out
- Geolocalizacion del browser (informativa, no obligatoria)
- Formulario simple de novedad: tipo (no puedo ir, llegue tarde, etc) + descripcion

---

## 4. INFORMACION — DE DONDE SALE CADA COSA

### 4.1 Lo que YA TENEMOS en Supabase (POS DB)

| Tabla | Datos | Suficiente? |
|-------|-------|-------------|
| `pos_nomina_staff` | 38 empleados C75 con cedula, nombre, cargo, sede, salario | SI - base de empleados |
| `pos_areas` | 10 zonas del restaurante | SI - para POS, no turnos |
| `user_roles` | 6 usuarios con rol y auth | SI - hay que agregar lider_area y colaborador |
| `pos_sales` | Ventas por zona y dia | SI - revenue vs costo |
| Auth (Supabase) | Login/signup/email | SI - invitar todos |

### 4.2 Lo que YA TENEMOS en Rodri DB

| Tabla/Dato | Datos | Suficiente? |
|------------|-------|-------------|
| `turnos_config` | 29 codigos de turno con HO/HN | SI - catalogo base |
| `schedules` + `employees` | Horarios asignados Cocina | SI - referencia historica |
| `params` | Jornada 44h, recargos, etc. | SI - parametros legales |
| `bio_reporte_*` | Horas reales biometrico | SI - plan vs real |

### 4.3 Lo que HAY QUE CREAR

| Tabla | Para que | Notas |
|-------|----------|-------|
| `shift_schedules` | Cronogramas semanales por area | Simplificada: draft/published |
| `shift_assignments` | Turnos asignados por persona/dia | Incluye costo estimado |
| `shift_types` | Catalogo de 24 codigos de turno | Se siembra desde Rodri + Excel |
| `shift_novedades` | Novedades de colaboradores | No puedo ir, llegue tarde, etc |
| Alter `user_roles` | Agregar `area` y `pos_nomina_staff_id` | Para filtrar y vincular |

**Se MANTIENE `shift_novedades`** porque los colaboradores van a reportar desde la app. No es lo mismo que WhatsApp informal — es un registro formal con tipo, fecha, descripcion.

**Se ELIMINA `shift_contingencies`** — se unifica con `shift_novedades`. Una novedad del colaborador cubre ambos casos (no puedo ir, llegue tarde).

### 4.4 Tablas eliminadas del spec original

| Tabla eliminada | Por que |
|----------------|---------|
| ~~`shift_contingencies`~~ | Se unifica con `shift_novedades` |

---

## 5. MODELO DE DATOS ACTUALIZADO

### 5.1 `user_roles` (modificar tabla existente)

```sql
-- Agregar columnas
ALTER TABLE user_roles ADD COLUMN area TEXT; 
-- valores: 'cocina' | 'barra' | 'servicio' (solo para lider_area)
ALTER TABLE user_roles ADD COLUMN pos_nomina_staff_id UUID REFERENCES pos_nomina_staff(id);
-- vincula usuario del sistema con empleado de nomina (para colaboradores y lideres)

-- Agregar valores al check constraint del rol (si existe)
-- Roles finales: super_admin | store_admin | lider_area | colaborador | host
```

### 5.2 `shift_types` (catálogo, sin cambios)

```sql
CREATE TABLE shift_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  area TEXT NOT NULL, -- 'cocina' | 'barra' | 'servicio'
  entrada TIME NOT NULL,
  salida TIME NOT NULL,
  ordinarias DECIMAL(4,1) NOT NULL,
  nocturnas DECIMAL(4,1) NOT NULL DEFAULT 0,
  is_split BOOLEAN DEFAULT FALSE,
  split_entrada TIME,
  split_salida TIME,
  description TEXT,
  UNIQUE(code, area)
);
```

### 5.3 `shift_schedules` (simplificado)

```sql
CREATE TABLE shift_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  area TEXT NOT NULL, -- 'cocina' | 'barra' | 'servicio'
  week_str TEXT NOT NULL, -- '2026-W23'
  created_by UUID REFERENCES user_roles(id), -- lider o admin que creo
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'published'
  total_estimated_cost DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(area, week_str)
);
```

**Cambios vs spec original:**
- Eliminado `version` — un cronograma por area por semana, punto
- Eliminado `approved` — el lider publica, no necesita aprobacion de otro
- `created_by` referencia `user_roles` en vez de `profiles`

### 5.4 `shift_assignments` (turnos por persona/dia)

```sql
CREATE TABLE shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES shift_schedules(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES pos_nomina_staff(id),
  day_index INT NOT NULL, -- 0=Dom, 1=Lun, ..., 6=Sab
  shift_code TEXT NOT NULL, -- referencia a shift_types.code
  entrada TIME, -- override si es personalizado
  salida TIME, -- override si es personalizado
  novedad TEXT, -- 'X' = descanso, 'VAC' = vacaciones, 'INC' = incapacidad, 'PERM' = permiso
  estimated_hours DECIMAL(4,1), -- horas estimadas calculadas
  estimated_cost DECIMAL(12,2), -- costo estimado calculado
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(schedule_id, employee_id, day_index)
);
```

**Cambios vs spec original:**
- Eliminado `checkin_at`, `checkout_at`, `checkin_location`, `checkout_location` — eso va en la tabla de novedades
- Eliminado `is_overtime` — se calcula client-side
- `novedad` es un texto corto en la celda, no una tabla separada

### 5.5 `shift_novedades` (reportes de colaboradores)

```sql
CREATE TABLE shift_novedades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES pos_nomina_staff(id),
  schedule_id UUID REFERENCES shift_schedules(id),
  date DATE NOT NULL,
  type TEXT NOT NULL, -- 'checkin' | 'checkout' | 'falta' | 'tarde' | '_permiso' | 'incapacidad'
  checkin_at TIMESTAMPTZ, -- hora real de entrada (tipo=checkin)
  checkout_at TIMESTAMPTZ, -- hora real de salida (tipo=checkout)
  location JSONB, -- {lat, lng, accuracy} geolocalizacion
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Unifica novedades Y check-in en una sola tabla:**
- `type='checkin'` → entrada al turno con hora y ubicacion
- `type='checkout'` → salida del turno con hora y ubicacion  
- `type='falta'` → no puedo ir
- `type='tarde'` → llegue tarde
- `type='permiso'` → permiso solicitado
- `type='incapacidad'` → incapacidad medica

---

## 6. FLUJO DE TRABAJO COMPLETO

### Lider de area (semanal):

1. **Entra al sistema** → Ve solo su area
2. **Selecciona semana** → Proxima semana (o +1, +2, +3)
3. **Ve grilla con empleados** → Carga `pos_nomina_staff` filtrado por area
4. **Puede auto-generar** → Boton "Generar malla optima" (adapta AutoScheduleTab)
5. **O asigna manualmente** → Dropdown en cada celda (turnos de su area)
6. **Marca novedades** → X = descanso, VAC = vacaciones, INC = incapacidad
7. **Guarda como draft** → Se guarda sin notificar
8. **Revisa costo** → Ve horas totales y costo estimado por empleado
9. **Ve alertas** → Celdas rojas si >44h, >8h, sin descanso
10. **Publica** → Cronograma visible para los colaboradores de su area

### Colaborador (diario):

1. **Abre la app** → Ve "Mi Semana" con sus turnos asignados
2. **Llega al restaurante** → Boton "Marcar entrada" → registra hora + ubicacion
3. **Sale del restaurante** → Boton "Marcar salida" → registra hora + ubicacion
4. **No puede ir** → Reporta novedad: tipo (falta, permiso, incapacidad) + descripcion
5. **Llega tarde** → La app lo detecta al hacer check-in y lo registra

### Admin (diario):

1. **Ve consolidado** → Costos de las 3 areas, horas totales, alertas
2. **Compara plan vs real** → Horas asignadas vs horas del biometrico
3. **Ve novedades** → Faltas, tardanzas, incapacidades reportadas

---

## 9. MAPEO CARGO → AREA: DE DONDE SALE

### 9.1 Fuentes de mapeo disponibles

Tenemos **2 fuentes** que nos dicen a que area pertenece cada colaborador:

**Fuente 1: `pos_nomina_staff.cargo` (POS DB)**

El campo `cargo` define implicitamente el area. La app puede mapear automaticamente:

| Cargo en pos_nomina_staff | Area asignada | Logica |
|---------------------------|---------------|--------|
| JEFE DE COCINA | Cocina | Cargo contiene "COCINA" |
| AUXILIAR DE COCINA | Cocina | Cargo contiene "COCINA" |
| PASANTE AUX COCINA | Cocina | Cargo contiene "COCINA" |
| STEWARD | Cocina | Steward apoya cocina |
| JEFE DE BAR | Barra | Cargo contiene "BAR" |
| JEFE BAR 50% PROPINAS | Barra | Cargo contiene "BAR" |
| BARTENDER | Barra | Cargo contiene "BARTENDER" |
| AUXILIAR BAR | Barra | Cargo contiene "BAR" |
| JEFE DE SERVICIO | Servicio | Cargo contiene "SERVICIO" |
| SUB JEFE SERVICIO | Servicio | Cargo contiene "SERVICIO" |
| MESERO | Servicio | Cargo contiene "MESER" |
| MESERA | Servicio | Cargo contiene "MESER" |
| CAJERA ADMINISTRATIVO | Servicio | Cajeros = Servicio |
| SERVICIOS GENERALES | Apoyo | No encaja en las 3 areas |
| INGENIERO DE SONIDO | Apoyo | No encaja en las 3 areas |
| ASESOR COM VENTAS | Apoyo | No encaja en las 3 areas |
| PASANTE ADMINISTRATIVA | Apoyo | No encaja en las 3 areas |

**Fuente 2: `employees.team` (Rodri DB)**

Solo tiene Cocina y Pizzeria (17 en Cocina, 3 en Pizzeria). Es limitada — **no tiene Barra ni Servicio como equipos**.

### 9.2 Propuesta: campo `area` automatico en `pos_nomina_staff`

Agregar un campo `area` a la tabla de nomina que se calcula automaticamente del cargo:

```sql
ALTER TABLE pos_nomina_staff ADD COLUMN area TEXT;
-- Valores: 'cocina' | 'barra' | 'servicio' | 'apoyo' | NULL

-- Actualizar con mapeo automatico:
UPDATE pos_nomina_staff SET area = 'cocina' 
  WHERE cargo ILIKE '%cocina%' OR cargo ILIKE '%steward%';
UPDATE pos_nomina_staff SET area = 'barra' 
  WHERE cargo ILIKE '%bar%' OR cargo ILIKE '%bartender%';
UPDATE pos_nomina_staff SET area = 'servicio' 
  WHERE cargo ILIKE '%servicio%' OR cargo ILIKE '%meser%' 
  OR cargo ILIKE '%cajer%';
UPDATE pos_nomina_staff SET area = 'apoyo' 
  WHERE cargo ILIKE '%servicios generales%' OR cargo ILIKE '%ingeniero%' 
  OR cargo ILIKE '%asesor%' OR cargo ILIKE '%pasante administr%';
```

**Ventaja:** El lider de area ve automaticamente los colaboradores de su area. Cuando se crea un nuevo empleado con cargo, se le asigna el area correspondiente.

### 9.3 Mapeo completo: 38 empleados C75

#### Cocina (11 personas)
| Cargo | Nombre | Salario | Area auto |
|-------|--------|---------|-----------|
| JEFE DE COCINA | ESNEIDER BLANCO CASTILLO | $2,500,000 | cocina |
| AUXILIAR DE COCINA | JUAN PABLO NARVAEZ REINOSO | $1,750,905 | cocina |
| AUXILIAR DE COCINA | NICOLAS STIVEN ALFARO FONSECA | $1,800,000 | cocina |
| AUXILIAR DE COCINA | IVAN FELIPE LARRAHONDO CARABALI | $1,750,905 | cocina |
| AUXILIAR DE COCINA | CARLOS STEVEN SUAREZ HERRERA | $1,750,905 | cocina |
| AUXILIAR DE COCINA | MAURICIO LAVERDE GUTIERREZ | $1,750,905 | cocina |
| AUXILIAR DE COCINA | WENDY VANNESA ALDANA CHILA | $1,750,905 | cocina |
| PASANTE AUX COCINA | LEIDY CATALINA ROZO MARTINEZ | $1,750,905 | cocina |
| STEWARD | YOHANA ALEXI CRUZ PADUA | $1,750,905 | cocina |
| STEWARD | DUCIBETH ARIOLA PUSHAINA URIYU | $1,750,905 | cocina |
| STEWARD | CLARA EDUVINA GONZALEZ GUTIERREZ | $1,750,905 | cocina |

#### Barra (7 personas)
| Cargo | Nombre | Salario | Area auto |
|-------|--------|---------|-----------|
| JEFE DE BAR | WALTER VILLAMOROS RODRIGUEZ | $3,000,000 | barra |
| JEFE BAR 50% PROPINAS | ASHLYE STEPHANIE TELLEZ VALDERRAMA | $1,750,905 | barra |
| BARTENDER | LIZETH DAYANNA CASALLAS ORTIZ | $875,452 | barra |
| AUXILIAR BAR | MANUEL ALEJANDRO NORENA RENZA | $1,750,905 | barra |
| AUXILIAR BAR | ANGIE JULIETH RODRIGUEZ CUBILLOS | $1,750,905 | barra |
| AUXILIAR BAR | YOHAN FELIPE MORA ESCOBAR | $1,750,905 | barra |
| AUXILIAR BAR | BRANDON ESTIVEN MEJIA OLAYA | $1,750,905 | barra |

#### Servicio (13 personas)
| Cargo | Nombre | Salario | Area auto |
|-------|--------|---------|-----------|
| JEFE DE SERVICIO | VERONICA FRANCHESKA MEDINA MOLINA | $2,000,000 | servicio |
| SUB JEFE SERVICIO | LEONARDO SUAREZ RODRIGUEZ | $1,923,500 | servicio |
| MESERO | DAVID BENJAMIN CUBILLOS VARGAS | $1,750,905 | servicio |
| MESERO | GIOVANNY ALDAIR POMPEYO ORTIZ | $1,750,905 | servicio |
| MESERO | MARTIN FERNANDO ORREGO DELGADO | $1,750,905 | servicio |
| MESERO | YELSON EDUARDO RUIZ ALMEIDA | $1,750,905 | servicio |
| MESERO | RONAL FERNANDO ANZOLA CORREDOR | $1,750,905 | servicio |
| MESERO | OSCAR ALBERTO MORENO MANCIPE | $1,750,905 | servicio |
| MESERO | BRYAN ALBERTO SIERRA TORRES | $1,750,905 | servicio |
| MESERO | MARTIN EDUARDO ORREGO ROJAS | $1,750,905 | servicio |
| MESERA | NEIDY STEFANIA ROJAS | $0 | servicio |
| MESERA | LEANIS CAROLINA AULAR BRACHO | $1,750,905 | servicio |
| CAJERA ADMINISTRATIVO | LESHLYE MICHELLE TELLEZ VALDERRAMA | $1,750,905 | servicio |

#### Apoyo (5 personas) — No en las 3 areas operativas
| Cargo | Nombre | Salario | Area auto |
|-------|--------|---------|-----------|
| SERVICIOS GENERALES | MARIA CRISTINA ALFARO FONSECA | $1,750,905 | apoyo |
| SERVICIOS GENERALES | EDILBERTO AGUILAR RAMIREZ | $1,750,905 | apoyo |
| INGENIERO DE SONIDO | JAVIER JAMPIER DUQUE BUITRAGO | $1,750,905 | apoyo |
| ASESOR COM VENTAS | NATHALIA ANDREA GONZALEZ HENAO | $1,900,000 | apoyo |
| PASANTE ADMINISTRATIVA | SOFIA PEREZ SANCHEZ | $1,750,905 | apoyo |

#### Sin cargo (2 personas) — Requiere asignacion manual
| Cargo | Nombre | Salario | Area manual |
|-------|--------|---------|-------------|
| NULL | LEANIS CAROLINA AULAR BRANCHO | $1,750,905 | Duplicada — ya esta como MESERA |
| NULL | OMAR DAVID RICO CABRA | $1,750,905 | **PREGUNTAR** |

### 9.4 Como funciona en la app

Cuando el lider de area (ej. Walter, lider_area/barra) entra al cronograma:

```
1. El sistema filtra pos_nomina_staff WHERE area = 'barra' AND sede = 'C75'
2. Walter ve solo los 7 colaboradores de Barra
3. Al crear un NUEVO empleado, el area se calcula del cargo automaticamente
4. Si el cargo cambia, el area se recalcula
5. Los "Sin cargo" aparecen como pendientes sin area — el admin los asigna manualmente
```

Para **cross-training** (meseros que tambien atienden barra):

```
Un empleado puede tener area PRIMARIA (del cargo) y areas SECUNDARIAS.
Ejemplo: MARTIN FERNANDO ORREGO → area='servicio', secondary_areas=['barra']

Esto requiere un campo adicional: secondary_areas TEXT[] en pos_nomina_staff
```

### 9.5 Resumen del mapeo automatico

| Area | Cantidad | Como se identifica |
|------|----------|-------------------|
| Cocina | 11 | cargo contiene "COCINA" o "STEWWARD" |
| Barra | 7 | cargo contiene "BAR" o "BARTENDER" |
| Servicio | 13 | cargo contiene "SERVICIO", "MESER" o "CAJER" |
| Apoyo | 5 | cargo contiene "GENERALES", "INGENIERO", "ASESOR", "PASANTE ADMIN" |
| Sin asignar | 2 | cargo = NULL (asignacion manual) |
| **Total C75** | **38** | |

---

## 8. CAMBIOS AL PANEL EQUIPO

### 8.1 AddStaffForm — Agregar roles

El dropdown actual tiene `host` y `store_admin`. Agregar:

```
<option value="super_admin">Super Admin</option>
<option value="store_admin">Administrador</option>
<option value="lider_area">Lider de Area</option>
<option value="colaborador">Colaborador</option>
<option value="host">Host</option>
```

### 8.2 Cuando se selecciona `lider_area`:

Mostrar campo adicional:
```
<select name="area">
  <option value="cocina">Cocina</option>
  <option value="barra">Barra</option>
  <option value="servicio">Servicio</option>
</select>
```

### 8.3 Cuando se selecciona `colaborador`:

Mostrar dropdown con empleados de `pos_nomina_staff` (sede C75):
```
<select name="employee_id">
  <option value="uuid-xxx">WALTER VILLAMOROS RODRIGUEZ — JEFE DE BAR</option>
  <option value="uuid-yyy">ESNEIDER BLANCO CASTILLO — JEFE DE COCINA</option>
  ... (44 empleados)
</select>
```

Esto vincula el usuario de auth con el empleado de nomina.

### 8.4 StaffList — Mostrar area

En la lista de equipo, mostrar el area junto al rol:
```
Walter Villamoros    [Lider de Area - Barra]     [Activo]
Esneider Blanco      [Lider de Area - Cocina]    [Activo]
Ivan Larrahondo      [Colaborador]               [Activo]
```

### 8.5 ROLE_LABELS actualizado

```typescript
const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  store_admin: 'Administrador',
  lider_area: 'Lider de Area',
  colaborador: 'Colaborador',
  host: 'Host',
};
```

---

## 9. DECISIONES PENDIENTES

1. **Los 2 sin cargo (LEANIS duplicada + OMAR)** — asignar a que area?
2. **Los 5 de Apoyo** — participan en turnos? En que area?
3. **STEWARDS** — se asignan a Cocina o area separada?
4. **CAJERA** — se asigna a Servicio o area separada?
5. **Cross-training** — los 6 en Mesas+Barra pueden ser asignados a ambas?
6. **Turnos >8h** — se permiten con HE automatico o se eliminan?
7. **Geolocalizacion check-in** — obligatoria (no marca si no esta cerca) o informativa?
8. **Como invitar colaboradores** — email con link de activacion o el admin crea las cuentas?

---

## 10. MAPEO AUTOMATICO CARGO → AREA Y CROSS-TRAINING

### 10.1 El mapeo ya existe en pos_nomina_staff

El campo `cargo` de la tabla `pos_nomina_staff` define implicitamente a que area pertenece cada persona. No necesitamos una tabla separada — necesitamos un campo `area` que se derive automaticamente del cargo.

**Como funciona hoy en la base:**

| Cargo | Area resultante | Filtro |
|-------|----------------|--------|
| JEFE DE COCINA, AUXILIAR DE COCINA, PASANTE AUX COCINA, STEWARD | cocina | cargo contiene "COCINA" o "STEWWARD" |
| JEFE DE BAR, JEFE BAR 50% PROPINAS, BARTENDER, AUXILIAR BAR | barra | cargo contiene "BAR" o "BARTENDER" |
| JEFE DE SERVICIO, SUB JEFE SERVICIO, MESERO/A, CAJERA ADMIN | servicio | cargo contiene "SERVICIO", "MESER" o "CAJER" |
| SERVICIOS GENERALES, INGENIERO DE SONIDO, ASESOR COM, PASANTE ADMIN | apoyo | no encaja en las 3 areas operativas |

**Resultado: 36 de 38 colaboradores se asignan automaticamente. Solo 2 sin cargo necesitan asignacion manual.**

### 10.2 Campo `area` en pos_nomina_staff

Agregar un campo `area` (texto: cocina/barra/servicio/apoyo/NULL) que:
- Se calcula automaticamente al crear un empleado (trigger o aplicacion)
- Se recalcula si cambia el cargo
- Permite filtrar directamente: `WHERE area = 'barra'` para que Walter solo vea los de Barra

Campo adicional `secondary_areas TEXT[]` para cross-training:
- Ejemplo: MARTIN FERNANDO ORREGO tiene `area='servicio'`, `secondary_areas=['barra']`
- Aparece en el cronograma de Servicio (primario) y tambien en Barra (secundario)
- Walter y Veronica ven ambos a los cross-training en sus areas

### 10.3 Como lo ve cada lider en la app

**Esneider (Cocina):** Entra al cronograma → ve 11 personas (todos los que tienen area='cocina')

**Walter (Barra):** Entra al cronograma → ve 7 de Barra + los cross-training que tengan 'barra' en secondary_areas

**Veronica (Servicio):** Entra al cronograma → ve 13 de Servicio + los cross-training que tengan 'servicio' en secondary_areas

**Alejandro (Admin):** Ve las 3 areas + apoyo, puede reasignar, ve costos cruzados.

### 10.4 Los 5 de Apoyo y los 2 sin cargo

**Apoyo (5 personas)** — no encajan en las 3 areas operativas:
- MARIA CRISTINA y EDILBERTO (Servicios Generales) — probablemente Servicio
- JAVIER (Ingeniero de Sonido) — probablemente Servicio (esta en el restaurante durante servicio)
- NATHALIA (Asesor Com Ventas) — probablemente Barra (vende en barra)
- SOFIA (Pasante Administrativa) — probablemente Apoyo (administracion)

**Sin cargo (2):**
- LEANIS CAROLINA AULAR BRANCHO — ya existe como MESERA con cargo, es duplicado
- OMAR DAVID RICO CABRA — en Rodri aparece como "Pizzeria", probablemente cocina/pizza

**Decision pendiente:** definir si Apoyo se asigna a un area operativa o se maneja separado.

### 10.5 Resultado final del mapeo

| Area | Auto-mapeados | A confirmar | Total |
|------|--------------|-------------|-------|
| Cocina | 11 | PIZZERO (Omar) | 11-12 |
| Barra | 7 | ASESOR (Nathalia) | 7-8 |
| Servicio | 13 | SERVICIOS GENERALES (2), SONIDO (1) | 13-16 |
| Apoyo | 0 | PASANTE ADMIN (1) | 0-1 |
| Sin asignar | 0 | Duplicado (1), Sin cargo (1) | 2 |

El mapeo es automatico al 95% (36/38). Solo se necesita confirmacion manual para los 5 de Apoyo y los 2 sin cargo.