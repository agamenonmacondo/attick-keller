# Plan de Implementacion — Turnos y Nomina A&K (feat-014)

> **Para ejecutar:** Usar skill subagent-driven-development para implementar tarea por tarea.

**Objetivo:** Nueva pestana "Turnos" en /admin para que lideres de area planifiquen turnos semanales, estimen costos de nomina en tiempo real, y controlen performance del equipo.

**Arquitectura:** Extension del panel admin existente. 6 tablas nuevas en Supabase, 5 roles (existentes sin tocar + 2 nuevos), componente ShiftSchedulePanel con grilla interactiva, PerformanceDashboard con Recharts, vista colaborador con check-in GPS.

**Stack:** Next.js 16, React 19, Tailwind 4, Supabase, Recharts, Phosphor Icons, dark mode con CSS vars.
**Regla de ORO:** Roles existentes (super_admin, store_admin, host) NO se modifican. Solo se agregan lider_area y colaborador. Sin emojis en UI — Phosphor Icons. Formato moneda COP.

---

## FASE 1: Fundacion de datos (3-4 dias)

### Tarea 1.1: Crear migracion SQL — Tabla shift_types

**Objetivo:** Primera tabla del esquema de turnos.

**Archivos:**
- Crear: `supabase/migrations/20260528_001_shift_types.sql`

**Step 1:** Crear archivo de migracion

```sql
-- 1. Catalogo de tipos de turno (24 codigos)
CREATE TABLE shift_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  area TEXT NOT NULL CHECK (area IN ('cocina', 'barra', 'servicio')),
  entrada TIME NOT NULL,
  salida TIME NOT NULL,
  ordinarias DECIMAL(4,1) NOT NULL,
  nocturnas DECIMAL(4,1) NOT NULL DEFAULT 0,
  is_split BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code, area)
);

-- RLS: solo admins y lideres pueden ver
ALTER TABLE shift_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Any authenticated user can view shift_types"
  ON shift_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins and lider_area can manage shift_types"
  ON shift_types FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'store_admin', 'lider_area')
    )
  );
```

**Step 2:** Ejecutar migracion en Supabase dashboard (SQL Editor)

**Step 3:** Verificar en Supabase dashboard que la tabla shift_types existe con las columnas correctas.

**Verificacion:** `SELECT * FROM shift_types;` debe devolver 0 filas con las columnas correctas.

**Commit:** `git add supabase/migrations/20260528_001_shift_types.sql && git commit -m "feat(shifts): add shift_types table migration"`

---

### Tarea 1.2: Seed shift_types — 24 tipos de turno

**Objetivo:** Insertar los 24 tipos de turno verificados en la BD.

**Archivos:**
- Crear: `supabase/migrations/20260528_002_seed_shift_types.sql`

**Step 1:** Crear archivo seed con los 24 turnos

```sql
-- Seed: 24 tipos de turno verificados contra Excel HORARIOS FORMATO STAFF
INSERT INTO shift_types (code, name, area, entrada, salida, ordinarias, nocturnas, description) VALUES
-- Cocina (7)
('A', 'Apertura', 'cocina', '09:00', '16:00', 7.0, 0, 'Turno manana cocina'),
('C', 'Cierre', 'cocina', '15:00', '22:30', 6.0, 1.5, 'Turno tarde cocina'),
('S', 'Seguido', 'cocina', '10:00', '22:30', 10.5, 1.5, 'Turno largo cocina, supera 8h genera HE'),
('P1', 'Partido 9', 'cocina', '09:00', '22:30', 9.0, 1.5, 'Turno partido largo cocina'),
('P2', 'Partido 10', 'cocina', '10:00', '22:30', 10.0, 1.5, 'Turno partido largo cocina'),
('CS', 'Cierre Steward', 'cocina', '16:00', '22:30', 4.5, 1.5, 'Turno corto steward'),
('CD', 'Cierre Domestic@', 'cocina', '14:00', '22:30', 5.5, 1.5, 'Turno medio cocina'),
-- Barra (7)
('B1', 'Apertura Bar', 'barra', '16:00', '00:00', 5.0, 3.0, 'Nocturno barra apertura'),
('B2', 'Manana Bar', 'barra', '10:00', '17:00', 7.0, 0, 'Turno manana barra'),
('B3', 'Noche Bar', 'barra', '18:00', '02:00', 1.0, 6.0, 'Nocturno barra noche'),
('B4', 'Largo Bar', 'barra', '16:00', '01:00', 4.0, 6.0, 'Nocturno largo barra'),
('B5', 'Partido Bar', 'barra', '12:00', '00:00', 6.0, 4.0, 'Turno partido barra'),
('B6', 'Noche Corta', 'barra', '17:00', '23:00', 2.0, 4.0, 'Turno corto barra noche'),
('BA', 'Barback Madrugada', 'barra', '01:00', '06:00', 0.0, 5.0, 'Turno madrugada barback'),
-- Servicio (10)
('M1', 'Manana Host', 'servicio', '10:00', '16:00', 6.0, 0, 'Host manana servicio'),
('T1', 'Tarde Host', 'servicio', '14:00', '20:00', 5.0, 1.0, 'Host tarde servicio'),
('N1', 'Noche Estandar', 'servicio', '18:00', '01:00', 1.0, 6.0, 'Noche estandar servicio'),
('N2', 'Noche Larga', 'servicio', '17:00', '01:00', 2.0, 6.0, 'Noche larga servicio'),
('P1L', 'Partido Largo', 'servicio', '11:00', '00:00', 5.0, 5.0, 'Partido largo servicio'),
('P2L', 'Partido Corto', 'servicio', '11:00', '23:00', 5.0, 4.0, 'Partido corto servicio'),
('MA1', 'Madrugada', 'servicio', '01:00', '10:00', 6.0, 3.0, 'Madrugada servicio'),
('MC', 'Manana Corta', 'servicio', '10:00', '15:00', 5.0, 0, 'Manana corta servicio'),
('CJA', 'Cajero Apertura', 'servicio', '09:00', '16:00', 7.0, 0, 'Cajero dia servicio'),
('CJN', 'Cajero Noche', 'servicio', '17:00', '01:00', 2.0, 6.0, 'Cajero noche servicio')
ON CONFLICT (code, area) DO NOTHING;
```

**Step 2:** Ejecutar en Supabase SQL Editor

