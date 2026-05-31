-- 4. Asignar areas al personal de C75 basado en cargo existente
-- Ejecutado en Supabase: 2026-05-28
-- Resultado: 36 asignados (11 cocina + 7 barra + 13 servicio + 5 apoyo), 2 sin cargo requieren decision manual

-- Cocina (11)
UPDATE pos_nomina_staff SET area = 'cocina'
WHERE sede = 'C75' AND (
  cargo ILIKE '%jefe%cocina%'
  OR cargo ILIKE '%aux%cocina%'
  OR cargo ILIKE '%steward%'
  OR cargo ILIKE '%pizzero%'
  OR nombre_completo ILIKE '%esneider%'
  OR nombre_completo ILIKE '%nicolas alfaro%'
);

-- Barra (7)
UPDATE pos_nomina_staff SET area = 'barra'
WHERE sede = 'C75' AND (
  cargo ILIKE '%jefe%bar%'
  OR cargo ILIKE '%bartender%'
  OR cargo ILIKE '%aux%bar%'
  OR nombre_completo ILIKE '%walter%'
  OR nombre_completo ILIKE '%ashlye%'
);

-- Servicio (13)
UPDATE pos_nomina_staff SET area = 'servicio'
WHERE sede = 'C75' AND (
  cargo ILIKE '%jefe%servicio%'
  OR cargo ILIKE '%sub jefe%'
  OR cargo ILIKE '%meser%'
  OR cargo ILIKE '%cajer%'
  OR cargo ILIKE '%host%'
  OR nombre_completo ILIKE '%veronica%'
  OR nombre_completo ILIKE '%leonardo%'
);

-- Apoyo (5)
UPDATE pos_nomina_staff SET area = 'apoyo'
WHERE sede = 'C75' AND (
  cargo ILIKE '%servicios generales%'
  OR cargo ILIKE '%ingeniero%'
  OR cargo ILIKE '%asesor%ventas%'
  OR cargo ILIKE '%pasante%admin%'
  OR nombre_completo ILIKE '%cristina%'
  OR nombre_completo ILIKE '%edilberto%'
  OR nombre_completo ILIKE '%nathalia%'
  OR nombre_completo ILIKE '%sofia%perez%'
);

-- Cross-training
UPDATE pos_nomina_staff SET secondary_areas = ARRAY['servicio', 'barra']
WHERE sede = 'C75' AND nombre_completo ILIKE '%ashlye%';
UPDATE pos_nomina_staff SET secondary_areas = ARRAY['cocina', 'servicio']
WHERE sede = 'C75' AND nombre_completo ILIKE '%leonardo%';

-- NOTA: Los siguientes 2 registros quedaron SIN area (no tienen cargo definido):
-- LEANIS CAROLINA AULAR BRANCHO (cargo NULL)
-- OMAR DAVID RICO CABRA (cargo NULL)
-- Alejandro debe asignarles area manualmente.