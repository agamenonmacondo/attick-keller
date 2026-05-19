import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()

  try {
    // Get party_size distribution from reservations (demand)
    const { data: reservations, error: resError } = await sb
      .from('reservations')
      .select('party_size')
      .eq('restaurant_id', RESTAURANT_ID)

    if (resError) throw resError

    // Count tables by capacity (supply)
    const { data: tables, error: tablesError } = await sb
      .from('tables')
      .select('capacity')
      .eq('restaurant_id', RESTAURANT_ID)

    if (tablesError) throw tablesError

    // Calculate demand distribution
    const demandBuckets = { size2: 0, size4: 0, size6: 0, size8plus: 0 }
    const totalReservations = (reservations || []).length

    for (const r of reservations || []) {
      const size = r.party_size || 2
      if (size <= 2) demandBuckets.size2++
      else if (size <= 4) demandBuckets.size4++
      else if (size <= 6) demandBuckets.size6++
      else demandBuckets.size8plus++
    }

    // Convert to percentages
    const demand = {
      size2: Math.round((demandBuckets.size2 / totalReservations) * 1000) / 10,
      size4: Math.round((demandBuckets.size4 / totalReservations) * 1000) / 10,
      size6: Math.round((demandBuckets.size6 / totalReservations) * 1000) / 10,
      size8plus: Math.round((demandBuckets.size8plus / totalReservations) * 1000) / 10,
    }

    // Calculate supply distribution
    const supplyBuckets = { size2: 0, size4: 0, size6: 0, size8plus: 0 }
    const totalTables = (tables || []).length

    for (const t of tables || []) {
      const capacity = t.capacity || 4
      if (capacity <= 2) supplyBuckets.size2++
      else if (capacity <= 4) supplyBuckets.size4++
      else if (capacity <= 6) supplyBuckets.size6++
      else supplyBuckets.size8plus++
    }

    const supply = {
      size2: Math.round((supplyBuckets.size2 / totalTables) * 1000) / 10,
      size4: Math.round((supplyBuckets.size4 / totalTables) * 1000) / 10,
      size6: Math.round((supplyBuckets.size6 / totalTables) * 1000) / 10,
      size8plus: Math.round((supplyBuckets.size8plus / totalTables) * 1000) / 10,
    }

    // Detect mismatch (> 20 percentage points difference)
    const mismatch =
      Math.abs(demand.size2 - supply.size2) > 20 ||
      Math.abs(demand.size4 - supply.size4) > 20 ||
      Math.abs(demand.size6 - supply.size6) > 20 ||
      Math.abs(demand.size8plus - supply.size8plus) > 20

    // Generate recommendation
    let recommendation = ''
    if (mismatch) {
      const biggestGap = [
        { size: '2', demand: demand.size2, supply: supply.size2, diff: demand.size2 - supply.size2 },
        { size: '3-4', demand: demand.size4, supply: supply.size4, diff: demand.size4 - supply.size4 },
        { size: '5-6', demand: demand.size6, supply: supply.size6, diff: demand.size6 - supply.size6 },
        { size: '7+', demand: demand.size8plus, supply: supply.size8plus, diff: demand.size8plus - supply.size8plus },
      ].sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))[0]

      if (biggestGap.diff > 0) {
        recommendation = `Considerar convertir mesas de ${biggestGap.size === '2' ? '4' : biggestGap.size === '3-4' ? '6' : 'menos personas'} en mesas para ${biggestGap.size} personas — el ${biggestGap.demand}% de la demanda es para ${biggestGap.size} pero solo el ${biggestGap.supply}% de las mesas son para ese tamaño.`
      } else {
        recommendation = `Exceso de mesas para ${biggestGap.size} personas — el ${biggestGap.supply}% de las mesas son para ${biggestGap.size} pero solo el ${biggestGap.demand}% de la demanda es para ese tamaño.`
      }
    }

    return NextResponse.json({ demand, supply, mismatch, recommendation })
  } catch (err) {
    console.error('[table-demand] Error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}