-- =====================================================================
-- FASE 1 — Migración pos_nomina_staff: líderes y costo fijo
-- Ejecutar en el SQL Editor de Supabase (dashboard). Idempotente.
-- Restaurant: Attick & Keller (sede C75)
-- =====================================================================

-- 1.1 ALTER TABLE: nuevas columnas
ALTER TABLE pos_nomina_staff ADD COLUMN IF NOT EXISTS is_fixed_cost BOOLEAN DEFAULT false;
ALTER TABLE pos_nomina_staff ADD COLUMN IF NOT EXISTS costo_fijo_mensual NUMERIC(15,2) DEFAULT 0;
ALTER TABLE pos_nomina_staff ADD COLUMN IF NOT EXISTS is_leader BOOLEAN DEFAULT false;
ALTER TABLE pos_nomina_staff ADD COLUMN IF NOT EXISTS rubro TEXT;

-- 1.2 Seed de los 3 líderes identificados
-- Mello (Walter Villamoros): JEFE DE BAR, barra, $3M/mes, SIN turnos → costo fijo
--   costo_fijo_mensual = calcularCostoEmpresa(3000000).costoMensualTotal = 4,555,560
--   (factor empresa 1.5185: salario + prestaciones + aportes patronales, sin auxilio transporte
--    porque 3M > 2×SMMLV 2,847,000)
UPDATE pos_nomina_staff
SET is_fixed_cost = true,
    costo_fijo_mensual = 4555560,
    is_leader = true,
    rubro = 'barra'
WHERE nombre_completo ILIKE '%walter%villamoros%';

-- Verónica Medina: JEFE DE SERVICIO, servicio, $2.75M/mes, CON turnos → líder sin costo fijo
UPDATE pos_nomina_staff
SET is_leader = true,
    rubro = 'servicio'
WHERE nombre_completo ILIKE '%verónica medina%';

-- Esneider Blanco: JEFE DE COCINA, cocina, $2.5M/mes, CON turnos → líder sin costo fijo
UPDATE pos_nomina_staff
SET is_leader = true,
    rubro = 'cocina'
WHERE nombre_completo ILIKE '%esneider%blanco%';

-- Verificación (ejecutar y revisar que marque 3 filas)
SELECT nombre_completo, is_fixed_cost, costo_fijo_mensual, is_leader, rubro
FROM pos_nomina_staff
WHERE is_leader = true
ORDER BY rubro;