-- Fix: add operational day filter to ALL RPCs that query pos_sales
-- The filter (opened_at - interval '9 hours')::date = p_from ensures that
-- when the API expands p_to +1 day to capture late-night UTC sales,
-- ONLY sales belonging to the requested operational day (12PM→4AM Colombia)
-- are included — not sales from the next morning that spill into the UTC range.
--
-- RPCs fixed:
--   1. pos_dashboard_kpis         — was missing → revenue inflated by ~$3.9M
--   2. pos_dashboard_daily        — was grouping by op day but returning extra rows
--   3. pos_dashboard_staff        — was including next-day staff
--   4. pos_dashboard_payments     — was including next-day payments
--   5. pos_dashboard_by_zone      — was including next-day zones
--   6. pos_dashboard_client_split — was including next-day clients
--   7. pos_dashboard_payments_by_zone — was including next-day zone payments
--
-- Already correct (not modified here):
--   pos_dashboard_hourly   ✅ (fixed in v3 migration)
--   pos_dashboard_months   ✅ (just lists available months, no p_from filter needed)

-- 1. KPIs
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

-- 2. Daily Trend (already groups by op day, but adding explicit filter)
CREATE OR REPLACE FUNCTION pos_dashboard_daily(
  p_from date,
  p_to date,
  p_zone text DEFAULT 'all',
  p_category text DEFAULT 'all',
  p_is_paid_only boolean DEFAULT false
)
RETURNS TABLE(
  date text,
  revenue bigint,
  cheques bigint,
  propina bigint,
  personas bigint
)
LANGUAGE sql STABLE AS $$
  SELECT
    TO_CHAR(s.opened_at - interval '9 hours', 'YYYY-MM-DD'),
    COALESCE(SUM(s.total), 0)::bigint,
    COUNT(*)::bigint,
    COALESCE(SUM(s.tip_amount), 0)::bigint,
    COALESCE(SUM(s.party_size), 0)::bigint
  FROM pos_sales s
  WHERE s.is_cancelled = false
    AND (p_is_paid_only = false OR s.is_paid = true)
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
  GROUP BY TO_CHAR(s.opened_at - interval '9 hours', 'YYYY-MM-DD')
  ORDER BY 1
$$;

-- 3. Staff
CREATE OR REPLACE FUNCTION pos_dashboard_staff(
  p_from date,
  p_to date,
  p_zone text DEFAULT 'all',
  p_category text DEFAULT 'all'
)
RETURNS TABLE(
  staff_id integer,
  staff_name text,
  staff_type integer,
  cheques bigint,
  revenue bigint,
  tip_total bigint,
  ticket_promedio bigint
)
LANGUAGE sql STABLE AS $$
  SELECT
    s.pos_staff_id,
    COALESCE(st.name, 'Desconocido'),
    COALESCE(st.staff_type, 0)::integer,
    COUNT(*)::bigint,
    COALESCE(SUM(s.total), 0)::bigint,
    COALESCE(SUM(s.tip_amount), 0)::bigint,
    COALESCE(ROUND(AVG(s.total)), 0)::bigint
  FROM pos_sales s
  LEFT JOIN pos_staff st ON st.pos_staff_id = s.pos_staff_id
  WHERE s.is_cancelled = false
    AND s.opened_at >= p_from
    AND s.opened_at < (p_to + interval '1 day')
    AND (s.opened_at - interval '9 hours')::date = p_from
    AND s.pos_staff_id IS NOT NULL
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
  GROUP BY s.pos_staff_id, st.name, st.staff_type
  ORDER BY 5 DESC
$$;

-- 4. Payments
CREATE OR REPLACE FUNCTION pos_dashboard_payments(
  p_from date,
  p_to date,
  p_zone text DEFAULT 'all',
  p_category text DEFAULT 'all'
)
RETURNS TABLE(
  method text,
  amount bigint,
  count bigint,
  pct integer
)
LANGUAGE sql STABLE AS $$
  WITH totals AS (
    SELECT COALESCE(m.name, 'Otro') AS method_name,
      SUM(pay.amount)::bigint AS method_amount,
      COUNT(*)::bigint AS method_count
    FROM pos_sale_payments pay
    JOIN pos_sales s ON s.id = pay.pos_sale_id
    LEFT JOIN pos_payment_methods m ON m.pos_payment_method_id = pay.pos_payment_method_id
    WHERE s.is_cancelled = false
      AND s.opened_at >= p_from AND s.opened_at < (p_to + interval '1 day')
      AND (s.opened_at - interval '9 hours')::date = p_from
      AND (p_zone = 'all' OR s.derived_zone_name = p_zone)
      AND (p_category = 'all' OR s.id IN (
        SELECT DISTINCT i.pos_sale_id FROM pos_sale_items i
        JOIN pos_products p ON TRIM(p.pos_product_id) = TRIM(i.pos_product_id)
        WHERE p.pos_group_id = p_category
      ))
    GROUP BY m.name
  ),
  grand AS (SELECT SUM(method_amount) AS total FROM totals)
  SELECT t.method_name, t.method_amount, t.method_count,
    CASE WHEN g.total > 0 THEN ROUND(t.method_amount::numeric / g.total * 100) ELSE 0 END::integer
  FROM totals t, grand g ORDER BY 2 DESC
