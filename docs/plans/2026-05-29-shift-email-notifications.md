# Sistema de Notificaciones por Email — Turnos (Resend)

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Enviar 3 tipos de correo a colaboradores: (1) cronograma publicado, (2) recordatorio 2h antes del turno, (3) recordatorio de checkout 30min después de la hora de salida.

**Architecture:** Reutiliza el patrón existente de Resend (`lib/email/send.ts`) con HTML inline y branding A&K. Correo 1 se envía inline al publicar. Correos 2 y 3 se envían via cron endpoint que consulta Supabase para encontrar turnos próximos/sin checkout, con deduplicación via tabla `email_log`.

**Tech Stack:** Next.js API routes, Resend API (fetch directo), Supabase, Vercel Cron (o Hermes cron)

**Zona horaria:** Colombia (America/Bogota, UTC-5). Todos los cálculos de "2 horas antes" y "30 minutos después" usan hora Colombia.

---

## Contexto del Proyecto

### Tablas relevantes en Supabase

```
shift_schedules (id, restaurant_id, area, week_str, status, version, created_by, ...)
shift_assignments (id, schedule_id, employee_id, day_index, shift_code, entrada, salida, novedad, checkin_at, checkout_at, ...)
shift_types (id, code, name, area, entrada, salida, ordinarias, nocturnas, ...)
pos_nomina_staff (id, nombre_completo, cargo, area, correo, alias, ...)
user_roles (id, auth_user_id, restaurant_id, role, is_active, pos_nomina_staff_id, area)
staff_aliases (id, employee_id, alias, source)
```

**Nota:** `pos_nomina_staff` tiene columna `correo` (añadida en migration 006). Los `user_roles` con `pos_nomina_staff_id` vinculan la cuenta auth con el empleado de nómina. El email del auth user también puede obtenerse via `sb.auth.admin.listUsers()`.

### Email existente

- **Remitente:** `Attick & Keller <ventas@ccs724.com>`
- **API Key:** `process.env.RESEND_API_KEY`
- **Patrón:** fetch directo a `https://api.resend.com/emails`, HTML inline con branding A&K (borgona `#6B2737`, dorado `#C9A94E`, Playfair Display)

### day_index mapping

```
0=Domingo, 1=Lunes, 2=Martes, 3=Miercoles, 4=Jueves, 5=Viernes, 6=Sabado
```

### week_str formato

```
ISO week: "2026-W22"
getWeekStr(date) en lib/utils/costCalculator.ts calcula correctamente
getWeekDates(weekStr) retorna [Lun, Mar, Mie, Jue, Vie, Sab, Dom]
```

---

## Plan

### Task 1: Crear tabla `email_log` en Supabase

**Objective:** Tabla para deduplicar correos y evitar re-envíos.

**Files:**
- Create: `web/supabase/migrations/20260529_001_email_log.sql`

**Step 1: Escribir la migration SQL**

```sql
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

-- Indice para buscar rapidamente
CREATE INDEX IF NOT EXISTS idx_email_log_type_sent ON email_log(type, sent_at);
CREATE INDEX IF NOT EXISTS idx_email_log_schedule ON email_log(schedule_id);

-- RLS: service role puede todo, authenticated solo lectura
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage email_log" ON email_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can view email_log" ON email_log FOR SELECT TO authenticated USING (true);
```

**Step 2: Ejecutar en Supabase dashboard** (Ale lo hace manual)

**Step 3: Commit**

```bash
git add web/supabase/migrations/20260529_001_email_log.sql
git commit -m "feat: add email_log table for shift notifications dedup"
```

---

### Task 2: Función helper `sendShiftEmails()` en `send.ts`

**Objective:** Wrapper reutilizable para enviar los 3 tipos de correo de turnos, con logging en `email_log`.

**Files:**
- Modify: `web/src/lib/email/send.ts`

**Step 1: Añadir las 3 plantillas HTML y la función principal**

Añadir al final de `send.ts` (después de `sendCampaignEmailBatch`):

