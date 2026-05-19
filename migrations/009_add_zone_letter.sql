-- Migration 009: Add `letter` column to `table_zones`
--
-- The table assignment algorithm relies on zone letters (A–E) but the
-- `letter` column was missing from the `table_zones` table, causing
-- Supabase to return a 42703 error on any query that selects it.
-- This left reservations with NULL table_id.

-- 1. Add the column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'table_zones' AND column_name = 'letter'
  ) THEN
    ALTER TABLE table_zones ADD COLUMN letter character varying(1);
  END IF;
END
$$;

-- 2. Populate letter based on zone name
UPDATE table_zones SET letter = 'A' WHERE letter IS NULL AND name ILIKE 'Taller';
UPDATE table_zones SET letter = 'B' WHERE letter IS NULL AND name ILIKE 'Tipi';
UPDATE table_zones SET letter = 'C' WHERE letter IS NULL AND name ILIKE 'Jardín';
UPDATE table_zones SET letter = 'C' WHERE letter IS NULL AND name ILIKE 'Jardin';
UPDATE table_zones SET letter = 'D' WHERE letter IS NULL AND name ILIKE 'Chispas';
UPDATE table_zones SET letter = 'E' WHERE letter IS NULL AND name ILIKE 'Ático';
UPDATE table_zones SET letter = 'E' WHERE letter IS NULL AND name ILIKE 'Atico';
UPDATE table_zones SET letter = 'E' WHERE letter IS NULL AND name ILIKE 'Attic';