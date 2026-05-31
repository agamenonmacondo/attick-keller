# Spec: Pestaña Asignación de Turnos y Estimación de Nómina

**Fecha:** Mayo 2026  
**Estado:** SPEC — Pendiente aprobación de Alejandro  
**Prioridad:** Alta  

---

## 1. Misión

Nueva pestaña en el sistema A&K que permite a los líderes de área (Cocina, Barra, Servicio) estimar y asignar turnos de fuerza laboral para la siguiente semana, estimar el costo de esos turnos en tiempo real, y llevar control del performance del equipo.

## 2. Fuentes de Datos

### 2.1 Nómina (`pos_nomina_staff` — POS DB) **VERIFICADO contra DB real Mayo 2026**
- **38 colaboradores C75** con cargo, sede, modalidad, salario individual (ver `docs/ak-staff-verificado-impl.md`)
- 9 niveles salariales: desde $0 (propinas only) hasta $3,000,000 (Jefe Bar)
- Salarios verificados: JEFE BAR=$3M, JEFE SERVICIO=$2.75M, JEFE COCINA=$2.5M, SUB JEFE=$1.92M, ASESOR=$1.9M, AUX COCINA (Nicolas)=$1.8M, estándar=$1.75M, BARTENDER MT=$875K, MESERA (Neidy)=$0
- Cargo define el área implícitamente — 36 de 38 se mapean automáticamente
- **Discrepancias cargo vs. rol operativo**: GIOVANNY (MESERO→CAJERO), BRYAN (MESERO→HOST), NICOLAS (AUX COCINA→PIZZERO)
- **LEANIS AULAR duplicada**: BRACHO (con cargo=MESERA) y BRANCHO (sin cargo)
- **OMAR RICO sin cargo**: Rodri lo tiene como Pizzero

### 2.2 Bio Reporte (`params.bio_reporte_20260401` — Rodri DB)
- **39 empleados** con horas reales: HO, RN, HED, HEN, HEDD, turnos partidos, salida_auto
- Período: Abril 2026
- Solo 1 tagged "Cocina" (Brandon), 38 "Sin asignar" → cruzar con pos_nomina_staff.cargo para asignar área

### 2.3 Análisis Documentado (docs/ak-staff-analisis-desempeno.md)
- 3 áreas operativas con organigrama completo
- 24 códigos de turno con HO/HN verificados
- Patrones de cobertura por día de la semana
- Cross-training: 6 personas entre Mesas y Barra
- Franjas horarias y % nocturno por sub-área

### 2.4 Parámetros Legales (`params` — Rodri DB)
- Jornada semanal: 44h
- Jornada diaria: 8h
- Recargo nocturno (19:00-06:00): 35%
- Recargo dominical: 75%
- HE diurna: +25%
- HE nocturna: +75%
- HE dominical diurna: +105%
- HE dominical nocturna: +155%
- Auxilio transporte: $249,095

---

## 3. Áreas y Organigrama

### 3.1 Mapeo Cargo → Área (automático desde `pos_nomina_staff`)

El campo `area` se calcula automáticamente a partir del `cargo` en `pos_nomina_staff`.

**Se agrega columna `area` a `pos_nomina_staff`:**

```sql
ALTER TABLE pos_nomina_staff ADD COLUMN area TEXT;
-- Valores: 'cocina' | 'barra' | 'servicio' | 'apoyo' | NULL
-- Se calcula del cargo automáticamente:

UPDATE pos_nomina_staff SET area = 'cocina' 
  WHERE cargo ILIKE '%cocina%' OR cargo ILIKE '%steward%';
UPDATE pos_nomina_staff SET area = 'barra' 
  WHERE cargo ILIKE '%bar%' OR cargo ILIKE '%bartender%';
UPDATE pos_nomina_staff SET area = 'servicio' 
  WHERE cargo ILIKE '%servicio%' OR cargo ILIKE '%meser%' OR cargo ILIKE '%cajer%';
UPDATE pos_nomina_staff SET area = 'apoyo' 
  WHERE cargo ILIKE '%servicios generales%' OR cargo ILIKE '%ingeniero%' 
  OR cargo ILIKE '%asesor%' OR cargo ILIKE '%pasante administr%';
```