```typescript
// ================================================================
// Shift Notification Emails (cronograma publicado, recordatorio, checkout)
// ================================================================

const SHIFTS_FROM = 'Attick & Keller <turnos@ccs724.com>'

interface ShiftScheduleData {
  weekStr: string        // "2026-W22"
  area: string           // "cocina" | "barra" | "servicio"
  areaLabel: string      // "Cocina" | "Barra" | "Servicio"
  assignments: {
    dayName: string      // "Lun", "Mar", etc.
    date: string         // "26 may"
    shiftCode: string    // "G", "B1", etc.
    shiftName: string    // "Garzon", "Barra 1", etc.
    entrada: string      // "06:00"
    salida: string       // "14:00"
    hours: number        // 8
  }[]
}

function buildShiftScheduleHtml(data: ShiftScheduleData, employeeName: string): string {
  const rows = data.assignments.map(a =>
    '<tr>' +
      '<td style="padding:10px 16px;border-bottom:1px solid #EFEBE9;color:#3E2723;font-size:14px;font-weight:600;">' + a.dayName + ' ' + a.date + '</td>' +
      '<td style="padding:10px 16px;border-bottom:1px solid #EFEBE9;color:#3E2723;font-size:14px;">' + a.shiftCode + '</td>' +
      '<td style="padding:10px 16px;border-bottom:1px solid #EFEBE9;color:#3E2723;font-size:14px;">' + a.shiftName + '</td>' +
      '<td style="padding:10px 16px;border-bottom:1px solid #EFEBE9;color:#3E2723;font-size:14px;">' + a.entrada + ' - ' + a.salida + '</td>' +
      '<td style="padding:10px 16px;border-bottom:1px solid #EFEBE9;color:#8D6E63;font-size:14px;text-align:right;">' + a.hours + 'h</td>' +
    '</tr>'
  ).join('')

  const areaColors: Record<string, string> = {
    cocina: '#6B2737',
    barra: '#D4A843',
    servicio: '#22c55e',
  }
  const accentColor = areaColors[data.area] || '#6B2737'

  return '<!DOCTYPE html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>\n' +
    '<body style="margin:0;padding:0;background:#F5EDE0;font-family:\'DM Sans\',Arial,sans-serif;">\n' +
    '  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;margin-top:40px;margin-bottom:40px;">\n' +
    '    <tr><td style="background:#3E2723;padding:32px 40px;text-align:center;">\n' +
    '      <h1 style="color:#C9A94E;font-family:\'Playfair Display\',Georgia,serif;font-size:28px;margin:0;">Attick &amp; Keller</h1>\n' +
    '      <p style="color:#D7CCC8;font-size:14px;margin:8px 0 0 0;">Bogota</p>\n' +
    '    </td></tr>\n' +
    '    <tr><td style="padding:24px 40px;text-align:center;background:#E8F5E9;">\n' +
    '      <h2 style="color:#2E7D32;font-size:20px;margin:0;">Tu cronograma esta listo</h2>\n' +
    '    </td></tr>\n' +
    '    <tr><td style="padding:32px 40px;">\n' +
    '      <p style="color:#3E2723;font-size:16px;margin:0 0 8px 0;">Hola ' + employeeName + ',</p>\n' +
    '      <p style="color:#3E2723;font-size:15px;margin:0 0 20px 0;">Se ha publicado el cronograma de <strong style="color:' + accentColor + ';">' + data.areaLabel + '</strong> para la semana <strong>' + data.weekStr + '</strong>.</p>\n' +
    '      <table width="100%" cellpadding="0" cellspacing="0" style="background:#EFEBE9;border-radius:12px;overflow:hidden;">\n' +
    '        <tr style="background:#3E2723;">\n' +
    '          <td style="padding:10px 16px;color:#C9A94E;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Dia</td>\n' +
    '          <td style="padding:10px 16px;color:#C9A94E;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Codigo</td>\n' +
    '          <td style="padding:10px 16px;color:#C9A94E;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Turno</td>\n' +
    '          <td style="padding:10px 16px;color:#C9A94E;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Horario</td>\n' +
    '          <td style="padding:10px 16px;color:#C9A94E;font-size:11px;text-transform:uppercase;letter-spacing:1px;text-align:right;">Horas</td>\n' +
    '        </tr>\n' + rows + '\n' +
    '      </table>\n' +
    '      <div style="text-align:center;margin-top:24px;">\n' +
    '        <a href="https://web-rosy-nine-64.vercel.app/mi-turno" style="display:inline-block;background:#6B2737;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">Ver Mi Turno</a>\n' +
    '      </div>\n' +
    '    </td></tr>\n' +
    '    <tr><td style="padding:24px 40px;background:#3E2723;text-align:center;">\n' +
    '      <p style="color:#D7CCC8;font-size:13px;margin:0 0 8px 0;">Carrera 13 #75-51, Bogota</p>\n' +
    '      <p style="color:#8D6E63;font-size:12px;margin:0;">&#x260E; +57 310 577 2708 &nbsp;|&nbsp; @attic_keller</p>\n' +
    '    </td></tr>\n' +
    '  </table>\n</body></html>'
}

interface ShiftReminderData {
  employeeName: string
  shiftCode: string
  shiftName: string
  entrada: string
  salida: string
  hours: number
  dayName: string
  date: string
  area: string
  areaLabel: string
}

function buildShiftReminderHtml(data: ShiftReminderData): string {
  return '<!DOCTYPE html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>\n' +
    '<body style="margin:0;padding:0;background:#F5EDE0;font-family:\'DM Sans\',Arial,sans-serif;">\n' +
    '  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;margin-top:40px;margin-bottom:40px;">\n' +
    '    <tr><td style="background:#3E2723;padding:32px 40px;text-align:center;">\n' +
    '      <h1 style="color:#C9A94E;font-family:\'Playfair Display\',Georgia,serif;font-size:28px;margin:0;">Attick &amp; Keller</h1>\n' +
    '      <p style="color:#D7CCC8;font-size:14px;margin:8px 0 0 0;">Bogota</p>\n' +
    '    </td></tr>\n' +
    '    <tr><td style="padding:24px 40px;text-align:center;background:#FFF8E1;">\n' +
    '      <h2 style="color:#F57F17;font-size:20px;margin:0;">Tu turno empieza pronto</h2>\n' +
    '    </td></tr>\n' +
    '    <tr><td style="padding:32px 40px;">\n' +
    '      <p style="color:#3E2723;font-size:16px;margin:0 0 20px 0;">Hola ' + data.employeeName + ',</p>\n' +
    '      <p style="color:#3E2723;font-size:15px;margin:0 0 24px 0;">Tu turno de <strong>' + data.areaLabel + '</strong> esta programado para hoy:</p>\n' +
    '      <table width="100%" cellpadding="0" cellspacing="0" style="background:#EFEBE9;border-radius:12px;overflow:hidden;">\n' +
    '        <tr><td style="padding:16px 24px;">\n' +
    '          <p style="color:#3E2723;font-size:20px;font-weight:bold;margin:0 0 8px 0;">' + data.shiftCode + ' — ' + data.shiftName + '</p>\n' +
    '          <p style="color:#8D6E63;font-size:15px;margin:0 0 4px 0;">' + data.dayName + ' ' + data.date + ' · ' + data.areaLabel + '</p>\n' +
    '          <p style="color:#3E2723;font-size:16px;margin:0;">' + data.entrada + ' — ' + data.salida + ' <span style="color:#8D6E63;font-size:14px;">(' + data.hours + 'h)</span></p>\n' +
    '        </td></tr>\n' +
    '      </table>\n' +
    '      <div style="text-align:center;margin-top:24px;">\n' +
    '        <a href="https://web-rosy-nine-64.vercel.app/mi-turno" style="display:inline-block;background:#6B2737;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">Registrar Entrada</a>\n' +
    '      </div>\n' +
    '    </td></tr>\n' +
    '    <tr><td style="padding:24px 40px;background:#3E2723;text-align:center;">\n' +
    '      <p style="color:#D7CCC8;font-size:13px;margin:0 0 8px 0;">Carrera 13 #75-51, Bogota</p>\n' +
    '      <p style="color:#8D6E63;font-size:12px;margin:0;">&#x260E; +57 310 577 2708 &nbsp;|&nbsp; @attic_keller</p>\n' +
    '    </td></tr>\n' +
    '  </table>\n</body></html>'
}

interface ShiftCheckoutData {
  employeeName: string
  shiftCode: string
  shiftName: string
  salida: string
  dayName: string
  date: string
  area: string
  areaLabel: string
}

function buildShiftCheckoutHtml(data: ShiftCheckoutData): string {
  return '<!DOCTYPE html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>\n' +
    '<body style="margin:0;padding:0;background:#F5EDE0;font-family:\'DM Sans\',Arial,sans-serif;">\n' +
    '  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;margin-top:40px;margin-bottom:40px;">\n' +
    '    <tr><td style="background:#3E2723;padding:32px 40px;text-align:center;">\n' +
    '      <h1 style="color:#C9A94E;font-family:\'Playfair Display\',Georgia,serif;font-size:28px;margin:0;">Attick &amp; Keller</h1>\n' +
    '      <p style="color:#D7CCC8;font-size:14px;margin:8px 0 0 0;">Bogota</p>\n' +
    '    </td></tr>\n' +
    '    <tr><td style="padding:24px 40px;text-align:center;background:#FFF3E0;">\n' +
    '      <h2 style="color:#E65100;font-size:20px;margin:0;">No olvides registrar tu salida</h2>\n' +
    '    </td></tr>\n' +
    '    <tr><td style="padding:32px 40px;">\n' +
    '      <p style="color:#3E2723;font-size:16px;margin:0 0 20px 0;">Hola ' + data.employeeName + ',</p>\n' +
    '      <p style="color:#3E2723;font-size:15px;margin:0 0 24px 0;">Tu turno de <strong>' + data.areaLabel + '</strong> debio terminar a las <strong>' + data.salida + '</strong>. Registra tu salida:</p>\n' +
    '      <table width="100%" cellpadding="0" cellspacing="0" style="background:#EFEBE9;border-radius:12px;overflow:hidden;">\n' +
    '        <tr><td style="padding:16px 24px;">\n' +
    '          <p style="color:#3E2723;font-size:20px;font-weight:bold;margin:0 0 8px 0;">' + data.shiftCode + ' — ' + data.shiftName + '</p>\n' +
    '          <p style="color:#8D6E63;font-size:15px;margin:0 0 4px 0;">' + data.dayName + ' ' + data.date + ' · ' + data.areaLabel + '</p>\n' +
    '          <p style="color:#3E2723;font-size:16px;margin:0;">Hora de salida programada: <strong>' + data.salida + '</strong></p>\n' +
    '        </td></tr>\n' +
    '      </table>\n' +
    '      <div style="text-align:center;margin-top:24px;">\n' +
    '        <a href="https://web-rosy-nine-64.vercel.app/mi-turno" style="display:inline-block;background:#6B2737;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">Registrar Salida</a>\n' +
    '      </div>\n' +
    '    </td></tr>\n' +
    '    <tr><td style="padding:24px 40px;background:#3E2723;text-align:center;">\n' +
    '      <p style="color:#D7CCC8;font-size:13px;margin:0 0 8px 0;">Carrera 13 #75-51, Bogota</p>\n' +
    '      <p style="color:#8D6E63;font-size:12px;margin:0;">&#x260E; +57 310 577 2708 &nbsp;|&nbsp; @attic_keller</p>\n' +
    '    </td></tr>\n' +
    '  </table>\n</body></html>'
}

// Helper: enviar correo individual con Resend
async function sendResendEmail(to: string, subject: string, html: string, from?: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set, skipping email')
    return { success: false, error: 'No API key' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from || SHIFTS_FROM,
        to,
        subject,
        html,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('Resend error:', err)
      return { success: false, error: err }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

const AREA_LABELS: Record<string, string> = {
  cocina: 'Cocina',
  barra: 'Barra',
  servicio: 'Servicio',
}

const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']

// ================================================================
// Correo 1: Cronograma publicado — enviar a cada colaborador
// ================================================================

interface ScheduleEmailRecipient {
  email: string
  name: string
  employeeId: string
  assignments: {
    dayIndex: number
    shiftCode: string
    shiftName: string
    entrada: string
    salida: string
    hours: number
  }[]
}

export async function sendShiftScheduleEmail(
  weekStr: string,
  area: string,
  scheduleId: string,
  recipients: ScheduleEmailRecipient[],
  sb: ReturnType<typeof createClient> // Supabase service client
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = { sent: 0, failed: 0, errors: [] as string[] }

  for (const r of recipients) {
    // Deduplicar: verificar si ya se envió
    const { data: existing } = await sb
      .from('email_log')
      .select('id')
      .eq('type', 'schedule_published')
      .eq('recipient_email', r.email)
      .eq('schedule_id', scheduleId)
      .is('assignment_id', null)
      .maybeSingle()

    if (existing) {
      console.log(`[email] Skipping schedule_published for ${r.email} (already sent)`)
      continue
    }

    // Calcular fechas de la semana
    const weekDates = getWeekDates(weekStr)
    const assignments = r.assignments.map(a => {
      // day_index 0=Dom -> weekDates[6], 1=Lun -> weekDates[0], etc.
      const date = a.dayIndex === 0 ? weekDates[6] : weekDates[a.dayIndex - 1]
      return {
        dayName: DAY_NAMES_SHORT[a.dayIndex],
        date: date ? date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : '',
        shiftCode: a.shiftCode,
        shiftName: a.shiftName,
        entrada: a.entrada,
        salida: a.salida,
        hours: a.hours,
      }
    })

    const html = buildShiftScheduleHtml({
      weekStr,
      area,
      areaLabel: AREA_LABELS[area] || area,
      assignments,
    }, r.name)

    const result = await sendResendEmail(r.email, `Tu cronograma de ${AREA_LABELS[area] || area} — Semana ${weekStr}`, html)

    // Log del envío
    await sb.from('email_log').insert({
      type: 'schedule_published',
      recipient_email: r.email,
      recipient_name: r.name,
      schedule_id: scheduleId,
      assignment_id: null,
      status: result.success ? 'sent' : 'failed',
      error: result.error || null,
    })

    if (result.success) {
      results.sent++
    } else {
      results.failed++
      results.errors.push(`${r.email}: ${result.error}`)
    }
  }

  return results
}

// ================================================================
// Correo 2: Recordatorio de turno (2h antes)
// ================================================================

export async function sendShiftReminderEmails(
  sb: ReturnType<typeof createClient>
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = { sent: 0, failed: 0, errors: [] as string[] }

  // Hora actual en Colombia
  const now = new Date()
  const colombiaOffset = -5 // UTC-5
  const nowColombia = new Date(now.getTime() + colombiaOffset * 60 * 60 * 1000 + now.getTimezoneOffset() * 60 * 1000)
  const reminderWindowStart = new Date(nowColombia.getTime() - 15 * 60 * 1000) // 15min atrás
  const reminderWindowEnd = new Date(nowColombia.getTime() + 15 * 60 * 1000)    // 15min adelante

  // Día de la semana (0=Dom, 1=Lun, ... 6=Sab)
  const dayIndex = nowColombia.getDay()
  const weekStr = getWeekStr(nowColombia)

  // Buscar schedules publicados para esta semana
  const { data: schedules } = await sb
    .from('shift_schedules')
    .select('id, area')
    .eq('week_str', weekStr)
    .eq('status', 'published')

  if (!schedules || schedules.length === 0) return results

  for (const schedule of schedules) {
    // Buscar shift_types del area para obtener nombres y horarios
    const { data: shiftTypes } = await sb
      .from('shift_types')
      .select('code, name, entrada, salida, ordinarias, nocturnas')
      .eq('area', schedule.area)

    const shiftTypeMap = new Map((shiftTypes || []).map(st => [st.code, st]))

    // Hora "2 horas antes" del turno: necesitamos asignaciones donde
    // (entrada - 2 horas) cae en la ventana de ~15min
    // Ej: turno 06:00 -> recordar a las 04:00. Si ahora son las 04:05, entra.
    const { data: assignments } = await sb
      .from('shift_assignments')
      .select('id, employee_id, shift_code, day_index')
      .eq('schedule_id', schedule.id)
      .eq('day_index', dayIndex)

    if (!assignments || assignments.length === 0) continue

    for (const assignment of assignments) {
      const st = shiftTypeMap.get(assignment.shift_code)
      if (!st) continue

      // Calcular hora de entrada del turno
      const [entryHour, entryMin] = st.entrada.split(':').map(Number)
      const turnoStart = new Date(nowColombia)
      turnoStart.setHours(entryHour, entryMin, 0, 0)

      // 2 horas antes del turno
      const reminderTime = new Date(turnoStart.getTime() - 2 * 60 * 60 * 1000)

      // Verificar si estamos en la ventana (reminderTime entre reminderWindowStart y reminderWindowEnd)
      if (reminderTime < reminderWindowStart || reminderTime > reminderWindowEnd) continue

      // Obtener datos del empleado
      const { data: employee } = await sb
        .from('pos_nomina_staff')
        .select('id, nombre_completo, correo, area')
        .eq('id', assignment.employee_id)
        .single()

      if (!employee || !employee.correo) continue

      // Obtener email del auth user (preferir correo de pos_nomina_staff si existe, sino auth)
      let email = employee.correo
      if (!email) {
        const { data: userRole } = await sb
          .from('user_roles')
          .select('auth_user_id')
          .eq('pos_nomina_staff_id', assignment.employee_id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()
        if (userRole) {
          const { data: { users } } = await sb.auth.admin.listUsers()
          const authUser = users.find(u => u.id === userRole.auth_user_id)
          email = authUser?.email || ''
        }
      }
      if (!email) continue

      // Obtener alias
      const { data: aliasData } = await sb
        .from('staff_aliases')
        .select('alias')
        .eq('employee_id', assignment.employee_id)
        .limit(1)
      const employeeName = aliasData?.[0]?.alias || employee.nombre_completo.split(' ')[0]

      // Deduplicar
      const { data: existing } = await sb
        .from('email_log')
        .select('id')
        .eq('type', 'shift_reminder')
        .eq('recipient_email', email)
        .eq('assignment_id', assignment.id)
        .maybeSingle()

      if (existing) continue

      // Calcular fecha formateada
      const dateStr = nowColombia.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })

      const html = buildShiftReminderHtml({
        employeeName,
        shiftCode: st.code,
        shiftName: st.name,
        entrada: st.entrada,
        salida: st.salida,
        hours: st.ordinarias + st.nocturnas,
        dayName: DAY_NAMES_SHORT[dayIndex],
        date: dateStr,
        area: schedule.area,
        areaLabel: AREA_LABELS[schedule.area] || schedule.area,
      })

      const result = await sendResendEmail(
        email,
        `Recordatorio: Tu turno de ${AREA_LABELS[schedule.area] || schedule.area} empieza a las ${st.entrada}`,
        html
      )

      await sb.from('email_log').insert({
        type: 'shift_reminder',
        recipient_email: email,
        recipient_name: employeeName,
        schedule_id: schedule.id,
        assignment_id: assignment.id,
        status: result.success ? 'sent' : 'failed',
        error: result.error || null,
      })

      if (result.success) results.sent++
      else { results.failed++; results.errors.push(`${email}: ${result.error}`) }
    }
  }

  return results
}

// ================================================================
// Correo 3: Recordatorio de checkout (30min después de salida)
// ================================================================

export async function sendShiftCheckoutReminders(
  sb: ReturnType<typeof createClient>
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = { sent: 0, failed: 0, errors: [] as string[] }

  const now = new Date()
  const colombiaOffset = -5
  const nowColombia = new Date(now.getTime() + colombiaOffset * 60 * 60 * 1000 + now.getTimezoneOffset() * 60 * 1000)

  const dayIndex = nowColombia.getDay()
  const weekStr = getWeekStr(nowColombia)

  // Buscar schedules publicados
  const { data: schedules } = await sb
    .from('shift_schedules')
    .select('id, area')
    .eq('week_str', weekStr)
    .eq('status', 'published')

  if (!schedules || schedules.length === 0) return results

  for (const schedule of schedules) {
    const { data: shiftTypes } = await sb
      .from('shift_types')
      .select('code, name, entrada, salida, ordinarias, nocturnas')
      .eq('area', schedule.area)

    const shiftTypeMap = new Map((shiftTypes || []).map(st => [st.code, st]))

    // Buscar asignaciones de hoy donde NO hay checkout
    const { data: assignments } = await sb
      .from('shift_assignments')
      .select('id, employee_id, shift_code, day_index, checkin_at, checkout_at')
      .eq('schedule_id', schedule.id)
      .eq('day_index', dayIndex)
      .is('checkout_at', null) // sin checkout

    if (!assignments || assignments.length === 0) continue

    for (const assignment of assignments) {
      const st = shiftTypeMap.get(assignment.shift_code)
      if (!st) continue

      // Calcular hora de salida del turno + 30 minutos
      const [exitHour, exitMin] = st.salida.split(':').map(Number)
      const turnoEnd = new Date(nowColombia)
      turnoEnd.setHours(exitHour, exitMin, 0, 0)

      const reminderTime = new Date(turnoEnd.getTime() + 30 * 60 * 1000) // 30min después de salida

      // Verificar si estamos en ventana de 15min
      const reminderWindowStart = new Date(reminderTime.getTime() - 15 * 60 * 1000)
      const reminderWindowEnd = new Date(reminderTime.getTime() + 15 * 60 * 1000)

      if (nowColombia < reminderWindowStart || nowColombia > reminderWindowEnd) continue

      // Obtener datos del empleado
      const { data: employee } = await sb
        .from('pos_nomina_staff')
        .select('id, nombre_completo, correo, area')
        .eq('id', assignment.employee_id)
        .single()

      if (!employee) continue

      let email = employee.correo
      if (!email) {
        const { data: userRole } = await sb
          .from('user_roles')
          .select('auth_user_id')
          .eq('pos_nomina_staff_id', assignment.employee_id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()
        if (userRole) {
          const { data: { users } } = await sb.auth.admin.listUsers()
          const authUser = users.find(u => u.id === userRole.auth_user_id)
          email = authUser?.email || ''
        }
      }
      if (!email) continue

      const { data: aliasData } = await sb
        .from('staff_aliases')
        .select('alias')
        .eq('employee_id', assignment.employee_id)
        .limit(1)
      const employeeName = aliasData?.[0]?.alias || employee.nombre_completo.split(' ')[0]

      // Deduplicar
      const { data: existing } = await sb
        .from('email_log')
        .select('id')
        .eq('type', 'shift_checkout_reminder')
        .eq('recipient_email', email)
        .eq('assignment_id', assignment.id)
        .maybeSingle()

      if (existing) continue

      const dateStr = nowColombia.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })

      const html = buildShiftCheckoutHtml({
        employeeName,
        shiftCode: st.code,
        shiftName: st.name,
        salida: st.salida,
        dayName: DAY_NAMES_SHORT[dayIndex],
        date: dateStr,
        area: schedule.area,
        areaLabel: AREA_LABELS[schedule.area] || schedule.area,
      })

      const result = await sendResendEmail(
        email,
        `No olvides registrar tu salida — ${AREA_LABELS[schedule.area] || schedule.area}`,
        html
      )

      await sb.from('email_log').insert({
        type: 'shift_checkout_reminder',
        recipient_email: email,
        recipient_name: employeeName,
        schedule_id: schedule.id,
        assignment_id: assignment.id,
        status: result.success ? 'sent' : 'failed',
        error: result.error || null,
      })

      if (result.success) results.sent++
      else { results.failed++; results.errors.push(`${email}: ${result.error}`) }
    }
  }

  return results
}
```

