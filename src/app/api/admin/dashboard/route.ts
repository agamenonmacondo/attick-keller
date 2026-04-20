import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const url = new URL(request.url)
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0]

  const [resRes, tablesRes] = await Promise.all([
    sb
      .from('reservations')
      .select('id, date, time_start, time_end, party_size, status, source, special_requests, customer_id, table_id, created_at, customers(id, email, full_name, phone)')
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('date', date)
      .in('status', ['pending', 'pre_paid', 'confirmed', 'seated'])
      .order('time_start', { ascending: true }),
    sb
      .from('tables')
      .select('id, capacity, zone_id, is_active, table_zones(id, name)')
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('is_active', true),
  ])

  const reservations = resRes.data || []
  const allTables = tablesRes.data || []

  const todayStats = {
    total: reservations.length,
    pending: reservations.filter(r => r.status === 'pending').length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    seated: reservations.filter(r => r.status === 'seated').length,
    pre_paid: reservations.filter(r => r.status === 'pre_paid').length,
    completed: 0,
    cancelled: 0,
    no_show: 0,
    totalGuests: reservations.reduce((s, r) => s + r.party_size, 0),
    seatedGuests: reservations.filter(r => r.status === 'seated').reduce((s, r) => s + r.party_size, 0),
  }

  const [completedRes, cancelledRes, noShowRes] = await Promise.all([
    sb.from('reservations').select('id, party_size', { count: 'exact' }).eq('restaurant_id', RESTAURANT_ID).eq('date', date).eq('status', 'completed'),
    sb.from('reservations').select('id, party_size', { count: 'exact' }).eq('restaurant_id', RESTAURANT_ID).eq('date', date).eq('status', 'cancelled'),
    sb.from('reservations').select('id, party_size', { count: 'exact' }).eq('restaurant_id', RESTAURANT_ID).eq('date', date).eq('status', 'no_show'),
  ])

  todayStats.completed = completedRes.count || 0
  todayStats.cancelled = cancelledRes.count || 0
  todayStats.no_show = noShowRes.count || 0

  const occupiedTableIds = new Set(
    reservations
      .filter(r => r.table_id && ['confirmed', 'pre_paid', 'seated'].includes(r.status))
      .map(r => r.table_id)
  )

  const zoneMap = new Map<string, { zone_id: string; zone_name: string; total_tables: number; occupied_tables: number; capacity: number; occupied_capacity: number }>()
  for (const table of allTables) {
    const tzArr = table.table_zones as unknown as Array<{ id: string; name: string }> | null
    const tz = Array.isArray(tzArr) ? tzArr[0] : null
    const zId = tz?.id || 'unassigned'
    const zName = tz?.name || 'Sin zona'
    if (!zoneMap.has(zId)) {
      zoneMap.set(zId, { zone_id: zId, zone_name: zName, total_tables: 0, occupied_tables: 0, capacity: 0, occupied_capacity: 0 })
    }
    const z = zoneMap.get(zId)!
    z.total_tables++
    z.capacity += table.capacity
    if (occupiedTableIds.has(table.id)) {
      z.occupied_tables++
      z.occupied_capacity += table.capacity
    }
  }

  const totalCapacity = allTables.reduce((s, t) => s + t.capacity, 0)
  const occupiedCapacity = [...zoneMap.values()].reduce((s, z) => s + z.occupied_capacity, 0)

  return NextResponse.json({
    reservations,
    todayStats,
    occupancy: {
      totalCapacity,
      occupiedCapacity,
      utilizationPercent: totalCapacity > 0 ? Math.round((occupiedCapacity / totalCapacity) * 100) : 0,
      totalTables: allTables.length,
      occupiedTables: occupiedTableIds.size,
      byZone: Array.from(zoneMap.values()),
    },
  })
}