**Para cross-training**, se agrega `secondary_areas TEXT[]`:

```sql
ALTER TABLE pos_nomina_staff ADD COLUMN secondary_areas TEXT[] DEFAULT '{}';
-- Ejemplo: mesero que también atiende barra → secondary_areas = ['barra']
```

|| Área | Cargos | Personas | Lógica ||
||------|--------|----------|--------||
|| **Cocina** | JEFE DE COCINA, AUXILIAR DE COCINA, PASANTE AUX COCINA, STEWARD | 11 | cargo contiene "COCINA" o "STEWWARD" ||
|| **Barra** | JEFE DE BAR, JEFE BAR 50% PROPINAS, BARTENDER, AUXILIAR BAR | 7 | cargo contiene "BAR" o "BARTENDER" ||
|| **Servicio** | JEFE/SUB JEFE DE SERVICIO, MESERO/A, CAJERA ADMINISTRATIVO | 13 | cargo contiene "SERVICIO", "MESER" o "CAJER" ||
|| **Apoyo** | SERVICIOS GENERALES, INGENIERO DE SONIDO, ASESOR COM VENTAS, PASANTE ADMINISTRATIVA | 5 | No en las 3 áreas operativas ||
|| **Sin asignar** | cargo=NULL | 2 | Asignación manual ||

**Excluidos:** C85 (5 personas), KINDER (3 personas), ADMIN (1 persona). Solo C75 (38 personas).

**Cuando el líder de área entra al cronograma:** el sistema filtra `pos_nomina_staff WHERE area = 'barra' AND sede = 'C75'` y solo ve los de su área.

### 3.2 Líderes de Área (quien asigna turnos)

| Área | Líder | Rol pos_nomina_staff |
|------|-------|---------------------|
| Cocina | Esneider Blanco | JEFE DE COCINA |
| Barra | Walter Villamoros | JEFE DE BAR |
| Servicio | Verónica Medina | JEFE DE SERVICIO |

---

## 4. Modelo de Datos — Nuevas Tablas

### 4.1 `shift_schedules` (cronogramas semanales)

```sql
CREATE TABLE shift_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  area TEXT NOT NULL, -- 'cocina' | 'barra' | 'servicio'
  week_str TEXT NOT NULL, -- '2026-W23'
  created_by UUID REFERENCES profiles(id), -- líder de área
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'published' | 'approved'
  version INT NOT NULL DEFAULT 1,
  total_estimated_cost DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(area, week_str, version)
);
```

### 4.2 `shift_assignments` (turnos asignados por persona por día)

```sql
CREATE TABLE shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES shift_schedules(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES pos_nomina_staff(id),
  day_index INT NOT NULL, -- 0=Dom, 1=Lun, ..., 6=Sab
  shift_code TEXT NOT NULL, -- referencia a shift_types.code
  entrada TIME, -- override si es personalizado
  salida TIME, -- override si es personalizado
  novedad TEXT, -- 'vacaciones' | 'incapacidad' | 'permiso' | 'turnante'
  turnante_nombre TEXT, -- nombre del turnante si novedad='turnante'
  is_overtime BOOLEAN DEFAULT FALSE, -- calculado: >8h o >44h sem
  estimated_hours DECIMAL(4,1), -- horas estimadas del turno
  estimated_cost DECIMAL(12,2), -- costo estimado del turno (salario + recargos)
  checkin_at TIMESTAMPTZ, -- hora real de entrada
  checkout_at TIMESTAMPTZ, -- hora real de salida
  checkin_location JSONB, -- {lat, lng} geolocalización
  checkout_location JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(schedule_id, employee_id, day_index)
);
```

