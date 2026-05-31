-- Migration 010: Extend customer_stats for CSV import analytics
-- Adds no_show tracking, party size, marketing opt-in, blacklist, and raw import fields

-- ============================================================
-- 1. Add new columns to customer_stats
-- ============================================================

ALTER TABLE customer_stats
  ADD COLUMN IF NOT EXISTS no_show_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancellations INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_party_size INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_party_size NUMERIC(4,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sex VARCHAR(10),
  ADD COLUMN IF NOT EXISTS tipo_cliente_original VARCHAR(50),
  ADD COLUMN IF NOT EXISTS allergies TEXT,
  ADD COLUMN IF NOT EXISTS blacklisted BOOLEAN DEFAULT false;

-- ============================================================
-- 2. Add new columns to customers
-- ============================================================

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS birthday DATE,
  ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- ============================================================
-- 3. Create indexes for dashboard queries
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_customer_stats_loyalty_tier
  ON customer_stats (loyalty_tier);

CREATE INDEX IF NOT EXISTS idx_customer_stats_is_recurring
  ON customer_stats (is_recurring);

CREATE INDEX IF NOT EXISTS idx_customer_stats_no_show_count
  ON customer_stats (no_show_count)
  WHERE no_show_count > 0;

CREATE INDEX IF NOT EXISTS idx_customer_stats_last_visit
  ON customer_stats (last_visit_date);

CREATE INDEX IF NOT EXISTS idx_customer_stats_total_visits
  ON customer_stats (total_visits);

CREATE INDEX IF NOT EXISTS idx_customer_stats_marketing
  ON customer_stats (marketing_opt_in)
  WHERE marketing_opt_in = true;

CREATE INDEX IF NOT EXISTS idx_customers_phone
  ON customers (phone)
  WHERE phone IS NOT NULL;

-- ============================================================
-- 4. Add comments for documentation
-- ============================================================

COMMENT ON COLUMN customer_stats.no_show_count IS 'Number of no-show reservations';
COMMENT ON COLUMN customer_stats.cancellations IS 'Number of cancelled reservations';
COMMENT ON COLUMN customer_stats.total_party_size IS 'Total people across all reservations';
COMMENT ON COLUMN customer_stats.avg_party_size IS 'Average party size per reservation';
COMMENT ON COLUMN customer_stats.marketing_opt_in IS 'Customer agreed to receive marketing';
COMMENT ON COLUMN customer_stats.sex IS 'Gender from POS: Hombre/Mujer';
COMMENT ON COLUMN customer_stats.tipo_cliente_original IS 'Original customer type from POS import';
COMMENT ON COLUMN customer_stats.allergies IS 'Allergy notes from POS';
COMMENT ON COLUMN customer_stats.blacklisted IS 'Customer is on blacklist';
COMMENT ON COLUMN customers.birthday IS 'Birthday date from POS';
COMMENT ON COLUMN customers.points IS 'Loyalty points from POS';