import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

function qparam(request: NextRequest, key: string): string | null {
  return request.nextUrl.searchParams.get(key)
}

async function fetchCalendarData(zoneParam: string) {
  const sb = getServiceClient()

  // Fetch ALL non-cancelled paid sales (no date filter — calendar shows everything)
  let allSales: any[] = []
  let offset = 0
  const BATCH = 1000
  let hasMore = true
  while (hasMore) {
    let query = sb
      .from('pos_sales')
      .select('opened_at, total, tip_amount, party_size, derived_zone_name, is_cancelled')
      .eq('is_paid', true)
      .eq('is_cancelled', false)
      .range(offset, offset + BATCH - 1)
      .order('opened_at', { ascending: true })

    const { data: batch, error } = await query
    if (error) {
      throw new Error('Error cargando ventas: ' + error.message)
    }
    if (batch && batch.length > 0) {
      allSales.push(...batch)
      offset += BATCH
      hasMore = batch.length === BATCH
    } else {
      hasMore = false
    }
  }

  // Filter by zone if specified
  const filtered = zoneParam !== 'all'
    ? allSales.filter((s: any) => s.derived_zone_name === zoneParam)
    : allSales

  // Build dailyTrend
  const dayMap = new Map<string, { revenue: number; cheques: number; propina: number; personas: number }>()
  for (const s of filtered) {
    const dt = new Date(s.opened_at)
    const dayStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    const d = dayMap.get(dayStr) || { revenue: 0, cheques: 0, propina: 0, personas: 0 }
    d.revenue += Number(s.total) || 0
    d.cheques += 1
    d.propina += Number(s.tip_amount) || 0
    d.personas += Number(s.party_size) || 0
    dayMap.set(dayStr, d)
  }
  const dailyTrend = [...dayMap.entries()]
    .map(([date, d]) => ({ date, ...d }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Build availableMonths
  const seen = new Set<string>()
  const availableMonths: string[] = []
  for (const s of allSales) {
    const d = new Date(s.opened_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!seen.has(key)) {
      seen.add(key)
      availableMonths.push(key)
    }
  }

  return { dailyTrend, availableMonths, zone: zoneParam }
}

/** Lightweight endpoint: returns ONLY dailyTrend + availableMonths for the calendar.
 *  Cached for 5 minutes — calendar data changes infrequently (only on new data uploads). */
export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const zoneParam = qparam(request, 'zone') || 'all'

  const getCachedCalendarData = unstable_cache(
    (zone: string) => fetchCalendarData(zone),
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