**Step 2: Commit**

```bash
git add web/src/lib/email/send.ts
git commit -m "feat: add shift notification email templates and senders"
```

---

### Task 3: Hook en `publish/route.ts` — enviar correo al publicar

**Objective:** Al publicar un cronograma, enviar correo de "cronograma publicado" a cada colaborador asignado.

**Files:**
- Modify: `web/src/app/api/admin/shift-schedules/[id]/publish/route.ts`

**Step 1: Modificar el publish endpoint para enviar correos**

Después de la línea que hace `return NextResponse.json(updated)`, ANTES del return, agregar la lógica de envío de correos. El cambio es:

1. Importar `sendShiftScheduleEmail` y `getServiceClient`
2. Después de publicar exitosamente, buscar todas las asignaciones del schedule
3. Para cada empleado con asignaciones, construir los datos del correo
4. Llamar `sendShiftScheduleEmail()`
5. El envío es fire-and-forget (no bloquea la respuesta al admin)

```typescript
// Al final del POST handler, ANTES del return final:
// --- Send schedule published emails (fire-and-forget) ---
try {
  // Buscar asignaciones agrupadas por empleado
  const { data: allAssignments } = await sb
    .from('shift_assignments')
    .select('employee_id, shift_code, day_index')
    .eq('schedule_id', updated.id)

  // Buscar shift_types del area
  const { data: shiftTypes } = await sb
    .from('shift_types')
    .select('code, name, entrada, salida, ordinarias, nocturnas')
    .eq('area', updated.area)

  const shiftTypeMap = new Map((shiftTypes || []).map(st => [st.code, st]))

  // Agrupar por empleado
  const employeeMap = new Map<string, { shiftCode: string; shiftName: string; entrada: string; salida: string; hours: number; dayIndex: number }[]>()
  for (const a of (allAssignments || [])) {
    const st = shiftTypeMap.get(a.shift_code)
    if (!st) continue
    if (!employeeMap.has(a.employee_id)) employeeMap.set(a.employee_id, [])
    employeeMap.get(a.employee_id)!.push({
      shiftCode: a.shift_code,
      shiftName: st.name,
      entrada: st.entrada,
      salida: st.salida,
      hours: st.ordinarias + st.nocturnas,
      dayIndex: a.day_index,
    })
  }

  // Buscar datos de empleados y auth emails
  const { data: { users } } = await sb.auth.admin.listUsers()

  const recipients: ScheduleEmailRecipient[] = []
  for (const [employeeId, assignments] of employeeMap) {
    const { data: emp } = await sb
      .from('pos_nomina_staff')
      .select('id, nombre_completo, correo')
      .eq('id', employeeId)
      .single()

    if (!emp) continue

    // Buscar email (preferir correo de pos_nomina, sino auth email)
    let email = emp.correo
    if (!email) {
      const { data: userRole } = await sb
        .from('user_roles')
        .select('auth_user_id')
        .eq('pos_nomina_staff_id', employeeId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      if (userRole) {
        const authUser = users.find(u => u.id === userRole.auth_user_id)
        email = authUser?.email || ''
      }
    }
    if (!email) continue

    // Buscar alias
    const { data: aliasData } = await sb
      .from('staff_aliases')
      .select('alias')
      .eq('employee_id', employeeId)
      .limit(1)
    const name = aliasData?.[0]?.alias || emp.nombre_completo.split(' ')[0]

    recipients.push({
      email,
      name,
      employeeId,
      assignments: assignments.map(a => ({
        dayIndex: a.dayIndex,
        shiftCode: a.shiftCode,
        shiftName: a.shiftName,
        entrada: a.entrada,
        salida: a.salida,
        hours: a.hours,
      })),
    })
  }

  // Enviar correos (no bloquea la respuesta)
  sendShiftScheduleEmail(updated.week_str, updated.area, updated.id, recipients, sb)
    .then(result => console.log('[email] Schedule published emails:', result))
    .catch(err => console.error('[email] Error sending schedule emails:', err))
} catch (emailErr) {
  // No fallar la publicación si el correo falla
  console.error('[email] Error preparing schedule emails:', emailErr)
}

return NextResponse.json(updated)
```