**Step 3:** Verificar: `SELECT area, COUNT(*) FROM shift_types GROUP BY area ORDER BY area;`
Esperado: barra=7, cocina=7, servicio=10

**Commit:** `git add supabase/migrations/20260528_002_seed_shift_types.sql && git commit -m "feat(shifts): seed 24 shift types"`

---

### Tarea 1.3: Crear migracion SQL — Tablas shift_schedules, shift_assignments, shift_novedades, staff_aliases

**Objetivo:** Crear las 4 tablas restantes y las modificaciones a tablas existentes.

**Archivos:**
- Crear: `supabase/migrations/20260528_003_shift_core_tables.sql`

**Step 1:** Crear archivo de migracion

```sql
-- 2. Cronogramas semanales
CREATE TABLE shift_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  area TEXT NOT NULL CHECK (area IN ('cocina', 'barra', 'servicio')),
  week_str TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'approved')),
  version INT NOT NULL DEFAULT 1,
  total_estimated_cost DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(area, week_str, version)
);

-- 3. Asignaciones (turno por persona por dia)
CREATE TABLE shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES shift_schedules(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES pos_nomina_staff(id),
  day_index INT NOT NULL CHECK (day_index >= 0 AND day_index <= 6),
  shift_code TEXT NOT NULL,
  entrada TIME,
  salida TIME,
  novedad TEXT CHECK (novedad IN ('vacaciones', 'incapacidad', 'permiso', 'turnante', NULL)),
  turnante_nombre TEXT,
  is_overtime BOOLEAN DEFAULT FALSE,
  estimated_hours DECIMAL(4,1),
  estimated_cost DECIMAL(12,2),
  checkin_at TIMESTAMPTZ,
  checkout_at TIMESTAMPTZ,
  checkin_location JSONB,
  checkout_location JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(schedule_id, employee_id, day_index)
);

-- 4. Novedades y check-in/out
CREATE TABLE shift_novedades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES pos_nomina_staff(id),
  schedule_id UUID REFERENCES shift_schedules(id),
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('checkin', 'checkout', 'falta', 'tarde', 'permiso', 'incapacidad')),
  checkin_at TIMESTAMPTZ,
  checkout_at TIMESTAMPTZ,
  location JSONB,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Aliases de empleados
CREATE TABLE staff_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES pos_nomina_staff(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  source TEXT CHECK (source IN ('excel', 'rodri', 'interno', 'colombia')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(alias, source)
);

-- 6. Modificaciones a tablas existentes
ALTER TABLE pos_nomina_staff ADD COLUMN IF NOT EXISTS area TEXT CHECK (area IN ('cocina', 'barra', 'servicio', 'apoyo'));
ALTER TABLE pos_nomina_staff ADD COLUMN IF NOT EXISTS secondary_areas TEXT[] DEFAULT '{}';

-- Extension de user_roles (AGREGAR columnas, NO modificar existentes)
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS pos_nomina_staff_id UUID REFERENCES pos_nomina_staff(id);

-- Indices para rendimiento
CREATE INDEX idx_shift_schedules_area_week ON shift_schedules(area, week_str);
CREATE INDEX idx_shift_assignments_schedule ON shift_assignments(schedule_id);
CREATE INDEX idx_shift_assignments_employee ON shift_assignments(employee_id);
CREATE INDEX idx_shift_novedades_employee_date ON shift_novedades(employee_id, date);
CREATE INDEX idx_staff_aliases_employee ON staff_aliases(employee_id);

-- RLS para shift_schedules
ALTER TABLE shift_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view schedules"
  ON shift_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and lider_area can manage schedules"
  ON shift_schedules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'store_admin', 'lider_area')
    )
  );

-- RLS para shift_assignments
ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view assignments"
  ON shift_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and lider_area can manage assignments"
  ON shift_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'store_admin', 'lider_area')
    )
  );

-- RLS para shift_novedades (colaboradores pueden crear sus propios check-ins)
ALTER TABLE shift_novedades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view own novedades"
  ON shift_novedades FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create novedades"
  ON shift_novedades FOR INSERT
  TO authenticated
  USING (true);

-- RLS para staff_aliases (solo lectura para authenticated)
ALTER TABLE staff_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view aliases"
  ON staff_aliases FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage aliases"
  ON staff_aliases FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'store_admin')
    )
  );
```

**Step 2:** Ejecutar en Supabase SQL Editor

**Step 3:** Verificar que todas las tablas existen: `SELECT table_name FROM information_schema.tables WHERE table_name IN ('shift_types', 'shift_schedules', 'shift_assignments', 'shift_novedades', 'staff_aliases') ORDER BY table_name;`

**Step 4:** Verificar que pos_nomina_staff tiene las columnas nuevas: `SELECT column_name FROM information_schema.columns WHERE table_name = 'pos_nomina_staff' AND column_name IN ('area', 'secondary_areas');`

**Commit:** `git add supabase/migrations/20260528_003_shift_core_tables.sql && git commit -m "feat(shifts): add schedules, assignments, novedades, aliases tables + RLS"`

---

### Tarea 1.4: Actualizar area en pos_nomina_staff — 36 empleados

**Objetivo:** Asignar el campo `area` a los 38 empleados C75 (36 automaticos + 2 manuales).

**Archivos:**
- Crear: `supabase/migrations/20260528_004_assign_staff_areas.sql`

**Step 1:** Crear script de asignacion de areas

