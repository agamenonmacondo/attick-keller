-- =============================================
-- A&K NÓMINA — Crear tablas en Supabase PRINCIPAL
-- BD: pbllaipsdfypelnwrvpy.supabase.co
-- Ejecutar en: SQL Editor del Dashboard A&K
--
-- EXTENDER pos_nomina_staff existente
– CREAR tablas nuevas de nómina contable
-- =============================================

-- 1. Extender pos_nomina_staff con campos de nómina
ALTER TABLE public.pos_nomina_staff ADD COLUMN IF NOT EXISTS salario NUMERIC(15,2) DEFAULT 1750905;
ALTER TABLE public.pos_nomina_staff ADD COLUMN IF NOT EXISTS cargo TEXT;
ALTER TABLE public.pos_nomina_staff ADD COLUMN IF NOT EXISTS modalidad TEXT DEFAULT 'COMPLETO';
ALTER TABLE public.pos_nomina_staff ADD COLUMN IF NOT EXISTS sede TEXT DEFAULT 'C75';
ALTER TABLE public.pos_nomina_staff ADD COLUMN IF NOT EXISTS fecha_ingreso DATE;
ALTER TABLE public.pos_nomina_staff ADD COLUMN IF NOT EXISTS aplica_propinas BOOLEAN DEFAULT true;
ALTER TABLE public.pos_nomina_staff ADD COLUMN IF NOT EXISTS auxilio_no_salarial NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.pos_nomina_staff ADD COLUMN IF NOT EXISTS banco TEXT;
ALTER TABLE public.pos_nomina_staff ADD COLUMN IF NOT EXISTS cuenta_bancaria TEXT;

-- 2. PERIODOS DE NÓMINA (mensual, por sede)
CREATE TABLE IF NOT EXISTS public.nomina_periodos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo TEXT NOT NULL,           -- 'ABRIL 2026'
  fecha_inicio DATE NOT NULL,      -- 2026-04-01
  fecha_fin DATE NOT NULL,         -- 2026-04-30
  sede TEXT NOT NULL DEFAULT 'C75', -- 'C75', 'C85', 'KINDER', 'ADMIN'
  estado TEXT DEFAULT 'ABIERTO',    -- 'ABIERTO', 'CERRADO', 'PAGADO'
  total_devengado NUMERIC(18,2),
  total_deducciones NUMERIC(18,2),
  total_neto NUMERIC(18,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(periodo, sede)
);

