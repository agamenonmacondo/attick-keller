-- POS Dashboard RPC functions
-- Replace JS-side aggregation with database-side computation.
-- Category filtering (p_category) is optional on all sales-scoped functions.

-- 1. Dashboard KPIs
CREATE OR REPLACE FUNCTION pos_dashboard_kpis(
  p_from date,
  p_to date,
  p_zone text DEFAULT 'all',
  p_category text DEFAULT 'all'
)
RETURNS TABLE(
  revenue bigint,
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

-- 2. Revenue by Zone
CREATE OR REPLACE FUNCTION pos_dashboard_by_zone(
  p_from date,
  p_to date,
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
    COALESCE(ROUND(AVG(
      EXTRACT(EPOCH FROM (s.closed_at - s.opened_at)) / 60
    )::numeric), 0)::integer
  FROM pos_sales s
  WHERE s.is_cancelled = false
    AND s.opened_at >= p_from
    AND s.opened_at < (p_to + interval '1 day')
    AND (
      p_category = 'all'
      OR s.id IN (
        SELECT DISTINCT i.pos_sale_id
        FROM pos_sale_items i
        JOIN pos_products p ON TRIM(p.pos_product_id) = TRIM(i.pos_product_id)
        WHERE p.pos_group_id = p_category
      )
    )
  GROUP BY COALESCE(s.derived_zone_name, 'Desconocido')
  ORDER BY 2 DESC
$$;

-- 3. Hourly Revenue
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
  SELECT
    EXTRACT(HOUR FROM s.opened_at)::integer,
    COALESCE(SUM(s.total), 0)::bigint,
    COUNT(*)::bigint,
    COALESCE(SUM(s.tip_amount), 0)::bigint,
    COALESCE(SUM(s.card_paid), 0)::bigint,
    COALESCE(SUM(s.cash_paid), 0)::bigint
  FROM pos_sales s
  WHERE s.is_cancelled = false
    AND s.opened_at >= p_from
    AND s.opened_at < (p_to + interval '1 day')
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
  GROUP BY EXTRACT(HOUR FROM s.opened_at)
  ORDER BY 1
$$;

-- 4. Daily Trend
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
    TO_CHAR(s.opened_at, 'YYYY-MM-DD'),
    COALESCE(SUM(s.total), 0)::bigint,
    COUNT(*)::bigint,
    COALESCE(SUM(s.tip_amount), 0)::bigint,
    COALESCE(SUM(s.party_size), 0)::bigint
  FROM pos_sales s
  WHERE s.is_cancelled = false
    AND (p_is_paid_only = false OR s.is_paid = true)
    AND s.opened_at >= p_from
    AND s.opened_at < (p_to + interval '1 day')
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
  GROUP BY TO_CHAR(s.opened_at, 'YYYY-MM-DD')
  ORDER BY 1
$$;

-- 5. Top Products (items-based, joined with products/groups for names)
CREATE OR REPLACE FUNCTION pos_dashboard_top_products(
  p_from date,
  p_to date,
  p_limit integer DEFAULT 15
)
RETURNS TABLE(
  product_id text,
  product_name text,
  category_id text,
  category_name text,
  quantity bigint,
  revenue bigint
)
LANGUAGE sql STABLE AS $$
  SELECT
    TRIM(i.pos_product_id),
    COALESCE(pr.name, 'Sin nombre'),
    COALESCE(pr.pos_group_id, ''),
    COALESCE(g.name, 'Sin categoria'),
    SUM(i.quantity)::bigint,
    SUM(i.quantity * i.unit_price)::bigint
  FROM pos_sale_items i
  JOIN pos_sales s ON s.id = i.pos_sale_id
  JOIN pos_products pr ON TRIM(pr.pos_product_id) = TRIM(i.pos_product_id)
  LEFT JOIN pos_product_groups g ON g.pos_group_id = pr.pos_group_id
  WHERE s.is_cancelled = false
    AND s.opened_at >= p_from
    AND s.opened_at < (p_to + interval '1 day')
  GROUP BY TRIM(i.pos_product_id), pr.name, pr.pos_group_id, g.name
  ORDER BY 6 DESC
  LIMIT p_limit
$$;

-- 6. Staff Performance
CREATE OR REPLACE FUNCTION pos_dashboard_staff(
  p_from date,
  p_to date,
  p_zone text DEFAULT 'all',
  p_category text DEFAULT 'all'
)
RETURNS TABLE(
  staff_id text,
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

-- 7. Payment Methods
CREATE OR REPLACE FUNCTION pos_dashboard_payments(
  p_from date,
  p_to date,
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
    SELECT
      COALESCE(m.name, 'Otro') AS method_name,
      SUM(pay.amount)::bigint AS method_amount,
      COUNT(*)::bigint AS method_count
    FROM pos_sale_payments pay
    JOIN pos_sales s ON s.id = pay.pos_sale_id
    LEFT JOIN pos_payment_methods m ON m.pos_payment_method_id = pay.pos_payment_method_id
    WHERE s.is_cancelled = false
      AND s.opened_at >= p_from
      AND s.opened_at < (p_to + interval '1 day')
      AND (
        p_category = 'all'
        OR s.id IN (
          SELECT DISTINCT i.pos_sale_id
          FROM pos_sale_items i
          JOIN pos_products p ON TRIM(p.pos_product_id) = TRIM(i.pos_product_id)
          WHERE p.pos_group_id = p_category
        )
      )
    GROUP BY m.name
  ),
  grand AS (
    SELECT SUM(method_amount) AS total FROM totals
  )
  SELECT
    t.method_name,
    t.method_amount,
    t.method_count,
    CASE WHEN g.total > 0 THEN ROUND(t.method_amount::numeric / g.total * 100) ELSE 0 END::integer
  FROM totals t, grand g
  ORDER BY 2 DESC
$$;

-- 8. Client Split (identificados vs consumidor_final)
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

-- 9. Available Months (for period selector)
CREATE OR REPLACE FUNCTION pos_dashboard_months()
RETURNS TABLE(month text)
LANGUAGE sql STABLE AS $$
  SELECT DISTINCT TO_CHAR(opened_at, 'YYYY-MM')
  FROM pos_sales
  WHERE is_cancelled = false AND is_paid = true
  ORDER BY 1
$$;

-- 10. Payments by Zone (for byZonePayment)
CREATE OR REPLACE FUNCTION pos_dashboard_payments_by_zone(
  p_from date,
  p_to date,
  p_category text DEFAULT 'all'
)
RETURNS TABLE(
  zone text,
  method text,
  amount bigint,
  count bigint
)
LANGUAGE sql STABLE AS $$
  SELECT
    COALESCE(s.derived_zone_name, 'Desconocido'),
    COALESCE(m.name, 'Otro'),
    SUM(pay.amount)::bigint,
    COUNT(*)::bigint
  FROM pos_sale_payments pay
  JOIN pos_sales s ON s.id = pay.pos_sale_id
  LEFT JOIN pos_payment_methods m ON m.pos_payment_method_id = pay.pos_payment_method_id
  WHERE s.is_cancelled = false
    AND s.opened_at >= p_from
    AND s.opened_at < (p_to + interval '1 day')
    AND (
      p_category = 'all'
      OR s.id IN (
        SELECT DISTINCT i.pos_sale_id
        FROM pos_sale_items i
        JOIN pos_products p ON TRIM(p.pos_product_id) = TRIM(i.pos_product_id)
        WHERE p.pos_group_id = p_category
      )
    )
  GROUP BY COALESCE(s.derived_zone_name, 'Desconocido'), m.name
  ORDER BY 1, 3 DESC
$$;
