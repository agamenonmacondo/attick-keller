-- =============================================
-- A&K NÓMINA — Crear tablas en Supabase Seadotec
-- EJECUTAR EN: SQL Editor del Dashboard Seadotec
-- Base de datos: seadotecznewqcvxsber.supabase.co
-- =============================================

-- 1. SEDES
CREATE TABLE IF NOT EXISTS public.sedes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  direccion TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. EXTENDER employees con campos de nómina
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS cedula TEXT UNIQUE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS salario NUMERIC(15,2) DEFAULT 1750905;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS modalidad TEXT DEFAULT 'COMPLETO';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS sede_id UUID REFERENCES public.sedes(id);
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS fecha_ingreso DATE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS aplica_propinas BOOLEAN DEFAULT true;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS auxilio_no_salarial NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS banco TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS cuenta_bancaria TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS tipo_documento TEXT DEFAULT 'CC';

-- 3. PERIODOS DE NÓMINA
CREATE TABLE IF NOT EXISTS public.nomina_periodos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  sede_id UUID REFERENCES public.sedes(id),
  estado TEXT DEFAULT 'ABIERTO',
  total_devengado NUMERIC(18,2),
  total_deducciones NUMERIC(18,2),
  total_neto NUMERIC(18,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(periodo, sede_id)
);

-- 4. NÓMINA DETALLE (1 fila por empleado × periodo × sede)
CREATE TABLE IF NOT EXISTS public.nomina_detalle (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo_id UUID NOT NULL REFERENCES public.nomina_periodos(id) ON DELETE CASCADE,
  empleado_id UUID NOT NULL REFERENCES public.employees(id),
  sede_id UUID NOT NULL REFERENCES public.sedes(id),
  dias_laborados INT NOT NULL DEFAULT 30,
  salario_basico NUMERIC(15,2) NOT NULL,
  salario_devengado NUMERIC(15,2) NOT NULL,
  auxilio_transporte NUMERIC(15,2) DEFAULT 0,
  propinas_prometido_75_85 NUMERIC(15,2) DEFAULT 0,
  propinas_prometido_75 NUMERIC(15,2) DEFAULT 0,
  auxilio_no_salarial NUMERIC(15,2) DEFAULT 0,
  recargos_he_rn_rd NUMERIC(15,2) DEFAULT 0,
  propinas NUMERIC(15,2) DEFAULT 0,
  total_devengado NUMERIC(15,2) NOT NULL,
  salud_empleado NUMERIC(15,2) DEFAULT 0,
  pension_empleado NUMERIC(15,2) DEFAULT 0,
  pagos_realizados NUMERIC(15,2) DEFAULT 0,
  prestamos_consumos NUMERIC(15,2) DEFAULT 0,
  total_deducciones NUMERIC(15,2) NOT NULL,
  neto_a_pagar NUMERIC(15,2) NOT NULL,
  ibc NUMERIC(15,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(periodo_id, empleado_id, sede_id)
);

-- 5. HORAS EXTRA Y RECARGOS
CREATE TABLE IF NOT EXISTS public.nomina_he_recargos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo_id UUID NOT NULL REFERENCES public.nomina_periodos(id) ON DELETE CASCADE,
  empleado_id UUID NOT NULL REFERENCES public.employees(id),
  sede_id UUID NOT NULL REFERENCES public.sedes(id),
  hed_horas NUMERIC(8,2) DEFAULT 0,
  hed_valor NUMERIC(15,2) DEFAULT 0,
  hed_total NUMERIC(15,2) DEFAULT 0,
  hen_horas NUMERIC(8,2) DEFAULT 0,
  hen_valor NUMERIC(15,2) DEFAULT 0,
  hen_total NUMERIC(15,2) DEFAULT 0,
  rn_horas NUMERIC(8,2) DEFAULT 0,
  rn_valor_hora NUMERIC(15,2) DEFAULT 0,
  rn_total NUMERIC(15,2) DEFAULT 0,
  rd_diurno_horas NUMERIC(8,2) DEFAULT 0,
  rd_diurno_valor NUMERIC(15,2) DEFAULT 0,
  rd_diurno_total NUMERIC(15,2) DEFAULT 0,
  rd_nocturno_horas NUMERIC(8,2) DEFAULT 0,
  rd_nocturno_valor NUMERIC(15,2) DEFAULT 0,
  rd_nocturno_total NUMERIC(15,2) DEFAULT 0,
  hedd_horas NUMERIC(8,2) DEFAULT 0,
  hedd_valor NUMERIC(15,2) DEFAULT 0,
  hedd_total NUMERIC(15,2) DEFAULT 0,
  hddn_horas NUMERIC(8,2) DEFAULT 0,
  hddn_valor NUMERIC(15,2) DEFAULT 0,
  hddn_total NUMERIC(15,2) DEFAULT 0,
  total_recargos NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(periodo_id, empleado_id, sede_id)
);

