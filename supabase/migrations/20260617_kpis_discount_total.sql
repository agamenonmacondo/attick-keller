-- Add discount_total to pos_dashboard_kpis
-- Returns SUM of discount_amount for the period
-- Also saved in web/supabase/migrations/

DROP FUNCTION IF EXISTS pos_dashboard_kpis(date, date, text, text);

CREATE OR REPLACE FUNCTION pos_dashboard_kpis(
  p_from date,
  p_to date,
  p_zone text DEFAULT 'all',
  p_category text DEFAULT 'all'
)
RETURNS TABLE(
  revenue bigint,
  subtotal bigint,
  tax_total bigint,
  discount_total bigint,
  cheques bigint,
  tip_total bigint,
  party_size_total bigint,
  card_paid_total bigint,
  cash_paid_total bigint,
  avg_service_time_min integer,
  ticket_promedio bigint,
  tip_promedio bigint,
  party_size_promedio numeric
)
LANGUAGE sql STABLE AS $$
  SELECT
    COALESCE(SUM(s.total), 0)::bigint,
    COALESCE(SUM(s.subtotal), 0)::bigint,
    COALESCE(SUM(s.tax_amount), 0)::bigint,
    COALESCE(SUM(s.discount_amount), 0)::bigint,
    COUNT(*)::bigint,
    COALESCE(SUM(s.tip_amount), 0)::bigint,
    COALESCE(SUM(s.party_size), 0)::bigint,
    COALESCE(SUM(s.card_paid), 0)::bigint,
    COALESCE(SUM(s.cash_paid), 0)::bigint,
    COALESCE(ROUND(AVG(
      EXTRACT(EPOCH FROM (s.closed_at - s.opened_at)) / 60
    )::numeric), 0)::integer,
    COALESCE(ROUND(AVG(s.total)), 0)::bigint,
    COALESCE(ROUND(AVG(s.tip_amount)), 0)::bigint,
    ROUND(COALESCE(AVG(s.party_size), 0), 1)
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
        JOIN pos_products p ON TRIM(p.pos_product_id) = TRIM(i.pos_product_id)
        WHERE p.pos_group_id = p_category
      )
    )
$$;