**Step 2: Commit**

```bash
git add web/src/app/api/admin/shift-schedules/[id]/publish/route.ts
git commit -m "feat: send schedule-published emails when shifts are published"
```

---

### Task 4: Endpoint cron para recordatorios y checkout

**Objective:** Endpoint protegido con `CRON_SECRET` que ejecuta los 2 envíos programados (recordatorio 2h antes, checkout 30min después).

**Files:**
- Create: `web/src/app/api/admin/shift-emails/reminders/route.ts`
- Create: `web/src/app/api/admin/shift-emails/checkout-reminders/route.ts`

**Step 1: Crear `reminders/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendShiftReminderEmails } from '@/lib/email/send'

// GET /api/admin/shift-emails/reminders — Cron: recordatorio 2h antes del turno
// Protegido por CRON_SECRET
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const result = await sendShiftReminderEmails(sb)
    console.log('[cron] Shift reminders:', result)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[cron] Error sending shift reminders:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

**Step 2: Crear `checkout-reminders/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendShiftCheckoutReminders } from '@/lib/email/send'

// GET /api/admin/shift-emails/checkout-reminders — Cron: checkout 30min después de salida
// Protegido por CRON_SECRET
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const result = await sendShiftCheckoutReminders(sb)
    console.log('[cron] Checkout reminders:', result)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[cron] Error sending checkout reminders:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