### 4.3 `shift_types` (catálogo de turnos, 3 áreas)

```sql
CREATE TABLE shift_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL, -- 'A', 'C', 'B1', 'N2', 'P1L', etc.
  name TEXT NOT NULL, -- 'Apertura', 'Cierre', 'Noche Estándar', etc.
  area TEXT NOT NULL, -- 'cocina' | 'barra' | 'servicio' | 'all'
  entrada TIME NOT NULL,
  salida TIME NOT NULL,
  ordinarias DECIMAL(4,1) NOT NULL, -- horas ordinarias
  nocturnas DECIMAL(4,1) NOT NULL DEFAULT 0, -- horas nocturnas (19:00-06:00)
  is_split BOOLEAN DEFAULT FALSE, -- turno partido
  split_entrada TIME, -- segunda entrada (si partido)
  split_salida TIME, -- segunda salida (si partido)
  description TEXT,
  UNIQUE(code, area)
);
```

**Valores iniciales (24 códigos del análisis):**

| code | name | area | entrada | salida | ordinarias | nocturnas |
|------|------|------|---------|--------|-----------|-----------|
| A | Apertura | cocina | 09:00 | 16:00 | 7.0 | 0 |
| C | Cierre | cocina | 15:00 | 22:30 | 6.0 | 1.5 |
| S | Seguido | cocina | 10:00 | 22:30 | 10.5 | 1.5 |
| P1 | Partido 9 | cocina | 09:00 | 22:30 | 9.0 | 1.5 |
| P2 | Partido 10 | cocina | 10:00 | 22:30 | 10.0 | 1.5 |
| CS | Cierre Steward | cocina | 16:00 | 22:30 | 4.5 | 1.5 |
| CD | Cierre Doméstico | cocina | 14:00 | 22:30 | 5.5 | 1.5 |
| B1 | Apertura Bar | barra | 16:00 | 00:00 | 5.0 | 3.0 |
| B2 | Mañana Bar | barra | 10:00 | 17:00 | 7.0 | 0 |
| B3 | Noche Bar | barra | 18:00 | 02:00 | 1.0 | 6.0 |
| B4 | Largo Bar | barra | 16:00 | 01:00 | 4.0 | 6.0 |
| B5 | Partido Bar | barra | 12:00 | 00:00 | 6.0 | 4.0 |
| B6 | Noche Corta | barra | 17:00 | 23:00 | 2.0 | 4.0 |
| BA | Barback Madrugada | barra | 01:00 | 06:00 | 0.0 | 5.0 |
| M1 | Mañana Host | servicio | 10:00 | 16:00 | 6.0 | 0 |
| T1 | Tarde Host | servicio | 14:00 | 20:00 | 5.0 | 1.0 |
| N1 | Noche Estándar | servicio | 18:00 | 01:00 | 1.0 | 6.0 |
| N2 | Noche Larga | servicio | 17:00 | 01:00 | 2.0 | 6.0 |
| P1L | Partido Largo | servicio | 11:00 | 00:00 | 5.0 | 5.0 |
| P2L | Partido Corto | servicio | 11:00 | 23:00 | 5.0 | 4.0 |
| MA1 | Madrugada | servicio | 01:00 | 10:00 | 6.0 | 3.0 |
| MC | Mañana Corta | servicio | 10:00 | 15:00 | 5.0 | 0 |
| CJA | Cajero Apertura | servicio | 09:00 | 16:00 | 7.0 | 0 |
| CJN | Cajero Noche | servicio | 17:00 | 01:00 | 2.0 | 6.0 |

### 4.4 `shift_novedades` (check-in/out + novedades de colaboradores)

Unifica check-in, check-out, faltas, permisos e incapacidades en una sola tabla:

