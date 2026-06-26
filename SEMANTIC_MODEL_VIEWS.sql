-- Modelo Semántico A&K - 7 Materialized Views
-- Creadas junio 2026 en Supabase
-- Estas views ya existen en la BD. Solo consultar con SELECT * FROM view_name.

-- 1. v_revenue_vs_turnos_hora (refresh 15min)
-- Campos: fecha, hora, dia_semana, revenue, personas_en_turno, costo_turnos, revenue_por_persona, estado (PICO/GAP/SOBRANDO)

-- 2. v_horas_extra (refresh diario)
-- Campos: fecha, pos_staff_id, nombre, area, horas_extra, costo_extra, recargo_pct, tipo_recargo (25%/75%/100%)

-- 3. v_horas_nocturnas (refresh diario)
-- Campos: fecha, area, pos_staff_id, nombre, horas_ordinarias, horas_nocturnas, pct_nocturno, recargo_nocturno

-- 4. v_productividad_area (refresh diario)
-- Campos: fecha, area, revenue, horas_turno, costo_turnos, revenue_por_hora, costo_por_hora, roi

-- 5. v_nomina_vs_ventas (refresh diario)
-- Campos: fecha, nomina_total, ventas_total, ratio_pct, estado (EFICIENTE/ATENCION/CRITICO)

-- 6. v_gaps_cobertura (refresh 15min)
-- Campos: fecha, hora, area, personas_en_turno, revenue, revenue_por_persona, tipo_alerta (GAP_COCINA/SOBRA/DESFASE/NORMAL)

-- 7. v_reservas_vs_ventas (refresh diario)
-- Campos: fecha, num_reservas, total_pax, evento_grande, revenue, staff_asignado, revenue_por_persona