-- Tabla para deduplicar correos de turnos (sin FK references para evitar errores)
-- Las FK se pueden agregar manualmente despues si es necesario

-- Drop si existe (por si la migracion anterior fallo parcialmente)
DROP TABLE IF EXISTS email_log CASCADE;

CREATE TABLE email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('schedule_published', 'shift_reminder', 'shift_checkout_reminder', 'shift_checkin', 'shift_checkout', 'shift_novedad')),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  schedule_id UUID,
  assignment_id UUID,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'sent',
  error TEXT,
  UNIQUE(type, recipient_email, schedule_id, assignment_id)
);

CREATE INDEX idx_email_log_type_sent ON email_log(type, sent_at);
CREATE INDEX idx_email_log_schedule ON email_log(schedule_id);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage email_log" ON email_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can view email_log" ON email_log FOR SELECT TO authenticated USING (true);