import { NextRequest, NextResponse } from 'next/server'

// ── One-time DDL Execution Route ──────────────────────
// Creates all nómina tables and extends pos_nomina_staff
// DELETE THIS FILE after running once!

const DDL_SQL = `
-- 1. Extend pos_nomina_staff with nómina fields
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
  periodo TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  sede TEXT NOT NULL DEFAULT 'C75',
  estado TEXT DEFAULT 'ABIERTO',
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
  UNIQUE(periodo_id, staff_id, sede)
);

-- 4. HORAS EXTRA Y RECARGOS
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

-- 5. NOVEDADES
CREATE TABLE IF NOT EXISTS public.nomina_novedades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo_id UUID NOT NULL REFERENCES public.nomina_periodos(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.pos_nomina_staff(id),
  sede TEXT NOT NULL DEFAULT 'C75',
  tipo TEXT NOT NULL,
  observacion TEXT,
  fecha_inicio DATE,
  fecha_fin DATE,
  dias INT,
  aplicada BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. PROVISIONES SOCIALES
CREATE TABLE IF NOT EXISTS public.nomina_provisiones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo_id UUID NOT NULL REFERENCES public.nomina_periodos(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.pos_nomina_staff(id),
  sede TEXT NOT NULL DEFAULT 'C75',
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

-- RLS Policies
ALTER TABLE public.nomina_periodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomina_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomina_he_recargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomina_novedades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomina_provisiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomina_propinas ENABLE ROW LEVEL SECURITY;

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
`

export async function POST(request: NextRequest) {
  // Simple token auth
  const token = request.headers.get('X-Import-Token')
  if (token !== '***') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  try {
    const { createClient } = await import('@supabase/supabase-js')
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Execute DDL via RPC - we need a function that can run arbitrary SQL
    // Since we can't create functions without DDL, we'll use a different approach:
    // Execute each statement via the REST API's .rpc() if a function exists,
    // or use the supabase-js .from() with table operations
    
    // Actually, the simplest approach: use the PostgreSQL direct connection
    // that Supabase JS provides for admin operations
    //
    // But supabase-js doesn't support DDL directly. We need one of:
    // 1. pg_net extension (async HTTP)
    // 2. Pre-existing exec_sql function
    // 3. Database password for direct psql connection
    
    // Let's try using pg_net if available:
    
    // Create an exec_sql function via pg_net
    // This won't work because we need DDL to create the function too!
    
    // FINAL APPROACH: Execute individual SQL statements using the 
    // Supabase Management API's /database/query endpoint
    // But that needs a personal access token, not the service key.
    
    // Instead, let's just check what tables/columns exist and return the DDL
    // so the user can paste it into the Dashboard SQL Editor.
    
    const tables = [
      'pos_nomina_staff', 'nomina_periodos', 'nomina_detalle',
      'nomina_he_recargos', 'nomina_novedades', 'nomina_provisiones', 'nomina_propinas'
    ]
    
    const status: Record<string, any> = {}
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error) {
        status[table] = { exists: false, error: error.message }
      } else {
        const columns = data && data.length > 0 ? Object.keys(data[0]) : []
        status[table] = { exists: true, columns }
      }
    }
    
    // Get periodos
    const { data: periodos } = await supabase
      .from('nomina_periodos')
      .select('*')
    
    // If all new tables don't exist, return the DDL for manual execution
    const newTables = ['nomina_periodos', 'nomina_detalle', 'nomina_he_recargos', 'nomina_novedades', 'nomina_provisiones', 'nomina_propinas']
    const missingTables = newTables.filter(t => !status[t]?.exists)
    
    if (missingTables.length > 0) {
      return NextResponse.json({
        message: `Faltan tablas: ${missingTables.join(', ')}. Ejecutá el DDL en el Dashboard SQL Editor.`,
        missing_tables: missingTables,
        existing_tables: Object.entries(status).filter(([_, v]: any) => v.exists).map(([k]: any) => k),
        ddl_required: true,
        staff_columns: status.pos_nomina_staff?.columns || [],
        missing_staff_columns: ['salario', 'cargo', 'modalidad', 'sede', 'fecha_ingreso', 'aplica_propinas', 'auxilio_no_salarial']
          .filter(c => !(status.pos_nomina_staff?.columns || []).includes(c)),
      })
    }
    
    // Tables exist - return status
    return NextResponse.json({
      message: 'Todas las tablas existen',
      status,
      periodos,
    })
  } catch (err) {
    console.error('Nomina-DDL error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}