```sql
-- Asignar areas basado en cargo existente en pos_nomina_staff
-- Cocina (11)
UPDATE pos_nomina_staff SET area = 'cocina'
WHERE sede = 'C75' AND (
  cargo ILIKE '%jefe%cocina%'
  OR cargo ILIKE '%aux%cocina%'
  OR cargo ILIKE '%steward%'
  OR cargo ILIKE '%pizzero%'
  OR nombre ILIKE '%esneider%'
  OR nombre ILIKE '%nicolas alfaro%'
);

-- Barra (7)
UPDATE pos_nomina_staff SET area = 'barra'
WHERE sede = 'C75' AND (
  cargo ILIKE '%jefe%bar%'
  OR cargo ILIKE '%bartender%'
  OR cargo ILIKE '%aux%bar%'
  OR nombre ILIKE '%walter%'
  OR nombre ILIKE '%ashlye%'
);

-- Servicio (13)
UPDATE pos_nomina_staff SET area = 'servicio'
WHERE sede = 'C75' AND (
  cargo ILIKE '%jefe%servicio%'
  OR cargo ILIKE '%sub jefe%'
  OR cargo ILIKE '%meser%'
  OR cargo ILIKE '%cajer%'
  OR cargo ILIKE '%host%'
  OR nombre ILIKE '%veronica%'
  OR nombre ILIKE '%leonardo%'
);

-- Apoyo (5)
UPDATE pos_nomina_staff SET area = 'apoyo'
WHERE sede = 'C75' AND (
  cargo ILIKE '%servicios generales%'
  OR cargo ILIKE '%ingeniero%'
  OR cargo ILIKE '%asesor%ventas%'
  OR cargo ILIKE '%pasante%admin%'
  OR nombre ILIKE '%cristina%'
  OR nombre ILIKE '%beto%'
  OR nombre ILIKE '%javier%sonido%'
  OR nombre ILIKE '%nathalia%'
  OR nombre ILIKE '%sofia%'
);

-- Cross-training: 6 personas con secondary_areas
UPDATE pos_nomina_staff SET secondary_areas = ARRAY['servicio', 'barra']
WHERE sede = 'C75' AND nombre ILIKE '%ashlye%';

UPDATE pos_nomina_staff SET secondary_areas = ARRAY['cocina', 'servicio']
WHERE sede = 'C75' AND nombre ILIKE '%leonardo%';

-- Verificar asignacion
SELECT area, COUNT(*) as total FROM pos_nomina_staff WHERE sede = 'C75' GROUP BY area ORDER BY area;
-- Esperado: apoyo=5, barra=7, cocina=11, servicio=13 (o similares, los 2 sin cargo quedan NULL)
```

**Step 2:** Ejecutar en Supabase SQL Editor

**Step 3:** Verificar: `SELECT area, COUNT(*) FROM pos_nomina_staff WHERE sede = 'C75' AND area IS NOT NULL GROUP BY area ORDER BY area;`
Esperado: 4 areas con los conteos correctos.

**Step 4:** Verificar los 2 sin area: `SELECT nombre, cargo, area FROM pos_nomina_staff WHERE sede = 'C75' AND area IS NULL;`
Deben ser LEANIS CAROLINA AULAR y OMAR RICO CABRA (requieren decision manual).

**Commit:** `git add supabase/migrations/20260528_004_assign_staff_areas.sql && git commit -m "feat(shifts): assign areas to C75 staff members"`

---

### Tarea 1.5: Seed staff_aliases — 25+ aliases

**Objetivo:** Conectar apodos del Excel/Rodri con nombres completos de nomina.

**Archivos:**
- Crear: `supabase/migrations/20260528_005_seed_staff_aliases.sql`

**Step 1:** Crear seed de aliases (ver `docs/ak-staff-verificado-impl.md` seccion 3 para SQL completo). Ejemplo reducido:

```sql
-- Seed staff_aliases (25+ aliases verificados)
-- Primero obtener los IDs de pos_nomina_staff
-- Nota: estos INSERTs usan subqueries para encontrar el employee_id por nombre

INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'ESNEIDER', 'excel' FROM pos_nomina_staff WHERE nombre ILIKE '%esneider%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;

INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'WALTER', 'excel' FROM pos_nomina_staff WHERE nombre ILIKE '%walter%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;

INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'VERO', 'excel' FROM pos_nomina_staff WHERE nombre ILIKE '%veronica%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;

INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'MANOLO', 'excel' FROM pos_nomina_staff WHERE nombre ILIKE '%manolo%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;

INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'BENJA', 'excel' FROM pos_nomina_staff WHERE nombre ILIKE '%benja%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;

INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'GIO', 'excel' FROM pos_nomina_staff WHERE nombre ILIKE '%giovanny%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;

INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'LESH', 'excel' FROM pos_nomina_staff WHERE nombre ILIKE '%leshlye%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;

INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'DON MARTIN', 'excel' FROM pos_nomina_staff WHERE nombre ILIKE '%martin%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;

INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'EDUARDO', 'excel' FROM pos_nomina_staff WHERE nombre ILIKE '%eduardo%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;

-- ... continuar con los 25+ aliases del documento ak-staff-verificado-impl.md
-- Incluir: CARLOS, IVAN, MAURICIO, LEIDY, NICOLAS, YOHANA, ASHLYE, LIZETH, etc.

-- Verificar
SELECT COUNT(*) as total_aliases FROM staff_aliases;
-- Esperado: 25+
```

**Step 2:** Ejecutar en Supabase SQL Editor

**Step 3:** Verificar: `SELECT sa.alias, pns.nombre, sa.source FROM staff_aliases sa JOIN pos_nomina_staff pns ON sa.employee_id = pns.id WHERE pns.sede = 'C75' ORDER BY sa.alias LIMIT 30;`

**Commit:** `git add supabase/migrations/20260528_005_seed_staff_aliases.sql && git commit -m "feat(shifts): seed staff aliases (25+)"`

---

### Tarea 1.6: Crear tipos TypeScript — Shift types y modelos

**Objetivo:** Definir los tipos TypeScript para el nuevo modulo.

**Archivos:**
- Crear: `src/lib/types/shifts.ts`

**Step 1:** Crear archivo de tipos

