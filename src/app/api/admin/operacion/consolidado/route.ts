import { NextRequest, NextResponse } from 'next/server'
import { getStaffUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

const CAPACIDAD_MESAS = 45
const ASIENTOS = 210
const SERVICIOS_DIA = 3
const CAPACIDAD_CHEQUES_DIA = CAPACIDAD_MESAS * SERVICIOS_DIA
const PAGE_SIZE = 1000

const FRANJAS = [
  { key: 'almuerzo' as const, label: 'Almuerzo', hours: [12, 13, 14, 15, 16] },
  { key: 'tarde' as const, label: 'Tarde', hours: [17, 18, 19] },
  { key: 'cena' as const, label: 'Cena', hours: [20, 21, 22, 23] },
]

function extractHour(iso: string): number {
  try { return parseInt(iso.split('T')[1]?.split(':')[0] || '0', 10) } catch { return 0 }
}

function extractDate(iso: string): string {
  return iso.split('T')[0]
}

function serviceMinutes(open: string, close: string): number {
  if (!close) return 0
  const min = (new Date(close).getTime() - new Date(open).getTime()) / 60000
  return min > 0 && min < 1440 ? min : 0
}

export async function GET(request: NextRequest) {
  const staff = await getStaffUser(request)
  if (!staff) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Parametro date requerido (YYYY-MM-DD)' }, { status: 400 })
  }

  try {
    // ── Q1: Fetch all paid, non-cancelled sales for the day ──
    let allSales: any[] = []
    let offset = 0
    while (true) {
      const { data: batch, error: err } = await sb
        .from('pos_sales')
        .select('id, opened_at, closed_at, total, party_size')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('is_paid', true)
        .eq('is_cancelled', false)
        .gte('opened_at', `${date}T00:00:00`)
        .lt('opened_at', `${date}T23:59:59`)
        .order('opened_at', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1)
      if (err) throw new Error(`Sales query error: ${err.message}`)
      if (!batch || batch.length === 0) break
      allSales.push(...batch)
      if (batch.length < PAGE_SIZE) break
      offset += PAGE_SIZE
    }

    // ── Process hourly metrics & service times from sales ──
    const hourMap = new Map<number, { cheques: number; personas: number; revenue: number; service_times: number[] }>()
    const allTimes: number[] = []

    for (const s of allSales) {
      const hora = extractHour(s.opened_at)
      if (!hourMap.has(hora)) hourMap.set(hora, { cheques: 0, personas: 0, revenue: 0, service_times: [] })
      const entry = hourMap.get(hora)!
      entry.cheques++
      entry.personas += s.party_size || 0
      entry.revenue += Number(s.total) || 0

      const mins = serviceMinutes(s.opened_at, s.closed_at)
      if (mins > 0) {
        entry.service_times.push(mins)
        allTimes.push(mins)
      }
    }

    const hourly = Array.from(hourMap.entries())
      .map(([hora, e]) => {
        const validTimes = e.service_times.filter(t => t > 0)
        const avgTime = validTimes.length > 0
          ? Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length)
          : 0
        return {
          hora,
          cheques: e.cheques,
          personas: e.personas,
          revenue: Math.round(e.revenue),
          ticket_prom: Math.round(e.revenue / e.cheques),
          service_time_min: avgTime,
        }
      })
      .sort((a, b) => a.hora - b.hora)

    // ── Q5: Service time percentiles ──
    allTimes.sort((a, b) => a - b)
    const percentile = (arr: number[], p: number) => {
      if (arr.length === 0) return 0
      const idx = Math.ceil((p / 100) * arr.length) - 1
      return Math.round(arr[Math.max(0, Math.min(idx, arr.length - 1))])
    }

    const serviceTime = {
      p25: percentile(allTimes, 25),
      p50: percentile(allTimes, 50),
      p75: percentile(allTimes, 75),
      p90: percentile(allTimes, 90),
    }

    // ── Q3: Fetch sale items for this day's sales ──
    const saleIds = allSales.map(s => s.id)
    const allItems: any[] = []

    if (saleIds.length > 0) {
      const BATCH = 300
      const idBatches: string[][] = []
      for (let i = 0; i < saleIds.length; i += BATCH) {
        idBatches.push(saleIds.slice(i, i + BATCH))
      }

      const itemPromises = idBatches.map(async (batch) => {
        let items: any[] = []
        let itemOffset = 0
        while (true) {
          const { data: b } = await sb
            .from('pos_sale_items')
            .select('pos_sale_id, pos_product_id, quantity, total')
            .in('pos_sale_id', batch)
            .range(itemOffset, itemOffset + PAGE_SIZE - 1)
          if (b && b.length > 0) {
            items.push(...b)
            itemOffset += PAGE_SIZE
            if (b.length < PAGE_SIZE) break
          } else break
        }
        return items
      })
      const itemArrays = await Promise.all(itemPromises)
      allItems.push(...itemArrays.flat())
    }

    // Trim product IDs (known issue: trailing spaces in pos_product_id)
    for (const item of allItems) {
      if (typeof item.pos_product_id === 'string') {
        item.pos_product_id = item.pos_product_id.trim()
      }
    }

    // ── Fetch product names & groups ──
    const productIds = [...new Set(allItems.map((i: any) => i.pos_product_id).filter(Boolean))]
    const productMap = new Map<string, { name: string; groupId: string }>()
    const groupMap = new Map<string, string>()

    if (productIds.length > 0) {
      const BATCH = 300
      const batches: string[][] = []
      for (let i = 0; i < productIds.length; i += BATCH) {
        batches.push(productIds.slice(i, i + BATCH))
      }

      const prodPromises = batches.map(async (batch) => {
        const { data: prods } = await sb
          .from('pos_products')
          .select('pos_product_id, name, pos_group_id')
          .in('pos_product_id', batch)
        return prods || []
      })
      const prodArrays = await Promise.all(prodPromises)
      const allProds = prodArrays.flat()
      const groupIds = [...new Set(allProds.map(p => p.pos_group_id).filter(Boolean))]

      for (const p of allProds) {
        productMap.set(p.pos_product_id, { name: p.name, groupId: p.pos_group_id })
      }

      // Fetch group names
      if (groupIds.length > 0) {
        const groupBatches: string[][] = []
        for (let i = 0; i < groupIds.length; i += BATCH) {
          groupBatches.push(groupIds.slice(i, i + BATCH))
        }
        const groupPromises = groupBatches.map(async (batch) => {
          const { data: groups } = await sb
            .from('pos_product_groups')
            .select('pos_group_id, name')
            .in('pos_group_id', batch)
          return groups || []
        })
        const groupArrays = await Promise.all(groupPromises)
        for (const g of groupArrays.flat()) {
          groupMap.set(g.pos_group_id, g.name)
        }
      }
    }

    // ── Build products by hour ──
    // Create a sale-hour lookup for item processing
    const saleHourMap = new Map<string, number>()
    for (const s of allSales) {
      saleHourMap.set(s.id, extractHour(s.opened_at))
    }

    const productosPorHora = new Map<string, { hora: number; producto: string; categoria: string; cantidad: number; revenue: number }>()

    for (const item of allItems) {
      const prod = productMap.get(item.pos_product_id)
      if (!prod?.name) continue
      const hora = saleHourMap.get(item.pos_sale_id) ?? 0
      const cat = groupMap.get(prod.groupId) || 'Sin categoria'

      const key = `${hora}|${prod.name}|${cat}`
      if (!productosPorHora.has(key)) {
        productosPorHora.set(key, { hora, producto: prod.name, categoria: cat, cantidad: 0, revenue: 0 })
      }
      const entry = productosPorHora.get(key)!
      entry.cantidad += item.quantity || 0
      entry.revenue += Math.round(Number(item.total) || 0)
    }

    const productos = Array.from(productosPorHora.values()).sort((a, b) => b.revenue - a.revenue)

    // ── Q4: Market basket (top 15 products → companions) ──
    const productTotalQty: Record<string, number> = {}
    for (const p of productos) {
      productTotalQty[p.producto] = (productTotalQty[p.producto] || 0) + p.cantidad
    }
    const top15Names = Object.entries(productTotalQty)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([name]) => name)

    // Build: product → Set<pos_sale_id>
    const salesByProduct = new Map<string, Set<string>>()
    for (const item of allItems) {
      const prod = productMap.get(item.pos_product_id)
      if (!prod?.name || !top15Names.includes(prod.name)) continue
      if (!salesByProduct.has(prod.name)) salesByProduct.set(prod.name, new Set())
      salesByProduct.get(prod.name)!.add(item.pos_sale_id)
    }

    // Build: pos_sale_id → Set<product_name>
    const productsBySale = new Map<string, Set<string>>()
    for (const item of allItems) {
      const prod = productMap.get(item.pos_product_id)
      if (!prod?.name) continue
      if (!productsBySale.has(item.pos_sale_id)) productsBySale.set(item.pos_sale_id, new Set())
      productsBySale.get(item.pos_sale_id)!.add(prod.name)
    }

    const companions: { top_product: string; companion: string; veces_juntos: number; rank: number }[] = []

    for (const [topProduct, saleSet] of salesByProduct.entries()) {
      const companionCounts = new Map<string, number>()
      for (const saleId of saleSet) {
        const saleProds = productsBySale.get(saleId)
        if (!saleProds) continue
        for (const p of saleProds) {
          if (p !== topProduct) companionCounts.set(p, (companionCounts.get(p) || 0) + 1)
        }
      }
      Array.from(companionCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
        .forEach(([companion, veces], idx) => {
          companions.push({ top_product: topProduct, companion, veces_juntos: veces, rank: idx + 1 })
        })
    }

    // ── Build top products by time block ──
    const topPorFranja: Record<string, { producto: string; categoria: string; cantidad: number; revenue: number; companions: { name: string; veces: number }[] }[]> = {}

    for (const franja of FRANJAS) {
      const franjaProds: Record<string, { producto: string; categoria: string; cantidad: number; revenue: number }> = {}
      for (const p of productos) {
        if (!franja.hours.includes(p.hora)) continue
        if (!franjaProds[p.producto]) franjaProds[p.producto] = { producto: p.producto, categoria: p.categoria, cantidad: 0, revenue: 0 }
        franjaProds[p.producto].cantidad += p.cantidad
        franjaProds[p.producto].revenue += p.revenue
      }

      const top5 = Object.values(franjaProds)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      topPorFranja[franja.key] = top5.map(p => ({
        ...p,
        companions: companions
          .filter(c => c.top_product === p.producto)
          .sort((a, b) => a.rank - b.rank)
          .map(c => ({ name: c.companion, veces: c.veces_juntos })),
      }))
    }

    // ── Q6: Weekly comparison ──
    const weekStart = new Date(date + 'T00:00:00')
    weekStart.setDate(weekStart.getDate() - 3)
    const weekEnd = new Date(date + 'T00:00:00')
    weekEnd.setDate(weekEnd.getDate() + 3)
    const ws = weekStart.toISOString().split('T')[0]
    const we = weekEnd.toISOString().split('T')[0]

    const { data: weekSales, error: weekErr } = await sb
      .from('pos_sales')
      .select('opened_at, total')
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('is_paid', true)
      .eq('is_cancelled', false)
      .gte('opened_at', `${ws}T00:00:00`)
      .lt('opened_at', `${we}T23:59:59`)

    if (weekErr) throw new Error(`Week query error: ${weekErr.message}`)

    const weekMap = new Map<string, { cheques: number; revenue: number }>()
    for (const s of weekSales || []) {
      const d = extractDate(s.opened_at)
      if (!weekMap.has(d)) weekMap.set(d, { cheques: 0, revenue: 0 })
      const e = weekMap.get(d)!
      e.cheques++
      e.revenue += Number(s.total) || 0
    }

    const semana = []
    for (let i = -3; i <= 3; i++) {
      const d = new Date(date + 'T00:00:00')
      d.setDate(d.getDate() + i)
      const ds = d.toISOString().split('T')[0]
      const dow = d.getDay()
      const entry = weekMap.get(ds)
      semana.push({ date: ds, dow, cheques: entry?.cheques || 0, revenue: Math.round(entry?.revenue || 0) })
    }

    // ── Daily summary ──
    const totalCheques = hourly.reduce((s, h) => s + h.cheques, 0)
    const totalRevenue = hourly.reduce((s, h) => s + h.revenue, 0)
    const totalPersonas = hourly.reduce((s, h) => s + h.personas, 0)
    const avgTicket = totalCheques > 0 ? Math.round(totalRevenue / totalCheques) : 0
    const timesWithData = hourly.filter(h => h.service_time_min > 0)
    const avgServiceTime = timesWithData.length > 0
      ? Math.round(timesWithData.reduce((s, h) => s + h.service_time_min, 0) / timesWithData.length)
      : 0

    const almuerzoCheques = hourly.filter(h => h.hora >= 12 && h.hora <= 16).reduce((s, h) => s + h.cheques, 0)
    const tardeCheques = hourly.filter(h => h.hora >= 17 && h.hora <= 19).reduce((s, h) => s + h.cheques, 0)
    const cenaCheques = hourly.filter(h => h.hora >= 20 && h.hora <= 23).reduce((s, h) => s + h.cheques, 0)

    const capacidadPct = CAPACIDAD_CHEQUES_DIA > 0 ? Math.round((totalCheques / CAPACIDAD_CHEQUES_DIA) * 100) : 0

    return NextResponse.json({
      date,
      hourly,
      serviceTime,
      productos,
      companions,
      topPorFranja,
      semana,
      resumen: {
        totalCheques,
        totalRevenue,
        totalPersonas,
        avgTicket,
        avgServiceTime,
        capacidadPct,
        capacidadChequesDia: CAPACIDAD_CHEQUES_DIA,
        capacidadMesas: CAPACIDAD_MESAS,
        asientos: ASIENTOS,
        almuerzoCheques,
        tardeCheques,
        cenaCheques,
        almuerzoCap: CAPACIDAD_MESAS,
        tardeCap: CAPACIDAD_MESAS,
        cenaCap: CAPACIDAD_MESAS,
      },
    })
  } catch (err: any) {
    console.error('[consolidado] Error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
