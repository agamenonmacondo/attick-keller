import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

function qparam(request: NextRequest, key: string): string | null {
  return request.nextUrl.searchParams.get(key)
}

async function fetchCalendarData(zoneParam: string) {
  const sb = getServiceClient()

  // Fetch daily trend from RPC (all-time: from 2024 to 2030 covers everything, paid only)
  const { data: dailyData, error: dailyError } = await sb.rpc('pos_dashboard_daily', {
    p_from: '2024-01-01',
    p_to: '2030-12-31',
    p_zone: zoneParam,
    p_is_paid_only: true,
  })

  if (dailyError) {
    throw new Error('Error cargando tendencia diaria: ' + dailyError.message)
  }

  const dailyTrend = (dailyData || []).map((d: any) => ({
    date: d.date,
    revenue: Number(d.revenue) || 0,
    cheques: Number(d.cheques) || 0,
    propina: Number(d.propina) || 0,
    personas: Number(d.personas) || 0,
  }))

  // Fetch available months from RPC
  const { data: monthsData, error: monthsError } = await sb.rpc('pos_dashboard_months')

  if (monthsError) {
    throw new Error('Error cargando meses: ' + monthsError.message)
  }

  const availableMonths = (monthsData || []).map((m: any) => m.month)

  return { dailyTrend, availableMonths, zone: zoneParam }
}

/** Lightweight endpoint: returns ONLY dailyTrend + availableMonths for the calendar.
 *  Cached for 5 minutes — calendar data changes infrequently (only on new data uploads). */
export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const zoneParam = qparam(request, 'zone') || 'all'

  const getCachedCalendarData = unstable_cache(
    fetchCalendarData,
    ['pos-calendar'],
    { revalidate: 300 }
  )

  try {
    const data = await getCachedCalendarData(zoneParam)
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error cargando calendario' }, { status: 500 })
  }
}