```typescript
// Tipos para el modulo de Turnos y Nomina

export type ShiftArea = 'cocina' | 'barra' | 'servicio';

export type ShiftStatus = 'draft' | 'published' | 'approved';

export type NovedadType = 'vacaciones' | 'incapacidad' | 'permiso' | 'turnante';

export type CheckinType = 'checkin' | 'checkout' | 'falta' | 'tarde' | 'permiso' | 'incapacidad';

export type StaffArea = ShiftArea | 'apoyo';

export interface ShiftType {
  id: string;
  code: string;
  name: string;
  area: ShiftArea;
  entrada: string; // HH:MM
  salida: string; // HH:MM
  ordinarias: number;
  nocturnas: number;
  is_split: boolean;
  description: string | null;
}

export interface ShiftSchedule {
  id: string;
  restaurant_id: string;
  area: ShiftArea;
  week_str: string; // '2026-W23'
  created_by: string | null;
  status: ShiftStatus;
  version: number;
  total_estimated_cost: number | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftAssignment {
  id: string;
  schedule_id: string;
  employee_id: string;
  day_index: number; // 0=Dom, 1=Lun, ..., 6=Sab
  shift_code: string;
  entrada: string | null; // override
  salida: string | null; // override
  novedad: NovedadType | null;
  turnante_nombre: string | null;
  is_overtime: boolean;
  estimated_hours: number | null;
  estimated_cost: number | null;
  checkin_at: string | null;
  checkout_at: string | null;
  checkin_location: { lat: number; lng: number; accuracy: number } | null;
  checkout_location: { lat: number; lng: number; accuracy: number } | null;
  created_at: string;
}

export interface ShiftNovedad {
  id: string;
  employee_id: string;
  schedule_id: string | null;
  date: string;
  type: CheckinType;
  checkin_at: string | null;
  checkout_at: string | null;
  location: { lat: number; lng: number; accuracy: number } | null;
  description: string | null;
  created_at: string;
}

export interface StaffAlias {
  id: string;
  employee_id: string;
  alias: string;
  source: 'excel' | 'rodri' | 'interno' | 'colombia';
  created_at: string;
}

// Empleado extendido con datos de nomina para la grilla
export interface StaffMemberForShift {
  id: string;
  nombre: string;
  cargo: string;
  area: StaffArea;
  secondary_areas: string[];
  salario_mensual: number;
  alias: string; // alias principal para mostrar en UI
}

// Resultado de calculo de costo por turno
export interface ShiftCostEstimate {
  base_pay: number;
  night_surcharge: number;
  overtime_surcharge: number;
  sunday_surcharge: number;
  total: number;
}

// Grilla semanal — estructura para el frontend
export interface WeeklyShiftGrid {
  schedule: ShiftSchedule;
  employees: StaffMemberForShift[];
  assignments: ShiftAssignment[]; // flat, indexed by employee_id + day_index
  shift_types: ShiftType[];
  total_hours: number;
  total_cost: number;
  alerts: ShiftAlert[];
}

export interface ShiftAlert {
  type: 'overtime_weekly' | 'overtime_daily' | 'no_day_off' | 'missing_assignment';
  employee_id: string;
  day_index?: number;
  message: string;
}

// Parametros legales Colombia
export const LEGAL_PARAMS = {
  MAX_WEEKLY_HOURS: 44,
  MAX_DAILY_HOURS: 8,
  NIGHT_SURCHARGE: 0.35,     // 19:00-06:00
  SUNDAY_SURCHARGE: 0.75,     // Todo el dia domingo
  OVERTIME_DIURNAL: 0.25,     // HE antes de 19:00
  OVERTIME_NIGHT: 0.75,      // HE despues de 19:00
  OVERTIME_SUNDAY_DIURNAL: 1.05,  // HE domingo antes de 19:00
  OVERTIME_SUNDAY_NIGHT: 1.55,    // HE domingo despues de 19:00
  NIGHT_START: 19, // horas (19:00)
  NIGHT_END: 6,    // horas (06:00)
  TRANSPORT_ALLOWANCE: 249095, // Auxilio transporte 2026
  MIN_SALARY: 1423500,       // Salario minimo 2026
} as const;

// Colores por tipo de turno (para la grilla)
export const SHIFT_COLORS: Record<ShiftArea, string> = {
  cocina: '#ef4444',    // red-500
  barra: '#3b82f6',    // blue-500
  servicio: '#22c55e', // green-500
};
```

**Step 2:** Verificar que TypeScript compila: `npx tsc --noEmit`

**Commit:** `git add src/lib/types/shifts.ts && git commit -m "feat(shifts): add TypeScript types for shift scheduling module"`

---

### Tarea 1.7: Crear hook useShiftData — Consultas Supabase

**Objetivo:** Hook principal para consultar datos de turnos desde Supabase.

**Archivos:**
- Crear: `src/lib/hooks/useShiftData.ts`

**Step 1:** Crear hook

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  ShiftType,
  ShiftSchedule,
  ShiftAssignment,
  StaffMemberForShift,
  ShiftArea,
} from '@/lib/types/shifts';

const supabase = createClient();

