-- Tabla para deduplicar correos de turnos
CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('schedule_published', 'shift_reminder', 'shift_checkout_reminder')),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  schedule_id UUID REFERENCES shift_schedules(id),
  assignment_id UUID REFERENCES shift_assignments(id),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'sent',
  error TEXT,
  UNIQUE(type, recipient_email, schedule_id, assignment_id)
);

-- Indices para busqueda rapida
CREATE INDEX IF NOT EXISTS idx_email_log_type_sent ON email_log(type, sent_at);
CREATE INDEX IF NOT EXISTS idx_email_log_schedule ON email_log(schedule_id);

-- RLS: service role puede todo, authenticated solo lectura
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage email_log" ON email_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can view email_log" ON email_log FOR SELECT TO authenticated USING (true);