-- 3. Tablas core de turnos + RLS
-- Ejecutado en Supabase: 2026-05-28

-- Cronogramas semanales
CREATE TABLE IF NOT EXISTS shift_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  area TEXT NOT NULL CHECK (area IN ('cocina', 'barra', 'servicio')),
  week_str TEXT NOT NULL,
  created_by UUID,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'approved')),
  version INT NOT NULL DEFAULT 1,
  total_estimated_cost DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(area, week_str, version)
);

-- Asignaciones de turno por empleado y dia
CREATE TABLE IF NOT EXISTS shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES shift_schedules(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES pos_nomina_staff(id),
  day_index INT NOT NULL CHECK (day_index >= 0 AND day_index <= 6),
  shift_code TEXT NOT NULL,
  entrada TIME,
  salida TIME,
  novedad TEXT,
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

-- Novedades (check-in/out, faltas, permisos)
CREATE TABLE IF NOT EXISTS shift_novedades (
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

-- Alias de personal (Excel <-> Nomina)
CREATE TABLE IF NOT EXISTS staff_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES pos_nomina_staff(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  source TEXT CHECK (source IN ('excel', 'rodri', 'interno', 'colombia')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(alias, source)
);

-- Agregar columnas a pos_nomina_staff
ALTER TABLE pos_nomina_staff ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE pos_nomina_staff ADD COLUMN IF NOT EXISTS secondary_areas TEXT[] DEFAULT '{}';

-- Agregar columnas a user_roles
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS pos_nomina_staff_id UUID REFERENCES pos_nomina_staff(id);

-- Indices
CREATE INDEX IF NOT EXISTS idx_shift_schedules_area_week ON shift_schedules(area, week_str);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_schedule ON shift_assignments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_employee ON shift_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_shift_novedades_employee_date ON shift_novedades(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_staff_aliases_employee ON staff_aliases(employee_id);

-- RLS policies
ALTER TABLE shift_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view schedules" ON shift_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and lider_area can manage schedules" ON shift_schedules FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.auth_user_id = auth.uid() AND ur.role IN ('super_admin', 'store_admin', 'lider_area')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.auth_user_id = auth.uid() AND ur.role IN ('super_admin', 'store_admin', 'lider_area')));

ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view assignments" ON shift_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and lider_area can manage assignments" ON shift_assignments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.auth_user_id = auth.uid() AND ur.role IN ('super_admin', 'store_admin', 'lider_area')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.auth_user_id = auth.uid() AND ur.role IN ('super_admin', 'store_admin', 'lider_area')));

ALTER TABLE shift_novedades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view novedades" ON shift_novedades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create novedades" ON shift_novedades FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE staff_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view aliases" ON staff_aliases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage aliases" ON staff_aliases FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.auth_user_id = auth.uid() AND ur.role IN ('super_admin', 'store_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.auth_user_id = auth.uid() AND ur.role IN ('super_admin', 'store_admin')));