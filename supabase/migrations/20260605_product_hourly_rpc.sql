-- Producto × Hora desglose para Informes Rayo
-- Agrega desglose de ventas por producto, hora y dia

CREATE OR REPLACE FUNCTION pos_dashboard_product_hourly(
  p_from date,
  p_to date,
  p_zone text DEFAULT 'all'
)
RETURNS TABLE(
  product_name text,
  product_id text,
  category_name text,
  date text,
  hour integer,
  quantity bigint,
  revenue bigint
)
LANGUAGE sql STABLE AS $$
  SELECT
    pr.name,
    TRIM(pr.pos_product_id),
    COALESCE(g.name, 'Sin categoria'),
    TO_CHAR(s.opened_at, 'YYYY-MM-DD'),
    EXTRACT(HOUR FROM s.opened_at)::integer,
    SUM(i.quantity)::bigint,
    SUM(i.quantity * i.unit_price)::bigint
  FROM pos_sale_items i
  JOIN pos_sales s ON s.id = i.pos_sale_id
  JOIN pos_products pr ON TRIM(pr.pos_product_id) = TRIM(i.pos_product_id)
  LEFT JOIN pos_product_groups g ON g.pos_group_id = pr.pos_group_id
  WHERE s.is_cancelled = false
    AND s.opened_at >= p_from
    AND s.opened_at < (p_to + interval '1 day')
    AND (p_zone = 'all' OR s.derived_zone_name = p_zone)
  GROUP BY pr.name, TRIM(pr.pos_product_id), g.name, TO_CHAR(s.opened_at, 'YYYY-MM-DD'), EXTRACT(HOUR FROM s.opened_at)
  ORDER BY 7 DESC
$$;