export function useShiftData(area: ShiftArea | null, weekStr: string | null) {
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [schedule, setSchedule] = useState<ShiftSchedule | null>(null);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [staff, setStaff] = useState<StaffMemberForShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar tipos de turno
  useEffect(() => {
    async function loadShiftTypes() {
      const { data, error: err } = await supabase
        .from('shift_types')
        .select('*')
        .order('code');

      if (err) {
        setError(err.message);
        return;
      }
      setShiftTypes(data as ShiftType[]);
    }
    loadShiftTypes();
  }, []);

  // Cargar personal del area
  useEffect(() => {
    async function loadStaff() {
      if (!area) return;
      const { data, error: err } = await supabase
        .from('pos_nomina_staff')
        .select('id, nombre, cargo, area, secondary_areas, salario')
        .eq('sede', 'C75')
        .or(`area.eq.${area},secondary_areas.cs.{${area}}`)
        .order('nombre');

      if (err) {
        setError(err.message);
        return;
      }

      // Enriquecer con alias principal
      const staffIds = (data || []).map((s: any) => s.id);
      const { data: aliases } = await supabase
        .from('staff_aliases')
        .select('employee_id, alias')
        .in('employee_id', staffIds);

      const aliasMap = new Map((aliases || []).map((a: any) => [a.employee_id, a.alias]));

      const enriched: StaffMemberForShift[] = (data || []).map((s: any) => ({
        id: s.id,
        nombre: s.nombre,
        cargo: s.cargo,
        area: s.area,
        secondary_areas: s.secondary_areas || [],
        salario_mensual: s.salario,
        alias: aliasMap.get(s.id) || s.nombre.split(' ')[0],
      }));

      setStaff(enriched);
    }
    loadStaff();
  }, [area]);

  // Cargar cronograma y asignaciones
  const loadSchedule = useCallback(async () => {
    if (!area || !weekStr) return;
    setLoading(true);

    try {
      // Buscar cronograma existente
      const { data: schedData } = await supabase
        .from('shift_schedules')
        .select('*')
        .eq('area', area)
        .eq('week_str', weekStr)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (schedData) {
        setSchedule(schedData as ShiftSchedule);

        // Cargar asignaciones del cronograma
        const { data: assignData } = await supabase
          .from('shift_assignments')
          .select('*')
          .eq('schedule_id', schedData.id);

        setAssignments((assignData || []) as ShiftAssignment[]);
      } else {
        setSchedule(null);
        setAssignments([]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [area, weekStr]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  // Filtrar tipos de turno por area
  const areaShiftTypes = shiftTypes.filter(
    (st) => st.area === area
  );

  return {
    shiftTypes,
    areaShiftTypes,
    schedule,
    assignments,
    staff,
    loading,
    error,
    refresh: loadSchedule,
  };
}
```

**Step 2:** Verificar TypeScript: `npx tsc --noEmit`

**Commit:** `git add src/lib/hooks/useShiftData.ts && git commit -m "feat(shifts): add useShiftData hook for Supabase queries"`

---

### Tarea 1.8: Crear utilidad costCalculator — Calculos de nomina

**Objetivo:** Funciones puras para calcular costo estimado por turno y semana.

**Archivos:**
- Crear: `src/lib/utils/costCalculator.ts`

**Step 1:** Crear archivo de calculos

```typescript
import { LEGAL_PARAMS, ShiftCostEstimate, ShiftType } from '@/lib/types/shifts';

/**
 * Calcula el valor hora de un empleado
 */
export function calcularValorHora(salarioMensual: number): number {
  return salarioMensual / 30 / 8;
}

/**
 * Calcula el costo estimado de un turno para un empleado
 */
export function calcularCostoTurno(
  shiftType: ShiftType,
  salarioMensual: number,
  esDomingo: boolean = false
): ShiftCostEstimate {
  const valorHora = calcularValorHora(salarioMensual);
  const { ordinarias, nocturnas } = shiftType;

  // Total de horas del turno
  const totalHoras = ordinarias + nocturnas;

  // Pago base (horas ordinarias + nocturnas a tarifa normal)
  const base_pay = totalHoras * valorHora;

  // Recargo nocturno (35% sobre horas nocturnas)
  const night_surcharge = nocturnas * valorHora * LEGAL_PARAMS.NIGHT_SURCHARGE;

  // Horas extra (si el turno supera 8h)
  let overtime_surcharge = 0;
  const horasExceso = Math.max(0, totalHoras - LEGAL_PARAMS.MAX_DAILY_HOURS);

  if (horasExceso > 0) {
    // Distribuir el exceso entre diurnas y nocturnas proporcionalmente
    const proporcionNocturna = nocturnas / totalHoras;
    const excesoNocturno = horasExceso * proporcionNocturna;
    const excesoDiurno = horasExceso - excesoNocturno;

    // HE diurna 25%
    overtime_surcharge += excesoDiurno * valorHora * LEGAL_PARAMS.OVERTIME_DIURNAL;
    // HE nocturna 75%
    overtime_surcharge += excesoNocturno * valorHora * LEGAL_PARAMS.OVERTIME_NIGHT;
  }

  // Recargo dominical (75% sobre todas las horas si es domingo)
  const sunday_surcharge = esDomingo
    ? totalHoras * valorHora * LEGAL_PARAMS.SUNDAY_SURCHARGE
    : 0;

  const total = base_pay + night_surcharge + overtime_surcharge + sunday_surcharge;

  return {
    base_pay: Math.round(base_pay),
    night_surcharge: Math.round(night_surcharge),
    overtime_surcharge: Math.round(overtime_surcharge),
    sunday_surcharge: Math.round(sunday_surcharge),
    total: Math.round(total),
  };
}

/**
 * Calcula el costo semanal estimado para un empleado
 */
export function calcularCostoSemanal(
  assignments: { shiftType: ShiftType; esDomingo: boolean }[],
  salarioMensual: number
): {
  totalHoras: number;
  horasOrdinarias: number;
  horasNocturnas: number;
  horasExtra: number;
  costoTotal: number;
  tieneDescanso: boolean;
} {
  let totalHoras = 0;
  let horasOrdinarias = 0;
  let horasNocturnas = 0;
  let costoTotal = 0;
  let diasTrabajados = 0;

  for (const { shiftType, esDomingo } of assignments) {
    totalHoras += shiftType.ordinarias + shiftType.nocturnas;
    horasOrdinarias += shiftType.ordinarias;
    horasNocturnas += shiftType.nocturnas;
    costoTotal += calcularCostoTurno(shiftType, salarioMensual, esDomingo).total;
    diasTrabajados++;
  }

  // Horas extra = exceso sobre 44h semanales
  const horasExtra = Math.max(0, totalHoras - LEGAL_PARAMS.MAX_WEEKLY_HOURS);

  // Verificar descanso semanal (al menos 1 dia sin turno)
  const tieneDescanso = diasTrabajados < 7;

  return {
    totalHoras,
    horasOrdinarias,
    horasNocturnas,
    horasExtra,
    costoTotal,
    tieneDescanso,
  };
}

/**
 * Formatea un valor en COP
 */
export function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Genera el string de semana ISO a partir de una fecha
 */
export function getWeekStr(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 4);
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

/**
 * Obtiene las fechas de una semana ISO
 */
export function getWeekDates(weekStr: string): Date[] {
  const [year, week] = weekStr.split('-W').map(Number);
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);

  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

/**
 * Determina si una fecha es domingo (para calculo de recargo dominical)
 */
export function esDomingo(date: Date): boolean {
  return date.getDay() === 0;
}
```

**Step 2:** Verificar TypeScript: `npx tsc --noEmit`

**Commit:** `git add src/lib/utils/costCalculator.ts && git commit -m "feat(shifts): add cost calculator utility for shift cost estimation"`

---

### Tarea 1.9: Agregar pestana "Turnos" al AdminTabBar

**Objetivo:** Agregar la pestana de Turnos al panel de navegacion del admin.

**Archivos:**
- Modificar: `src/components/admin/AdminTabBar.tsx`
- Modificar: `src/components/admin/AdminShell.tsx`

**Step 1:** Leer `AdminTabBar.tsx` y `AdminShell.tsx` para entender la estructura actual de pestanas.

**Step 2:** Agregar la pestana "Turnos" despues de las existentes. Phosphor icon: `CalendarDots` o `ClockClockwise`.

**Step 3:** En `AdminShell.tsx`, agregar el case para renderizar el componente `ShiftSchedulePanel` cuando la pestana activa sea "turnos".

**Step 4:** Verificar en navegador que la pestana aparece y es clickeable (aunque renderice placeholder por ahora).

**Commit:** `git commit -m "feat(shifts): add Turnos tab to AdminTabBar and AdminShell routing"`

---

### Tarea 1.10: Crear componente placeholder ShiftSchedulePanel

**Objetivo:** Componente contenedor con selector de area y semana.

**Archivos:**
- Crear: `src/components/admin/shifts/ShiftSchedulePanel.tsx`

**Step 1:** Crear componente con estructura basica:

```tsx
'use client';

import { useState } from 'react';
import { CalendarDots, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { SectionHeading } from '@/components/admin/shared/SectionHeading';
import { ShiftArea } from '@/lib/types/shifts';
import { getWeekStr } from '@/lib/utils/costCalculator';

const AREAS: { key: ShiftArea; label: string }[] = [
  { key: 'cocina', label: 'Cocina' },
  { key: 'barra', label: 'Barra' },
  { key: 'servicio', label: 'Servicio' },
];

export default function ShiftSchedulePanel() {
  const [activeArea, setActiveArea] = useState<ShiftArea>('cocina');
  const [currentDate, setCurrentDate] = useState(new Date());
  const weekStr = getWeekStr(currentDate);

  const navigateWeek = (direction: number) => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + direction * 7);
    setCurrentDate(next);
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Turnos"
        subtitle="Planificacion semanal de turnos y costos de nomina"
      />

      {/* Selector de area */}
      <div className="flex gap-2">
        {AREAS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveArea(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${activeArea === key
                ? 'bg-[var(--accent-primary)] text-white'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Navegacion de semana */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigateWeek(-1)} className="p-1 hover:bg-[var(--bg-hover)] rounded">
          <CaretLeft size={20} />
        </button>
        <span className="text-lg font-semibold text-[var(--text-primary)]">
          Semana {weekStr}
        </span>
        <button onClick={() => navigateWeek(1)} className="p-1 hover:bg-[var(--bg-hover)] rounded">
          <CaretRight size={20} />
        </button>
      </div>

      {/* Grilla — se implementa en Fase 2 */}
      <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center text-[var(--text-secondary)]">
        <CalendarDots size={48} className="mx-auto mb-3 opacity-30" />
        <p>Grilla de turnos se implementara en Fase 2</p>
        <p className="text-sm mt-1">Area: {activeArea} | Semana: {weekStr}</p>
      </div>
    </div>
  );
}
```

**Step 2:** Verificar TypeScript: `npx tsc --noEmit`

**Step 3:** Verificar en navegador que la pestana Turnos renderiza correctamente.

**Commit:** `git add src/components/admin/shifts/ShiftSchedulePanel.tsx && git commit -m "feat(shifts): add ShiftSchedulePanel placeholder with area and week selectors"`

---

### Tarea 1.11: Actualizar roles en TeamPanel — Agregar lider_area y colaborador

**Objetivo:** Extension del panel Equipo existente para incluir los 2 nuevos roles SIN tocar los existentes.

**Archivos:**
- Modificar: `src/components/admin/team/TeamPanel.tsx`

**Step 1:** Leer `TeamPanel.tsx` para entender donde esta el dropdown de roles.

**Step 2:** Agregar `lider_area` y `colaborador` al array de roles disponibles. El dropdown debe quedar asi:

```typescript
const ROLES = [
  'super_admin',   // existente - NO TOCAR
  'store_admin',    // existente - NO TOCAR
  'lider_area',     // NUEVO
  'colaborador',    // NUEVO
  'host',           // existente - NO TOCAR
];
```

**Step 3:** Cuando se seleccione `lider_area`, mostrar un dropdown adicional de area (`cocina`, `barra`, `servicio`).

**Step 4:** Cuando se seleccione `colaborador`, mostrar un campo de busqueda para vincular con `pos_nomina_staff`.

**Step 5:** Verificar en navegador que los roles nuevos aparecen en el dropdown y los existentes funcionan igual.

**Commit:** `git commit -m "feat(shifts): add lider_area and colaborador roles to TeamPanel (existing roles untouched)"`

---

## FASE 2: Cronograma Semanal (5-7 dias)

### Tarea 2.1: Crear API route GET /api/admin/shift-schedules

**Objetivo:** Endpoint para obtener cronogramas y asignaciones.

**Archivos:**
- Crear: `src/app/api/admin/shift-schedules/route.ts`

**Step 1:** Crear API route con GET y POST:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const area = searchParams.get('area');
  const week_str = searchParams.get('week_str');

  if (!area || !week_str) {
    return NextResponse.json({ error: 'area and week_str are required' }, { status: 400 });
  }

  // Obtener cronograma
  const { data: schedule, error: schedError } = await supabase
    .from('shift_schedules')
    .select('*')
    .eq('area', area)
    .eq('week_str', week_str)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (schedError) {
    return NextResponse.json({ error: schedError.message }, { status: 500 });
  }

  if (!schedule) {
    // No hay cronograma, devolver datos basicos para crear uno nuevo
    const { data: staff } = await supabase
      .from('pos_nomina_staff')
      .select('id, nombre, cargo, area, secondary_areas, salario')
      .eq('sede', 'C75')
      .or(`area.eq.${area},secondary_areas.cs.{${area}}`)
      .order('nombre');

    return NextResponse.json({ schedule: null, assignments: [], staff: staff || [] });
  }

  // Obtener asignaciones
  const { data: assignments, error: assignError } = await supabase
    .from('shift_assignments')
    .select('*, shift_types!shift_assignments_shift_code_fkey(*)')
    .eq('schedule_id', schedule.id);

  if (assignError) {
    return NextResponse.json({ error: assignError.message }, { status: 500 });
  }

  // Obtener personal del area
  const { data: staff } = await supabase
    .from('pos_nomina_staff')
    .select('id, nombre, cargo, area, secondary_areas, salario')
    .eq('sede', 'C75')
    .or(`area.eq.${area},secondary_areas.cs.{${area}}`)
    .order('nombre');

  return NextResponse.json({
    schedule,
    assignments: assignments || [],
    staff: staff || [],
  });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const body = await request.json();
  const { area, week_str, restaurant_id, created_by } = body;

  // Crear nuevo cronograma
  const { data: schedule, error } = await supabase
    .from('shift_schedules')
    .insert({
      restaurant_id,
      area,
      week_str,
      created_by,
      status: 'draft',
      version: 1,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(schedule, { status: 201 });
}
```

**Step 2:** Verificar TypeScript: `npx tsc --noEmit`

**Commit:** `git commit -m "feat(shifts): add shift-schedules GET/POST API route"`

---

### Tarea 2.2: Crear API route /api/admin/shift-assignments

**Objetivo:** Endpoint para batch update de asignaciones.

**Archivos:**
- Crear: `src/app/api/admin/shift-assignments/route.ts`

**Step 1:** Crear API route con PUT (batch update):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PUT: Batch update de asignaciones
export async function PUT(request: NextRequest) {
  const supabase = createClient();
  const { schedule_id, assignments } = await request.json();

  if (!schedule_id || !Array.isArray(assignments)) {
    return NextResponse.json({ error: 'schedule_id and assignments array required' }, { status: 400 });
  }

  // Borran asignaciones existentes del cronograma
  const { error: deleteError } = await supabase
    .from('shift_assignments')
    .delete()
    .eq('schedule_id', schedule_id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Insertar nuevas asignaciones
  const inserts = assignments.map((a: any) => ({
    schedule_id,
    employee_id: a.employee_id,
    day_index: a.day_index,
    shift_code: a.shift_code,
    entrada: a.entrada || null,
    salida: a.salida || null,
    novedad: a.novedad || null,
    turnante_nombre: a.turnante_nombre || null,
    is_overtime: a.is_overtime || false,
    estimated_hours: a.estimated_hours || null,
    estimated_cost: a.estimated_cost || null,
  }));

  const { data, error: insertError } = await supabase
    .from('shift_assignments')
    .insert(inserts)
    .select();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ assignments: data });
}
```

**Step 2:** Verificar TypeScript: `npx tsc --noEmit`

**Commit:** `git commit -m "feat(shifts): add shift-assignments batch PUT API route"`

---

### Tarea 2.3: Crear ShiftGrid — Grilla interactiva semanal

**Objetivo:** Componente principal de la grilla con dropdowns de turno por celda.

**Archivos:**
- Crear: `src/components/admin/shifts/ShiftGrid.tsx`

**Step 1:** Crear componente de grilla con las siguientes caracteristicas:
- 7 columnas (Lun-Dom) x N filas (empleados del area)
- Dropdown de turno en cada celda (filtrado por area)
- Celda roja si >44h semanales o >8h diarias
- Celda amarilla si <1 descanso semanal
- Columna "X" = descanso obligatorio
- Fila de totales: horas semanales + costo estimado
- Footer con total area y alertas

Este es el componente mas complejo. Se implementa en etapas:
1. Estructura basica de la tabla
2. Dropdowns de turno con shiftTypes filtrados
3. Calculo de horas y alertas
4. Barra de costos

**Step 2:** Verificar TypeScript y que renderiza sin errores.

**Commit:** `git commit -m "feat(shifts): add ShiftGrid component with turn dropdowns, hours calculation, and alerts"`

---

### Tarea 2.4: Crear CostEstimationBar — Costos en tiempo real

**Objetivo:** Componente que muestra el costo estimado por empleado y total del area.

**Archivos:**
- Crear: `src/components/admin/shifts/CostEstimationBar.tsx`

**Step 1:** Crear componente que usa `calcularCostoTurno` y `calcularCostoSemanal` para mostrar:
- Costo por empleado en la fila de totales
- Total del area en el footer
- Comparador: presupuesto vs estimado
- Grafico de desglose (HO vs HN vs HE) con Recharts

**Step 2:** Verificar que los numeros coinciden con los calculos manuales del analisis.

**Commit:** `git commit -m "feat(shifts): add CostEstimationBar with real-time cost calculation"`

---

### Tarea 2.5: Crear API route /api/admin/shift-schedules/[id]/publish

**Objetivo:** Endpoint para publicar un cronograma (cambiar estado de draft a published).

**Archivos:**
- Crear: `src/app/api/admin/shift-schedules/[id]/publish/route.ts`

**Step 1:** Crear POST route que cambie status a 'published' solo si el usuario es super_admin o lider_area del area correspondiente.

**Step 2:** Verificar que lider_area solo puede publicar su propia area.

**Commit:** `git commit -m "feat(shifts): add schedule publish API route with role checks"`

---

### Tarea 2.6: Integrar ShiftGrid + CostEstimationBar + API routes en ShiftSchedulePanel

**Objetivo:** Conectar todos los componentes de Fase 2.

**Archivos:**
- Modificar: `src/components/admin/shifts/ShiftSchedulePanel.tsx`

**Step 1:** Reemplazar el placeholder con la grilla real:
- Use `useShiftData` hook
- Render `ShiftGrid` con datos
- Render `CostEstimationBar` abajo
- Botones: Guardar borrador, Publicar, Duplicar semana

**Step 2:** Verificar en navegador que:
- La grilla muestra empleados del area seleccionada
- Los dropdowns muestran los turnos correctos por area
- Los costos se calculan en tiempo real al cambiar un turno
- Las alertas rojas aparecen para >44h semanales
- Se puede guardar y publicar un cronograma

**Commit:** `git commit -m "feat(shifts): integrate ShiftGrid, CostEstimationBar, and API in ShiftSchedulePanel"`

---

## FASE 3: Performance Dashboard (3-4 dias)

### Tarea 3.1: Crear API route /api/admin/shift-performance

**Objetivo:** Endpoint de agregaciones por area, empleado y periodo.

**Archivos:**
- Crear: `src/app/api/admin/shift-performance/route.ts`

**Step 1:** API route con GET que acepte `area`, `period` (week/month), `start_date`, `end_date` y devuelva:
- KPIs agregados: total HO, HN, HE, recargos, costo total
- Desglose por empleado
- Alertas legales (>44h, sin descanso, >8h diarias)
- Comparacion con datos bio de Rodri si disponibles

**Commit:** `git commit -m "feat(shifts): add shift-performance aggregation API route"`

---

### Tarea 3.2: Crear PerformanceDashboard componente

**Objetivo:** Dashboard de KPIs, graficos y alertas legales.

**Archivos:**
- Crear: `src/components/admin/shifts/PerformanceDashboard.tsx`

**Step 1:** Dashboard con:
- Cards de KPIs: horas ordinarias, nocturnas, extras, recargo nocturno, recargo dominical, costo total
- Grafico de barras apiladas (Recharts): HO vs HN por empleado
- Tabla expandible por empleado: nombre, HO, HN, HED, HEN, RN, total, costo, % legal
- Alertas automaticas con iconos Phosphor: >44h semanales, 7 dias sin descanso, >8h diarias
- Filtro por periodo (semana, mes) y area

**Commit:** `git commit -m "feat(shifts): add PerformanceDashboard with KPIs, charts, and alerts"`

---

### Tarea 3.3: Integrar PerformanceDashboard en ShiftSchedulePanel

**Objetivo:** Agregar pestana de Performance al panel de Turnos.

**Archivos:**
- Modificar: `src/components/admin/shifts/ShiftSchedulePanel.tsx`

**Step 1:** Agregar tabs internos: "Cronograma" | "Performance"

**Step 2:** Renderizar PerformanceDashboard cuando el tab activo sea "Performance"

**Commit:** `git commit -m "feat(shifts): add Performance tab to ShiftSchedulePanel"`

---

## FASE 4: Vista Colaborador (4-5 dias)

### Tarea 4.1: Crear API routes colaborador

**Objetivo:** Endpoints para la vista del colaborador.

**Archivos:**
- Crear: `src/app/api/admin/shift-my-week/route.ts`
- Crear: `src/app/api/admin/shift-checkin/route.ts`
- Crear: `src/app/api/admin/shift-checkout/route.ts`
- Crear: `src/app/api/admin/shift-novedades/route.ts`

**Step 1:** Crear los 4 endpoints basicos (GET para my-week, POST para checkin/checkout/novedades)

**Commit:** `git commit -m "feat(shifts): add collaborator API routes (my-week, checkin, checkout, novedades)"`

---

### Tarea 4.2: Crear MyShiftView — Vista del colaborador

**Objetivo:** Componente donde el colaborador ve su semana.

**Archivos:**
- Crear: `src/components/admin/shifts/MyShiftView.tsx`

**Step 1:** Vista con:
- Su semana: dia por dia con tipo de turno, entrada y salida
- Total de horas estimadas y costo estimado
- Boton "Check-in" y "Check-out" con geolocalizacion
- Boton "Reportar contingencia"
- Historial de semanas anteriores

**Commit:** `git commit -m "feat(shifts): add MyShiftView component for collaborator view"`

---

### Tarea 4.3: Crear CheckInOut — Geolocalizacion

**Objetivo:** Componente de check-in/out con GPS.

**Archivos:**
- Crear: `src/components/admin/shifts/CheckInOut.tsx`

**Step 1:** Componente con:
- Boton check-in que usa `navigator.geolocation.getCurrentPosition()`
- Guardar {lat, lng, accuracy, timestamp} en JSONB
- Verificar proximidad al restaurante (radio 200m)
- NO bloquear si GPS no disponible — solo registrar sin ubicacion
- Boton check-out con la misma logica

**Commit:** `git commit -m "feat(shifts): add CheckInOut component with GPS geolocation"`

---

### Tarea 4.4: Crear ContingencyReport — Formulario de novedades

**Objetivo:** Formulario para reportar contingencias.

**Archivos:**
- Crear: `src/components/admin/shifts/ContingencyReport.tsx`

**Step 1:** Formulario con React Hook Form + Zod:
- Tipo: no puedo ir, llegue tarde, permiso, incapacidad
- Fecha
- Descripcion
- Validacion con Zod schema

**Commit:** `git commit -m "feat(shifts): add ContingencyReport form with React Hook Form + Zod"`

---

### Tarea 4.5: Integrar vista colaborador en ShiftSchedulePanel

**Objetivo:** Si el usuario es colaborador, mostrar MyShiftView en vez del cronograma.

**Archivos:**
- Modificar: `src/components/admin/shifts/ShiftSchedulePanel.tsx`

**Step 1:** Logica de rol:
- super_admin o store_admin o lider_area → ven Cronograma + Performance
- colaborador → ven MyShiftView + CheckInOut + ContingencyReport
- host → sin acceso a pestana Turnos

**Commit:** `git commit -m "feat(shifts): add role-based view switching in ShiftSchedulePanel"`

---

## VERIFICACION FINAL

Despues de completar todas las fases:

1. **Fase 1 verification:**
   - `SELECT area, COUNT(*) FROM pos_nomina_staff WHERE sede='C75' AND area IS NOT NULL GROUP BY area ORDER BY area;` → 4 areas con conteos correctos
   - `SELECT COUNT(*) FROM shift_types;` → 24
   - `SELECT COUNT(*) FROM staff_aliases;` → 25+
   - Pestana "Turnos" visible en /admin
   - Roles lider_area y colaborador aparecen en TeamPanel

2. **Fase 2 verification:**
   - Un lider puede crear un cronograma semanal para su area
   - Los 24 codigos de turno aparecen en dropdowns correctos por area
   - Costo estimado se actualiza en tiempo real
   - Alertas rojas para >44h semanales o >8h diarias
   - Boton "Publicar" funciona

3. **Fase 3 verification:**
   - Dashboard muestra KPIs con datos reales
   - Grafico de barras apiladas renderiza correctamente
   - Alertas por empleado visibles

4. **Fase 4 verification:**
   - Colaborador ve su semana con turnos
   - Check-in/out funciona con GPS
   - Formulario de contingencias envia datos

5. **Build verification:**
   - `npx tsc --noEmit` sin errores
   - `npm run build` exitoso
   - Browser verification en https://web-rosy-nine-64.vercel.app/admin

---

## ROLLBACK PLAN

Si algo sale mal en Supabase:

```sql
-- Rollback ordenado (en orden inverso a la creacion)
DROP TABLE IF EXISTS staff_aliases CASCADE;
DROP TABLE IF EXISTS shift_novedades CASCADE;
DROP TABLE IF EXISTS shift_assignments CASCADE;
DROP TABLE IF EXISTS shift_schedules CASCADE;
DROP TABLE IF EXISTS shift_types CASCADE;
ALTER TABLE pos_nomina_staff DROP COLUMN IF EXISTS area;
ALTER TABLE pos_nomina_staff DROP COLUMN IF EXISTS secondary_areas;
ALTER TABLE user_roles DROP COLUMN IF EXISTS area;
ALTER TABLE user_roles DROP COLUMN IF EXISTS pos_nomina_staff_id;
```

Los roles existentes (super_admin, store_admin, host) NO se ven afectados por este rollback. Solo se eliminan las tablas nuevas y columnas nuevas. Los datos originales quedan intactos.