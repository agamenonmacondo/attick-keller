-- 5. Seed staff_aliases (verificados contra docs/ak-staff-verificado-impl.md)
-- Ejecutado en Supabase: 2026-05-28 — 28 aliases insertados
-- NOTA: usa nombre_completo (no nombre) porque la columna se llama nombre_completo en pos_nomina_staff

-- Cocina aliases
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'ESNEIDER', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%esneider%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'NICOLAS', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%nicolas%alfaro%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'IVAN', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%ivan felipe%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'CARLOS', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%carlos steven%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'MAURICIO', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%mauricio%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'LEIDY', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%leidy catalina%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'YOHANA', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%yohana%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'DUSIBETH', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%ducibeth%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'CLARA', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%clara eduvina%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;

-- Barra aliases
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'WALTER', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%walter%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'MELLO', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%walter%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'ASHLEY', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%ashlye%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'MANOLO', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%manuel alejandro%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'YOHAN', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%yohan felipe%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;

-- Servicio aliases
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'VERO', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%veronica%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'LEONARDO', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%leonardo suarez%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'BENJA', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%david benjamin%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'GIO', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%giovanny%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'MARTIN', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%martin fernando%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'EDUARDO', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%yelson eduardo%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'RONALD', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%ronal fernando%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'BRYAN', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%bryan alberto%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'DON MARTIN', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%martin eduardo%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'STEFANIA', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%neidy stefania%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'CAROLINA', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%leanis carolina%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'LESH', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%leshlye%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;

-- Apoyo aliases
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'CRISTINA', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%maria cristina%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;
INSERT INTO staff_aliases (employee_id, alias, source)
SELECT id, 'BETO', 'excel' FROM pos_nomina_staff WHERE nombre_completo ILIKE '%edilberto%' AND sede = 'C75' LIMIT 1
ON CONFLICT (alias, source) DO NOTHING;