**Step 3: Commit**

```bash
git add web/src/app/api/admin/shift-emails/
git commit -m "feat: add cron endpoints for shift reminder and checkout reminder emails"
```

---

### Task 5: Configurar Vercel Cron (o Hermes cron)

**Objective:** Configurar el cron para que llame los endpoints cada 15 minutos.

**Files:**
- Create: `web/vercel.json`

**Option A: Vercel Cron (recomendado si dominio ya verificado en Resend)**

```json
{
  "crons": [
    {
      "path": "/api/admin/shift-emails/reminders",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/admin/shift-emails/checkout-reminders",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

**Nota:** Vercel Cron envía requests SIN `Authorization` header. Para proteger el endpoint, se necesita usar `CRON_SECRET` como query param: `?cron_secret=xxx` y leerlo de `searchParams`. Modificar los endpoints para aceptar query param también.

**Option B: Hermes Cron (si Vercel tiene limitaciones)**

Configurar 2 cron jobs en Hermes que llamen los endpoints con `Authorization: Bearer $CRON_SECRET`.

**Step 1: Crear `vercel.json`** (opcion A)

```json
{
  "crons": [
    {
      "path": "/api/admin/shift-emails/reminders?cron_secret=CRON_SECRET_PLACEHOLDER",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/admin/shift-emails/checkout-reminders?cron_secret=CRON_SECRET_PLACEHOLDER",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

**Step 2: Actualizar los endpoints para aceptar `cron_secret` como query param**

En ambos archivos `route.ts`, cambiar la verificación:

```typescript
// Aceptar auth header O query param cron_secret
const authHeader = request.headers.get('authorization')
const { searchParams } = new URL(request.url)
const cronParam = searchParams.get('cron_secret')
const cronSecret = process.env.CRON_SECRET

const authorized = (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
                   (cronSecret && cronParam === cronSecret)

if (!authorized) {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
}
```

**Step 3: Commit**

```bash
git add web/vercel.json web/src/app/api/admin/shift-emails/
git commit -m "feat: add vercel cron config for shift email reminders"
```

---

### Task 6: Agregar columna `correo` a la query de pos_nomina_staff

**Objective:** Verificar que el API de pos-nomina-staff y el email sender usen la columna `correo` de `pos_nomina_staff`.

**Files:**
- Modify: `web/src/app/api/admin/pos-nomina-staff/route.ts`

**Step 1: Agregar `correo` al SELECT**

En el API de pos-nomina-staff, cambiar:

```typescript
.select('id, nombre_completo, cargo, area')
```

a:

```typescript
.select('id, nombre_completo, cargo, area, correo')
```

Verificar que el formulario AddStaffForm y otros consumidores no se rompan.

**Step 2: Commit**

```bash
git add web/src/app/api/admin/pos-nomina-staff/route.ts
git commit -m "feat: include correo field in pos-nomina-staff API"
```

---

### Task 7: Variable de entorno `CRON_SECRET`

**Objective:** Agregar CRON_SECRET a Vercel environment variables.

**Steps:**
1. Generar un secret aleatorio: `openssl rand -hex 32`
2. Agregar a Vercel: `npx vercel env add CRON_SECRET production` (o via dashboard)
3. Agregar `CRON_SECRET` al `.env.local` para desarrollo local

---

### Task 8: Pruebas end-to-end

**Objective:** Verificar que los 3 tipos de correo se envían correctamente.

**Test 1: Cronograma publicado**
1. Crear un cronograma con asignaciones en el admin panel
2. Publicar el cronograma
3. Verificar que cada colaborador recibió un correo con su tabla de turnos
4. Verificar en `email_log` que hay registros con `type = 'schedule_published'`
5. Publicar de nuevo y verificar que NO se re-envían (deduplicación)

**Test 2: Recordatorio de turno**
1. Llamar manualmente `GET /api/admin/shift-emails/reminders` con el header correcto
2. Verificar que solo se envían para turnos que empiezan en ~2 horas
3. Verificar deduplicación en `email_log`

**Test 3: Recordatorio de checkout**
1. Llamar manualmente `GET /api/admin/shift-emails/checkout-reminders`
2. Verificar que solo se envían para turnos que terminaron hace ~30 min sin checkout
3. Verificar deduplicación

**Test 4: Correos sin email**
1. Verificar que empleados sin `correo` en `pos_nomina_staff` y sin auth email NO causan error
2. Se saltan silenciosamente con log

---

## Notas de implementación

- **Zona horaria:** Colombia (America/Bogota = UTC-5). Los cálculos de "2h antes" y "30min después" usan hora Colombia, no UTC.
- **Deduplicación:** La UNIQUE constraint en `email_log(type, recipient_email, schedule_id, assignment_id)` garantiza que no se re-envía un correo. Para schedule_published, `assignment_id` es NULL (se deduplica por schedule + email). Para los otros, se deduplica por assignment + email.
- **Fire-and-forget:** El envío de correos al publicar NO bloquea la respuesta HTTP. Se hace con `.then().catch()` para que el admin vea la publicación exitosa inmediatamente.
- **Correo fuente:** Los correos de turnos usan `turnos@ccs724.com` como remitente. Si ese dominio no está verificado en Resend, usar `ventas@ccs724.com` (ya verificado).
- **Vercel Cron:** Requiere plan Pro para crons custom. Si están en plan Hobby, usar Hermes cron en su lugar.
- **Sin React Email:** Las plantillas son HTML inline (igual que los correos existentes). No se agrega dependencia de `@react-email/components`.
- **Import:** Las funciones `getWeekStr` y `getWeekDates` se importan de `@/lib/utils/costCalculator` (ya existen y funcionan correctamente).