import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendShiftReminderEmails } from '@/lib/email/send'

// GET /api/admin/shift-emails/reminders — Cron: recordatorio 2h antes del turno
// Protegido por CRON_SECRET (header Authorization: Bearer xxx o query param ?cron_secret=xxx)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const { searchParams } = new URL(request.url)
  const cronParam = searchParams.get('cron_secret')
  const cronSecret = process.env.CRON_SECRET

  const authorized = (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
                     (cronSecret && cronParam === cronSecret)

  if (!authorized) {
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