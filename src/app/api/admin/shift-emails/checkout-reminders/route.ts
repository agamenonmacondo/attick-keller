import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendShiftCheckoutReminders } from '@/lib/email/send'

// GET /api/admin/shift-emails/checkout-reminders — Cron: checkout 30min después de salida
// Protegido por CRON_SECRET (header Authorization: Bearer *** o query param ?cron_secret=xxx)
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
    const result = await sendShiftCheckoutReminders(sb)
    console.log('[cron] Checkout reminders:', result)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[cron] Error sending checkout reminders:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}