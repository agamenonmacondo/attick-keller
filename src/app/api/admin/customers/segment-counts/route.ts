import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

const BATCH_SIZE = 999

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser(request)
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const sb = getServiceClient()

    // Count total customers
    const { count: allCount, error: countError } = await sb
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', RESTAURANT_ID)

    if (countError) {
      console.error('[segment-counts] Error counting customers:', countError.message)
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    // Fetch all total_visits from customer_stats in batches
    const allVisits: number[] = []
    let from = 0
    let done = false

    while (!done) {
      const { data, error } = await sb
        .from('customer_stats')
        .select('total_visits')
        .range(from, from + BATCH_SIZE - 1)

      if (error) {
        console.error('[segment-counts] Error fetching stats:', error.message)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
      }

      if (!data || data.length === 0) break

      for (const row of data) {
        allVisits.push(row.total_visits)
      }

      if (data.length < BATCH_SIZE) break
      from += BATCH_SIZE
    }

    // Group client-side by ranges
    let nuevos = 0
    let ocasional = 0
    let frecuente = 0
    let habitual = 0
    let vip = 0

    for (const v of allVisits) {
      if (v >= 11) vip++
      else if (v >= 6) habitual++
      else if (v >= 4) frecuente++
      else if (v >= 2) ocasional++
      else if (v >= 1) nuevos++
    }

    return NextResponse.json({
      all: allCount || 0,
      nuevos,
      ocasional,
      frecuente,
      habitual,
      vip,
    })
  } catch (err: unknown) {
    const errorDetails = err instanceof Error
      ? { message: err.message }
      : { message: String(err) }
    console.error('[segment-counts] FATAL GET error:', err instanceof Error ? err.stack : String(err))
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