-- 3. NÓMINA DETALLE (1 fila por empleado × mes × sede)
CREATE TABLE IF NOT EXISTS public.nomina_detalle (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo_id UUID NOT NULL REFERENCES public.nomina_periodos(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.pos_nomina_staff(id),
  sede TEXT NOT NULL DEFAULT 'C75',

  dias_laborados INT NOT NULL DEFAULT 30,
  salario_basico NUMERIC(15,2) NOT NULL,
  salario_devengado NUMERIC(15,2) NOT NULL,

  -- Devengado
  auxilio_transporte NUMERIC(15,2) DEFAULT 0,
  propinas_prometido_75_85 NUMERIC(15,2) DEFAULT 0,
  propinas_prometido_75 NUMERIC(15,2) DEFAULT 0,
  auxilio_no_salarial NUMERIC(15,2) DEFAULT 0,
  recargos_he_rn_rd NUMERIC(15,2) DEFAULT 0,
  propinas NUMERIC(15,2) DEFAULT 0,
  total_devengado NUMERIC(15,2) NOT NULL,

  -- Deducciones
  salud_empleado NUMERIC(15,2) DEFAULT 0,
  pension_empleado NUMERIC(15,2) DEFAULT 0,
  pagos_realizados NUMERIC(15,2) DEFAULT 0,
  prestamos_consumos NUMERIC(15,2) DEFAULT 0,
  total_deducciones NUMERIC(15,2) NOT NULL,

  -- Resultado
  neto_a_pagar NUMERIC(15,2) NOT NULL,
  ibc NUMERIC(15,2),

  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(periodo_id, staff_id, sede)
);

-- 4. HORAS EXTRA Y RECARGOS (desglose mensual en $)
CREATE TABLE IF NOT EXISTS public.nomina_he_recargos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo_id UUID NOT NULL REFERENCES public.nomina_periodos(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.pos_nomina_staff(id),
  sede TEXT NOT NULL DEFAULT 'C75',

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
  UNIQUE(periodo_id, staff_id, sede)
);

-- 5. NOVEDADES (vacaciones, incapacidades, permisos, etc.)
CREATE TABLE IF NOT EXISTS public.nomina_novedades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo_id UUID NOT NULL REFERENCES public.nomina_periodos(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.pos_nomina_staff(id),
  sede TEXT NOT NULL DEFAULT 'C75',

  tipo TEXT NOT NULL,  -- 'VACACIONES', 'INCAPACIDAD', 'PERMISO_REMUNERADO', 'PERMISO_NO_REMUNERADO', 'AUSENCIA', 'RETIRO', 'CAMBIO_BANCO', 'INGRESO'
  observacion TEXT,
  fecha_inicio DATE,
  fecha_fin DATE,
  dias INT,
  aplicada BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. PROVISIONES SOCIALES (mensual, por empleado)
CREATE TABLE IF NOT EXISTS public.nomina_provisiones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo_id UUID NOT NULL REFERENCES public.nomina_periodos(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.pos_nomina_staff(id),
  sede TEXT NOT NULL DEFAULT 'C75',

  provisiones_salud NUMERIC(15,2) DEFAULT 0,
  provisiones_sociales NUMERIC(15,2) DEFAULT 0,
  base_vacaciones NUMERIC(15,2) DEFAULT 0,

  -- Deducciones empleado
  salud_empleado NUMERIC(15,2) DEFAULT 0,
  pension_empleado NUMERIC(15,2) DEFAULT 0,

  -- Aportes empleador
  pension_empleador NUMERIC(15,2) DEFAULT 0,
  arl_empleador NUMERIC(15,2) DEFAULT 0,
  caja_empleador NUMERIC(15,2) DEFAULT 0,
  cesantias_empleador NUMERIC(15,2) DEFAULT 0,
  prima_empleador NUMERIC(15,2) DEFAULT 0,
  vacaciones_empleador NUMERIC(15,2) DEFAULT 0,
  intereses_cesantias_empleador NUMERIC(15,2) DEFAULT 0,
  total_provision_empleador NUMERIC(15,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(periodo_id, staff_id, sede)
);

-- 7. PROPINAS MENSUALES (por sede)
CREATE TABLE IF NOT EXISTS public.nomina_propinas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo_id UUID NOT NULL REFERENCES public.nomina_periodos(id) ON DELETE CASCADE,
  sede TEXT NOT NULL DEFAULT 'C75',

  total_propinas_ventas NUMERIC(15,2) NOT NULL,
  prometidos_100_pct NUMERIC(15,2) DEFAULT 0,
  propina_para_rep NUMERIC(15,2) DEFAULT 0,
  dias_laborados_total INT NOT NULL,
  valor_dia_propina NUMERIC(15,2) NOT NULL,

  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(periodo_id, sede)
);

-- =============================================
-- RLS Policies
-- =============================================
ALTER TABLE public.nomina_periodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomina_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomina_he_recargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomina_novedades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomina_provisiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomina_propinas ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (already bypasses RLS)
-- Anon key: read-only
CREATE POLICY "Allow read access" ON public.nomina_periodos FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON public.nomina_detalle FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON public.nomina_he_recargos FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON public.nomina_novedades FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON public.nomina_provisiones FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON public.nomina_propinas FOR SELECT USING (true);

-- Seed: periodo abril 2026 (una entrada por sede)
INSERT INTO public.nomina_periodos (periodo, fecha_inicio, fecha_fin, sede, estado)
VALUES
  ('ABRIL 2026', '2026-04-01', '2026-04-30', 'C75', 'ABIERTO'),
  ('ABRIL 2026', '2026-04-01', '2026-04-30', 'C85', 'ABIERTO'),
  ('ABRIL 2026', '2026-04-01', '2026-04-30', 'KINDER', 'ABIERTO'),
  ('ABRIL 2026', '2026-04-01', '2026-04-30', 'ADMIN', 'ABIERTO')
ON CONFLICT (periodo, sede) DO NOTHING;