```sql
CREATE TABLE shift_novedades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES pos_nomina_staff(id),
  schedule_id UUID REFERENCES shift_schedules(id),
  date DATE NOT NULL,
  type TEXT NOT NULL, -- 'checkin' | 'checkout' | 'falta' | 'tarde' | 'permiso' | 'incapacidad'
  checkin_at TIMESTAMPTZ, -- hora real de entrada (type=checkin)
  checkout_at TIMESTAMPTZ, -- hora real de salida (type=checkout)
  location JSONB, -- {lat, lng, accuracy} geolocalización del browser
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Tipos de novedad:**
- `checkin` → Entrada al turno (registra hora + ubicación)
- `checkout` → Salida del turno (registra hora + ubicación)
- `falta` → No puedo ir
- `tarde` → Llegué tarde
- `permiso` → Permiso solicitado
- `incapacidad` → Incapacidad médica

---

## 5. Perfiles y Permisos

### 5.1 Roles

| Rol | Permisos | En Panel Equipo |
|-----|----------|-----------------|
| **super_admin** | Ver/editar todas las áreas, costos globales, gestionar usuarios | Ya existe |
| **store_admin** | Ver/editar todas las áreas, costos globales | Ya existe |
| **lider_area** | Ver/editar SOLO su área, crear cronogramas, estimar costos | Nuevo — requiere campo `area` |
| **colaborador** | Ver SUS turnos, check-in/out, reportar novedades | Nuevo — requiere vincular con `pos_nomina_staff` |
| **host** | Sin acceso a Turnos | Ya existe |

**Roles NO se eliminan** — se agregan `lider_area` y `colaborador` al dropdown existente del Panel Equipo.

### 5.2 Mapeo líder → área

```typescript
const AREA_LEADERS: Record<string, string> = {
  'cocina': 'Esneider Blanco Castillo',   // JEFE DE COCINA
  'barra': 'Walter Villamoros Rodriguez',  // JEFE DE BAR
  'servicio': 'Veronica Medina Molina',     // JEFE DE SERVICIO
};
```

### 5.3 Auth — Flujo

1. **Admin** crea usuarios desde el Panel Equipo existente, eligiendo el rol
2. Para `lider_area`: se agrega campo `area` (cocina/barra/servicio)
3. Para `colaborador`: se vincula con el registro en `pos_nomina_staff` (dropdown con los 38 empleados C75)
4. Líder ve solo su área, colaborador ve solo sus turnos
5. Se usa Supabase Auth — email con link de activación

### 5.4 Vinculación usuario ↔ empleado

Cuando se crea un usuario `colaborador` o `lider_area` en el Panel Equipo:

- Se agrega `pos_nomina_staff_id` a `user_roles` → apunta al registro de nómina
- Se agrega `area` a `user_roles` → para `lider_area`, indica el área que puede gestionar
- Para `colaborador`, el área se infiere del cargo del empleado vinculado

Esto permite que el endpoint `/api/auth/role` devuelva tanto el rol como el área y el employee_id.

---

## 6. Componentes de UI

### 6.1 Tab Principal: "Turnos y Nómina"

Ubicación: Nueva pestaña en `/admin` junto a "Operacion", "Costos", "Catalogo", "App Rodri"

### 6.2 Sub-tabs dentro de "Turnos y Nómina"

1. **Cronograma** — Grilla semanal (Lun-Dom) × empleados, con dropdown de turno por celda (solo líderes y admin)
2. **Performance** — Dashboard de horas reales vs estimadas, costos, alertas (solo líderes y admin)
3. **Mi Turno** — Vista del colaborador: su semana, check-in/out, reportar novedad (solo colaboradores)

### 6.3 Cronograma — Grilla Semanal

```
┌─────────────────────────────────────────────────────────────────┐
│ [Cocina ▼] │ Semana: [2026-W23 ▼] │ Estado: Borrador │ [Publicar] │
├──────────┬────┬────┬────┬────┬────┬────┬────┬──────────┬─────────┤
│ Empleado │ Lun│ Mar│ Mié│ Jue│ Vie│ Sáb│ Dom│ hrs/sem │ Costo   │
├──────────┼────┼────┼────┼────┼────┼────┼────┼──────────┼─────────┤
│ Esneider │  S │  S │  S │  S │  S │  S │  X │   63h   │ $187K  │
│ Iván      │  A │  C │  P1│  C │  A │  X │  C │   48h   │ $142K  │
│ Carlos    │  C │  A │  C │  X │  C │  C │  A │   46h   │ $136K  │
│ ...       │    │    │    │    │    │    │    │          │         │
├──────────┴────┴────┴────┴────┴────┴────┴────┼──────────┼─────────┤
│ TOTAL COBERTURA                              │  48h/44h │ $856K  │
│ ⚠ 6/11 sobrepasan 44h semanales             │          │         │
└──────────────────────────────────────────────┴──────────┴─────────┘
```

**Interacciones:**
- Click en celda → dropdown con turnos del área (A, C, S, P1, P2, CD, CS para Cocina)
- Click en "X" → Descanso obligatorio (1 por semana por ley)
- Celda roja si >44h semanales o >8h diarias
- Fila total muestra horas totales y costo estimado
- Botón "Publicar" cambia estado a `published` → notifica por email a colaboradores

### 6.4 Performance — Dashboard

```
┌──────────────────────────────────────────────────────────────────┐
│ [Cocina] │ Periodo: [Abril 2026 ▼]                                  │
├───────────────────────────┬──────────────────────────────────────┤
│ KPIs                      │ Alertas                              │
│                          │                                       │
│ hrs Ordinarias:  468h   │ ⚠ Esneider: 7 días sin descanso     │
│ hrs Nocturnas:    23h   │ ⚠ Vanessa: +26h sobre 44h           │
│ hrs Extra:       112h   │ ⚠ Carlos: 79h en 6 días             │
│ Costo Nómina:  $12.4M  │ ✓ Clara: dentro de límites            │
│ Propinas est:   $1.8M   │                                       │
│ Costo Total:  $14.2M   │                                       │
├───────────────────────────┴──────────────────────────────────────┤
│ [Gráfico: horas por día / empleado — barras apiladas HO vs HN]  │
├──────────────────────────────────────────────────────────────────┤
│ [Desglose por empleado — tabla expandible]                       │
│ Nombre │ HO │ HN │ HED │ HEN │ RN │ Total │ Costo │ %Legal     │
└──────────────────────────────────────────────────────────────────┘
```

### 6.5 Mi Turno — Vista Colaborador

```
┌──────────────────────────────────────────────────────────────────┐
│ Hola, Iván │ [Mi Semana: 23-29 Junio]                              │
├──────────────────────────────────────────────────────────────────┤
│ Lun 23:  Apertura  9:00 - 16:00                                │
│ Mar 24:  Cierre    15:00 - 22:30                               │
│ Mié 25:  Partido 9 9:00 - 14:00 / 17:00 - 22:30              │
│ Jue 26:  Cierre    15:00 - 22:30                               │
│ Vie 27:  Apertura  9:00 - 16:00                                │
│ Sáb 28:  [DESCANSO]                                             │
│ Dom 29:  Cierre    15:00 - 22:30                               │
│                                                                  │
│ Total: 48h │ Estimado: $1,422,000                               │
│                                                                  │
│ [Reportar contingencia]  [Check-in]                             │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. Lógica de Negocio — Cálculos de Nómina

