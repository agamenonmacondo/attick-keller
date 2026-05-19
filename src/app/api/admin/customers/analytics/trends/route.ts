import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const { searchParams } = new URL(request.url)
  const weeks = parseInt(searchParams.get('weeks') || '8', 10)

  try {
    // Calculate date range for weekly trends
    const now = new Date()
    const trends: Array<{
      week: string
      label: string
      activeCount: number
      newCount: number
      noShowCount: number
      reservationCount: number
      retentionPct: number
    }> = []

    // Get all customer_stats for total recurring count
    const { count: totalCustomers } = await sb
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', RESTAURANT_ID)

    for (let w = weeks - 1; w >= 0; w--) {
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - (w * 7 + now.getDay() + 6) % 7)
      // Adjust to start of ISO week (Monday)
      const dayOfWeek = weekStart.getDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      weekStart.setDate(weekStart.getDate() + mondayOffset)
      weekStart.setHours(0, 0, 0, 0)

      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 7)

      const weekStartStr = weekStart.toISOString().split('T')[0]
      const weekEndStr = weekEnd.toISOString().split('T')[0]

      // ISO week number
      const weekNum = getISOWeek(weekStart)
      const weekLabel = `${weekStart.toLocaleDateString('es', { month: 'short', day: 'numeric' })}-${new Date(weekEnd.getTime() - 86400000).toLocaleDateString('es', { month: 'short', day: 'numeric' })}`

      // Reservations in this week
      const { data: weekReservations } = await sb
        .from('reservations')
        .select('customer_id, status')
        .eq('restaurant_id', RESTAURANT_ID)
        .gte('date', weekStartStr)
        .lt('date', weekEndStr)

      const reservationCount = weekReservations?.length || 0

      // Unique customers this week (active)
      const activeCustomerIds = new Set(
        (weekReservations || []).map((r: any) => r.customer_id).filter(Boolean)
      )
      const activeCount = activeCustomerIds.size

      // No-shows this week
      const noShowCount = (weekReservations || []).filter((r: any) => r.status === 'no_show').length

      // New customers: whose first reservation is this week
      // Approximation: count customers whose created_at falls in this week
      const { count: newCount } = await sb
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', RESTAURANT_ID)
        .gte('created_at', weekStartStr)
        .lt('created_at', weekEndStr)

      // Retention: recurring / total this week
      const recurringThisWeek = (weekReservations || []).filter(
        (r: any) => r.customer_id && activeCustomerIds.has(r.customer_id)
      ).length
      const retentionPct = (totalCustomers || 0) > 0
        ? Math.round((activeCount / (totalCustomers || 1)) * 100 * 10) / 10
        : 0

      trends.push({
        week: `${weekStart.getFullYear()}-W${String(weekNum).padStart(2, '0')}`,
        label: weekLabel,
        activeCount,
        newCount: newCount || 0,
        noShowCount,
        reservationCount,
        retentionPct,
      })
    }

    return NextResponse.json({ trends })
  } catch (err) {
    console.error('[trends] Error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}