$$;

-- 5. By Zone
CREATE OR REPLACE FUNCTION pos_dashboard_by_zone(
  p_from date,
  p_to date,
  p_zone text DEFAULT 'all',
  p_category text DEFAULT 'all'
)
RETURNS TABLE(
  zone text,
  revenue bigint,
  cheques bigint,
  tip_total bigint,
  avg_service_time_min integer
)
LANGUAGE sql STABLE AS $$
  SELECT
    COALESCE(s.derived_zone_name, 'Desconocido'),
    COALESCE(SUM(s.total), 0)::bigint,
    COUNT(*)::bigint,
    COALESCE(SUM(s.tip_amount), 0)::bigint,
    COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (s.closed_at - s.opened_at)) / 60)::numeric), 0)::integer
  FROM pos_sales s
  WHERE s.is_cancelled = false
    AND s.opened_at >= p_from AND s.opened_at < (p_to + interval '1 day')
    AND (s.opened_at - interval '9 hours')::date = p_from
    AND (p_zone = 'all' OR s.derived_zone_name = p_zone)
    AND (p_category = 'all' OR s.id IN (
      SELECT DISTINCT i.pos_sale_id FROM pos_sale_items i
      JOIN pos_products p ON TRIM(p.pos_product_id) = TRIM(i.pos_product_id)
      WHERE p.pos_group_id = p_category
    ))
  GROUP BY COALESCE(s.derived_zone_name, 'Desconocido')
  ORDER BY 2 DESC
$$;

-- 6. Client Split
CREATE OR REPLACE FUNCTION pos_dashboard_client_split(
  p_from date,
  p_to date,
  p_zone text DEFAULT 'all',
  p_category text DEFAULT 'all'
)
RETURNS TABLE(
  consumer_type text,
  cheques bigint,
  revenue bigint
)
LANGUAGE sql STABLE AS $$
  SELECT
    CASE WHEN s.customer_id IS NOT NULL OR s.pos_customer_id IS NOT NULL
      THEN 'identificados' ELSE 'consumidor_final' END,
    COUNT(*)::bigint,
    COALESCE(SUM(s.total), 0)::bigint
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
  GROUP BY 1
$$;

-- 7. Payments by Zone
CREATE OR REPLACE FUNCTION pos_dashboard_payments_by_zone(
  p_from date,
  p_to date,
  p_zone text DEFAULT 'all',
  p_category text DEFAULT 'all'
)
RETURNS TABLE(
  zone text,
  method text,
  amount bigint,
  count bigint
)
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(s.derived_zone_name, 'Desconocido'),
    COALESCE(m.name, 'Otro'),
    SUM(pay.amount)::bigint,
    COUNT(*)::bigint
  FROM pos_sale_payments pay
  JOIN pos_sales s ON s.id = pay.pos_sale_id
  LEFT JOIN pos_payment_methods m ON m.pos_payment_method_id = pay.pos_payment_method_id
  WHERE s.is_cancelled = false
    AND s.opened_at >= p_from AND s.opened_at < (p_to + interval '1 day')
    AND (s.opened_at - interval '9 hours')::date = p_from
    AND (p_zone = 'all' OR s.derived_zone_name = p_zone)
    AND (p_category = 'all' OR s.id IN (
      SELECT DISTINCT i.pos_sale_id FROM pos_sale_items i
      JOIN pos_products p ON TRIM(p.pos_product_id) = TRIM(i.pos_product_id)
      WHERE p.pos_group_id = p_category
    ))
  GROUP BY COALESCE(s.derived_zone_name, 'Desconocido'), m.name
  ORDER BY 1, 3 DESC
$$;