### 7.1 Cálculo de Costo por Turno

```typescript
function calcularCostoTurno(
  turno: ShiftType,
  empleado: Empleado,
  esDominical: boolean
): { ordinarias: number; nocturnas: number; he: number; recargos: number; total: number } {
  const valorHora = empleado.salario / 30 / 8; // salario mensual / 30 días / 8h
  
  let horasOrd = turno.ordinarias;
  let horasNoc = turno.nocturnas;
  let horasExtra = 0;
  
  // Jornada diaria > 8h → todo lo extra es HE
  const totalHoras = horasOrd + horasNoc;
  if (totalHoras > 8) {
    horasExtra = totalHoras - 8;
    horasOrd = Math.min(horasOrd, 8); // las primeras 8 son ordinarias
  }
  
  // Recargos
  const recargoNocturno = horasNoc * valorHora * 0.35;
  const recargoDominical = esDominical ? (horasOrd + horasNoc) * valorHora * 0.75 : 0;
  
  // Horas extra
  const heDiurna = Math.min(horasExtra, horasNoc > 0 ? 0 : horasExtra) * valorHora * 0.25;
  const heNocturna = (horasExtra > 0 && horasNoc > 0 ? horasExtra : 0) * valorHora * 0.75;
  
  const base = (horasOrd + horasNoc) * valorHora;
  const total = base + recargoNocturno + recargoDominical + heDiurna + heNocturna;
  
  return { ordinarias: horasOrd, nocturnas: horasNoc, he: horasExtra, recargos: recargoNocturno + recargoDominical + heDiurna + heNocturna, total };
}
```

