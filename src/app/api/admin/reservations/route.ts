import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const url = new URL(request.url)

  const date = url.searchParams.get('date')
  const status = url.searchParams.get('status')
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100)
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = sb
    .from('reservations')
    .select('id, date, time_start, time_end, party_size, status, source, special_requests, customer_id, table_id, created_at, customers(id, email, full_name, phone), table_zones!reservations_table_id_fkey(name)', { count: 'exact' })
    .eq('restaurant_id', RESTAURANT_ID)
    .order('date', { ascending: false })
    .range(from, to)

  if (date) query = query.eq('date', date)
  if (status) query = query.eq('status', status)

  const { data, count, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const reservations = (data || []).map(r => {
    const zoneArr = r.table_zones as unknown as Array<{ name: string }> | null
    const zone = Array.isArray(zoneArr) ? zoneArr[0] : null
    return { ...r, zone_name: zone?.name || null, table_zones: undefined }
  })

  return NextResponse.json({ reservations, total: count || 0, page, limit })
}