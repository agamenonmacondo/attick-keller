-- 1. Catalogo de tipos de turno (24 codigos)
-- Ejecutado en Supabase: 2026-05-28
CREATE TABLE IF NOT EXISTS shift_types (
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

-- Agregar lider_area y colaborador al enum user_role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'lider_area';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'colaborador';

-- RLS for shift_types
ALTER TABLE shift_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Any authenticated user can view shift_types"
  ON shift_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins and lider_area can manage shift_types"
  ON shift_types FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.auth_user_id = auth.uid() AND ur.role IN ('super_admin', 'store_admin', 'lider_area'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.auth_user_id = auth.uid() AND ur.role IN ('super_admin', 'store_admin', 'lider_area'))
  );