-- 6. NOVEDADES
CREATE TABLE IF NOT EXISTS public.nomina_novedades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo_id UUID NOT NULL REFERENCES public.nomina_periodos(id) ON DELETE CASCADE,
  empleado_id UUID REFERENCES public.employees(id),
  sede_id UUID NOT NULL REFERENCES public.sedes(id),
  tipo TEXT NOT NULL,
  observacion TEXT,
  fecha_inicio DATE,
  fecha_fin DATE,
  dias INT,
  aplicada BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. PROVISIONES SOCIALES
CREATE TABLE IF NOT EXISTS public.nomina_provisiones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo_id UUID NOT NULL REFERENCES public.nomina_periodos(id) ON DELETE CASCADE,
  empleado_id UUID NOT NULL REFERENCES public.employees(id),
  sede_id UUID NOT NULL REFERENCES public.sedes(id),
  provisiones_salud NUMERIC(15,2) DEFAULT 0,
  provisiones_sociales NUMERIC(15,2) DEFAULT 0,
  base_vacaciones NUMERIC(15,2) DEFAULT 0,
  salud_empleado NUMERIC(15,2) DEFAULT 0,
  pension_empleado NUMERIC(15,2) DEFAULT 0,
  pension_empleador NUMERIC(15,2) DEFAULT 0,
  arl_empleador NUMERIC(15,2) DEFAULT 0,
  caja_empleador NUMERIC(15,2) DEFAULT 0,
  cesantias_empleador NUMERIC(15,2) DEFAULT 0,
  prima_empleador NUMERIC(15,2) DEFAULT 0,
  vacaciones_empleador NUMERIC(15,2) DEFAULT 0,
  intereses_cesantias_empleador NUMERIC(15,2) DEFAULT 0,
  total_provision_empleador NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(periodo_id, empleado_id, sede_id)
);

-- 8. PROPINAS MENSUALES
CREATE TABLE IF NOT EXISTS public.nomina_propinas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo_id UUID NOT NULL REFERENCES public.nomina_periodos(id) ON DELETE CASCADE,
  sede_id UUID NOT NULL REFERENCES public.sedes(id),
  total_propinas_ventas NUMERIC(15,2) NOT NULL,
  prometidos_100_pct NUMERIC(15,2) DEFAULT 0,
  propina_para_rep NUMERIC(15,2) DEFAULT 0,
  dias_laborados_total INT NOT NULL,
  valor_dia_propina NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(periodo_id, sede_id)
);

-- =============================================
-- RLS
-- =============================================
ALTER TABLE public.sedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomina_periodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomina_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomina_he_recargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomina_novedades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomina_provisiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomina_propinas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access" ON public.sedes FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON public.nomina_periodos FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON public.nomina_detalle FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON public.nomina_he_recargos FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON public.nomina_novedades FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON public.nomina_provisiones FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON public.nomina_propinas FOR SELECT USING (true);

-- =============================================
-- SEED: Sedes
-- =============================================
INSERT INTO public.sedes (codigo, nombre) VALUES 
  ('C75', 'Calle 75'),
  ('C85', 'Calle 85'),
  ('KINDER', 'Pizzería Kinder'),
  ('ADMIN', 'Administración')
ON CONFLICT (codigo) DO NOTHING;