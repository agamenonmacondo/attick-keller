-- Fix v4: pos_dashboard_hourly — filtrar por día operacional exacto + hora Colombia real + 24 buckets
-- 
-- Problema: la API expande to+1 para capturar la madrugada UTC, pero eso también incluye
-- ventas del día siguiente que NO pertenecen al día operacional consultado.
-- 
-- Solución: filtrar por (opened_at - 9h)::date = p_from. Esto asegura que solo se muestren
-- ventas cuyo día operacional (12PM→4AM Colombia = 5PM→9AM UTC) sea exactamente p_from.
-- La expansión de rango en la API sigue siendo necesaria para que el WHERE no descarte
-- las ventas de madrugada UTC, pero el filtro adicional descarta las del día siguiente.
CREATE OR REPLACE FUNCTION pos_dashboard_hourly(
  p_from date,
  p_to date,
  p_zone text DEFAULT 'all',
  p_category text DEFAULT 'all'
)
RETURNS TABLE(
  hour integer,
  revenue bigint,
  cheques bigint,
  tip_total bigint,
  card_paid_total bigint,
  cash_paid_total bigint
)
LANGUAGE sql STABLE AS $$
  WITH sales_data AS (
    SELECT
      EXTRACT(HOUR FROM (s.opened_at - interval '5 hours'))::integer AS local_hour,
      s.total,
      s.tip_amount,
      s.card_paid,
      s.cash_paid
    FROM pos_sales s
    WHERE s.is_cancelled = false
      AND s.opened_at >= p_from
      AND s.opened_at < (p_to + interval '1 day')
      AND (s.opened_at - interval '9 hours')::date = p_from
      AND (p_zone = 'all' OR s.derived_zone_name = p_zone)
      AND (
        p_category = 'all'
        OR s.id IN (
          SELECT DISTINCT i.pos_sale_id
          FROM pos_sale_items i
          JOIN pos_products p2 ON TRIM(p2.pos_product_id) = TRIM(i.pos_product_id)
          WHERE p2.pos_group_id = p_category
        )
      )
  ),
  all_hours AS (
    SELECT generate_series(0, 23) AS local_hour
  )
  SELECT
    ah.local_hour::integer AS hour,
    COALESCE(SUM(sd.total), 0)::bigint AS revenue,
    COUNT(sd.total)::bigint AS cheques,
    COALESCE(SUM(sd.tip_amount), 0)::bigint AS tip_total,
    COALESCE(SUM(sd.card_paid), 0)::bigint AS card_paid_total,
    COALESCE(SUM(sd.cash_paid), 0)::bigint AS cash_paid_total
  FROM all_hours ah
  LEFT JOIN sales_data sd ON sd.local_hour = ah.local_hour
  GROUP BY ah.local_hour
  ORDER BY ah.local_hour
$$;
