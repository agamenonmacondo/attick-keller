-- Performance indexes for POS Dashboard
-- These indexes target the most common query patterns in the pos-dashboard endpoint
-- Run in: https://supabase.com/dashboard/project/pbllaipsdfypelnwrvpy/sql/new

-- Index for date-range queries with cancelled filter (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_pos_sales_opened_at_active
ON pos_sales(opened_at)
WHERE is_cancelled = false;

-- Composite index for zone + date filtering
CREATE INDEX IF NOT EXISTS idx_pos_sales_zone_date
ON pos_sales(derived_zone_name, opened_at)
WHERE is_cancelled = false AND is_paid = true;

-- Index for staff performance queries
CREATE INDEX IF NOT EXISTS idx_pos_sales_staff_date
ON pos_sales(pos_staff_id, opened_at)
WHERE is_cancelled = false;

-- Index for sale_items lookups (N+1 prevention)
CREATE INDEX IF NOT EXISTS idx_pos_sale_items_folio
ON pos_sale_items(pos_folio);

-- Index for product filtering in items
CREATE INDEX IF NOT EXISTS idx_pos_sale_items_product
ON pos_sale_items(pos_product_id);

-- Index for payments lookup by sale
CREATE INDEX IF NOT EXISTS idx_pos_sale_payments_folio
ON pos_sale_payments(pos_folio);

-- Index for products by group (category filtering)
CREATE INDEX IF NOT EXISTS idx_pos_products_group
ON pos_products(pos_group_id);

-- Index for available months query optimization
CREATE INDEX IF NOT EXISTS idx_pos_sales_month_extract
ON pos_sales(opened_at)
WHERE is_paid = true AND is_cancelled = false;
