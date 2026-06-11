-- Add seated_at column to track when a guest was seated
-- Used by the host panel timer feature
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS seated_at TIMESTAMPTZ;

-- Set seated_at for currently seated reservations based on their log entries
-- This backfills existing seated reservations with the timestamp from reservation_logs
UPDATE reservations r
SET seated_at = rl.created_at
FROM reservation_logs rl
WHERE r.status = 'seated'
  AND rl.reservation_id = r.id
  AND rl.action = 'seated'
  AND rl.field_name = 'status'
  AND r.seated_at IS NULL;