### 7.2 Restricciones Legales

1. **Máximo 8h diarias** — Turnos >8h marcan automáticamente HE
2. **1 descanso semanal obligatorio** — No asignar 7 días seguidos. Si se hace, alertar.
3. **Jornada semanal 44h** — Acumulado semanal >44h → HE semanales
4. **Nocturno (19:00-06:00)** → +35% sobre valor hora ordinaria
5. **Dominical** → +75% prima sobre la hora ordinaria (independiente de recargo nocturno)
6. **HE diurna** → +25%, **HE nocturna** → +75%
7. **HE dominical diurna** → +105%, **HE dominical nocturna** → +155%

### 7.3 Malla de Horarios — Optimización

El algoritmo existente en AutoScheduleTab ya implementa:

- **Fase 1:** Plan descansos primero (rotación determinista por semana ISO)
- **Fase 2:** Asignar turnos minimizando HE y partidos
- **Fase 3:** Verificar y compensar con terceros

Se reutiliza esta lógica pero expandida a 3 áreas con los 24 códigos de turno.

---

## 8. API Endpoints

### 8.1 Cronogramas

```
GET    /api/admin/shift-schedules?area=cocina&week=2026-W23    → lista cronogramas
POST   /api/admin/shift-schedules                                → crear cronograma
PUT    /api/admin/shift-schedules/:id                             → actualizar
PATCH  /api/admin/shift-schedules/:id/publish                    → publicar
```

### 8.2 Asignaciones

```
GET    /api/admin/shift-assignments?schedule_id=xxx              → lista asignaciones
PUT    /api/admin/shift-assignments/:id                          → actualizar turno
POST   /api/admin/shift-assignments/batch                        → batch update (drag & drop)
```

### 8.3 Performance

```
GET    /api/admin/shift-performance?area=cocina&from=2026-04-01&to=2026-04-30
  → responde con: { kpis, employees: [{ name, ho, hn, hed, hen, total, cost, alerts }], daily_summary }
```

### 8.4 Colaborador

```
GET    /api/admin/shift-my-week?employee_id=xxx&week=2026-W23   → sus turnos
POST   /api/admin/shift-checkin                                   → check-in con ubicación
POST   /api/admin/shift-checkout                                  → check-out con ubicación
POST   /api/admin/shift-contingency                               → reportar contingencia
```

---

## 9. Flujo de Trabajo

1. **Líder crea cronograma** → Selecciona semana → Ve grilla con empleados de su área → Asigna turnos
2. **Auto-generación** → Botón "Generar malla óptima" → Algoritmo asigna turnos basado en demanda histórica
3. **Revisión** → Líder ve horas totales, costos estimados, alertas legales (rojo >44h, >8h)
4. **Publicación** → Líder publica → Email a colaboradores con sus turnos
5. **Colaborador** → Ve su semana → Check-in al llegar → Check-out al salir → Reporta contingencias
6. **Performance** → Líder/Admin ve horas reales vs estimadas → Costo real vs presupuesto → Alertas de exceso

