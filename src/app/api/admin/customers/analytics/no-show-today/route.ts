import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  try {
    // Get all confirmed reservations for the date
    const { data: reservations, error: resError } = await sb
      .from('reservations')
      .select('id, customer_id, time_start, party_size, status')
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('date', date)
      .eq('status', 'confirmed')

    if (resError) throw resError

    if (!reservations || reservations.length === 0) {
      return NextResponse.json({
        date,
        alerts: [],
        totalAtRisk: 0,
        totalReservationsToday: 0,
      })
    }

    // Get customer_ids that have reservations
    const customerIds = [...new Set(reservations.map((r: any) => r.customer_id).filter(Boolean))]
    const customerNames: Record<string, { name: string; phone: string | null }> = {}
    const customerNoShows: Record<string, number> = {}

    // Fetch customer info and stats in batches of 999
    if (customerIds.length > 0) {
      for (let i = 0; i < customerIds.length; i += 999) {
        const batch = customerIds.slice(i, i + 999)

        const { data: customers, error: custError } = await sb
          .from('customers')
          .select('id, full_name, phone')
          .in('id', batch)
          .eq('restaurant_id', RESTAURANT_ID)

        if (custError) throw custError

        for (const c of customers || []) {
          customerNames[c.id] = { name: c.full_name || 'Sin nombre', phone: c.phone }
        }

        const { data: stats } = await sb
          .from('customer_stats')
          .select('customer_id, no_show_count')
          .in('customer_id', batch)

        for (const s of stats || []) {
          customerNoShows[s.customer_id] = s.no_show_count || 0
        }
      }
    }

    // Build alerts for reservations with no_show_count >= 1
    const alerts = reservations
      .map((r: any) => {
        const noShowCount = r.customer_id ? (customerNoShows[r.customer_id] || 0) : 0
        const riskLevel = noShowCount >= 4 ? 'high' : noShowCount >= 2 ? 'medium' : noShowCount === 1 ? 'low' : 'none'
        const customer = r.customer_id ? customerNames[r.customer_id] : null

        return {
          id: r.id,
          customerName: customer?.name || 'Sin nombre',
          customerPhone: customer?.phone || null,
          reservationTime: r.time_start,
          partySize: r.party_size,
          noShowCount,
          riskLevel,
          tableZone: null as string | null, // Zone not directly on reservation
        }
      })
      .filter((a: any) => a.riskLevel !== 'none') // Only show at-risk reservations

    const totalAtRisk = alerts.length

    return NextResponse.json({
      date,
      alerts,
      totalAtRisk,
      totalReservationsToday: reservations.length,
    })
  } catch (err) {
    console.error('[no-show-today] Error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}