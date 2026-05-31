-- 6. Fix: agregar columnas faltantes a pos_nomina_staff y corregir RLS
-- Ejecutar en Supabase SQL Editor

-- ==============================
-- A. Columnas faltantes en pos_nomina_staff
-- ==============================
ALTER TABLE public.pos_nomina_staff ADD COLUMN IF NOT EXISTS contrato TEXT DEFAULT 'fijo';
ALTER TABLE public.pos_nomina_staff ADD COLUMN IF NOT EXISTS correo TEXT;
ALTER TABLE public.pos_nomina_staff ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- Poblar activo=true para registros existentes que no tengan valor
UPDATE public.pos_nomina_staff SET activo = true WHERE activo IS NULL;

-- ==============================
-- B. Corregir RLS en tablas de turnos
-- ==============================

-- shift_types: permitir lectura a cualquier usuario autenticado
DROP POLICY IF EXISTS "Any authenticated user can view shift_types" ON public.shift_types;
CREATE POLICY "Any authenticated user can view shift_types"
  ON public.shift_types FOR SELECT TO authenticated USING (true);

-- Si existen policies restrictivas de ALL, remplazarlas
DROP POLICY IF EXISTS "Only admins and lider_area can manage shift_types" ON public.shift_types;
CREATE POLICY "Admins and lider_area can manage shift_types"
  ON public.shift_types FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.auth_user_id = auth.uid() AND ur.role IN ('super_admin', 'store_admin', 'lider_area'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.auth_user_id = auth.uid() AND ur.role IN ('super_admin', 'store_admin', 'lider_area'))
  );

-- shift_schedules: permitir lectura a cualquier usuario autenticado
DROP POLICY IF EXISTS "Authenticated users can view schedules" ON public.shift_schedules;
CREATE POLICY "Authenticated users can view schedules"
  ON public.shift_schedules FOR SELECT TO authenticated USING (true);

-- shift_schedules: escritura solo admins/lider_area
DROP POLICY IF EXISTS "Admins and lider_area can manage schedules" ON public.shift_schedules;
CREATE POLICY "Admins and lider_area can manage schedules"
  ON public.shift_schedules FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.auth_user_id = auth.uid() AND ur.role IN ('super_admin', 'store_admin', 'lider_area'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.auth_user_id = auth.uid() AND ur.role IN ('super_admin', 'store_admin', 'lider_area'))
  );

-- shift_assignments: permitir lectura a cualquier usuario autenticado
DROP POLICY IF EXISTS "Authenticated users can view assignments" ON public.shift_assignments;
CREATE POLICY "Authenticated users can view assignments"
  ON public.shift_assignments FOR SELECT TO authenticated USING (true);

-- shift_assignments: escritura solo admins/lider_area
DROP POLICY IF EXISTS "Admins and lider_area can manage assignments" ON public.shift_assignments;
CREATE POLICY "Admins and lider_area can manage assignments"
  ON public.shift_assignments FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.auth_user_id = auth.uid() AND ur.role IN ('super_admin', 'store_admin', 'lider_area'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.auth_user_id = auth.uid() AND ur.role IN ('super_admin', 'store_admin', 'lider_area'))
  );

-- staff_aliases: permitir lectura a cualquier usuario autenticado
DROP POLICY IF EXISTS "Authenticated users can view aliases" ON public.staff_aliases;
CREATE POLICY "Authenticated users can view aliases"
  ON public.staff_aliases FOR SELECT TO authenticated USING (true);

-- staff_aliases: escritura solo admins/lider_area
DROP POLICY IF EXISTS "Admins and lider_area can manage aliases" ON public.staff_aliases;
CREATE POLICY "Admins and lider_area can manage aliases"
  ON public.staff_aliases FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.auth_user_id = auth.uid() AND ur.role IN ('super_admin', 'store_admin', 'lider_area'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.auth_user_id = auth.uid() AND ur.role IN ('super_admin', 'store_admin', 'lider_area'))
  );

-- pos_nomina_staff: permitir lectura a usuarios autenticados
DROP POLICY IF EXISTS "Authenticated users can view staff" ON public.pos_nomina_staff;
CREATE POLICY "Authenticated users can view staff"
  ON public.pos_nomina_staff FOR SELECT TO authenticated USING (true);