---

## 10. Fases de Implementación

### Fase 1 — Fundación (1 semana)
- [ ] Migrar DDL de las 5 tablas nuevas a Supabase
- [ ] Importar turnos (shift_types) con los 24 códigos documentados
- [ ] Vincular pos_nomina_staff con employees de Rodri (por nombre/cédula)
- [ ] Mapear los 47 colaboradores a 3 áreas basado en cargo

### Fase 2 — Cronograma (1-2 semanas)
- [ ] Grilla semanal por área con drag & drop
- [ ] Cálculo de costo por turno en tiempo real
- [ ] Alertas legales (>8h, >44h, sin descanso)
- [ ] Auto-generación de malla (adaptar AutoScheduleTab)
- [ ] Publicación y notificación por email

### Fase 3 — Performance (1 semana)
- [ ] Dashboard de horas reales vs estimadas (cruzando con bio_reporte)
- [ ] KPIs: costo nómina, horas extra, recargos nocturnos, cumplimiento legal
- [ ] Alertas de exceso por empleado

### Fase 4 — Colaborador (1-2 semanas)
- [ ] Vista "Mi Semana" para el colaborador
- [ ] Check-in/Check-out con geolocalización (browser geolocation API)
- [ ] Reporte de contingencias (no puedo ir, llegada tarde, etc.)
- [ ] Notificaciones por email

---

## 11. Consideraciones Técnicas

### 11.1 Check-in con Geolocalización
- Usar `navigator.geolocation.getCurrentPosition()` del browser
- Guardar `{lat, lng, accuracy, timestamp}` en JSONB
- Verificar proximidad al restaurante (radio configurable, default 200m)
- No bloquear check-in si GPS no disponible — solo registrar sin ubicación

### 11.2 Notificaciones por Email
- Usar Supabase Auth + Edge Functions para envío
- O integrar con servicio externo (Resend, SendGrid)
- Templates: asignación semanal, recordatorio diario, alerta de exceso

### 11.3 Cálculo de Costos
- Todos los cálculos se hacen CLIENT-SIDE en el browser (no stored procedures)
- Fórmulas basadas en params de Rodri (salario, recargos, jornada)
- Valor hora = salario_mensual / 30 / 8 (con salario individual de pos_nomina_staff)
- Costo turno = (HO × vh) + (HN × vh × 1.35) + (HE_diurna × vh × 1.25) + (HE_nocturna × vh × 1.75) + (dominical × vh × 0.75)

### 11.4 Datos Bio vs Asignados
- Los turnos ASIGNADOS son planificados (lo que debería ser)
- Los datos BIO son lo que realmente pasó
- Performance = comparar asignado vs real
- Si no hay datos bio para una semana, mostrar solo estimación

---

## 12. Pendientes de Decisión (preguntar a Alejandro)

1. **Los 9 sin cargo en C75** — ¿A qué área pertenecen? Propuesta basada en bio_reporte:
   - BRANDON (Cocina en bio) → Cocina
   - INGRIT, RAMON, BRYAN (nocturnidad alta) → Barra o Servicio nocturno
   - WALTER (JEFE DE BAR) → Barra
   - NICOLAS S (AUX COCINA) → Cocina
   - ESNEIDER B (JEFE DE COCINA) → Cocina
2. **¿Cross-training se formaliza?** — Los 6 que aparecen en Mesas+Barra (DON MARTIN, EDUARDO, MARTIN, LEONARDO, CAROLINA, STEFANIA), ¿pueden ser asignados a cualquiera de las dos áreas?
3. **¿Turnos >8h se prohíben o se permiten con HE?** — Cocina tiene S (12.5h) y P1/P2 (10-11h). Barra tiene turnos de 9h. ¿Se eliminan o se calcula HE automático?
4. **¿El check-in con geolocalización es obligatorio o informativo?**
5. **¿Qué proveedor de email para notificaciones?** (Supabase Auth built-in, Resend, otro)