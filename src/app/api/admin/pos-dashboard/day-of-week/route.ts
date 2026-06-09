import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

// ── Helpers ──────────────────────────────────────────────
function qparam(request: NextRequest, key: string): string | null {
  return request.nextUrl.searchParams.get(key)
}

const BATCH = 200 // Supabase .in() with UUIDs fails silently beyond ~200 IDs
const RESTAURANT_ID = 'a0000000-0000-0000-0000-000000000001'

/**
 * Convert JS Date.getDay() (0=Sunday … 6=Saturday) to ISO ISODOW (1=Monday … 7=Sunday).
 */
function jsDayToIsoDow(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay
}

/** Fetch payment methods for a set of sale IDs */
async function fetchPaymentMethodsForSales(
  sb: any,
  saleIds: string[]
): Promise<{ method: string; amount: number; count: number; pct: number }[]> {
  if (saleIds.length === 0) return []

  let allPayments: any[] = []
  for (let i = 0; i < saleIds.length; i += BATCH) {
    const batch = saleIds.slice(i, i + BATCH)
    const { data: payData } = await sb
      .from('pos_sale_payments')
      .select('pos_sale_id, pos_payment_method_id, amount')
      .in('pos_sale_id', batch)
    if (payData) allPayments.push(...payData)
  }

  const methodIds = [...new Set(allPayments.map((p: any) => p.pos_payment_method_id).filter(Boolean))]
  const methodNames = new Map<string, string>()
  for (let i = 0; i < methodIds.length; i += BATCH) {
    const batch = methodIds.slice(i, i + BATCH)
    const { data: methods } = await sb
      .from('pos_payment_methods')
      .select('pos_payment_method_id, name')
      .in('pos_payment_method_id', batch)
    if (methods) {
      for (const m of methods) methodNames.set(m.pos_payment_method_id, m.name)
    }
  }

  const paymentMap = new Map<string, { amount: number; count: number }>()
  for (const p of allPayments) {
    const mName = methodNames.get(p.pos_payment_method_id) || 'Otro'
    if (!paymentMap.has(mName)) paymentMap.set(mName, { amount: 0, count: 0 })
    const d = paymentMap.get(mName)!
    d.amount += Number(p.amount) || 0
    d.count += 1
  }
  const totalAmount = [...paymentMap.values()].reduce((s, d) => s + d.amount, 0)

  return [...paymentMap.entries()]
    .map(([method, d]) => ({
      method,
      amount: Math.round(d.amount),
      count: d.count,
      pct: totalAmount > 0 ? Math.round((d.amount / totalAmount) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
}

// ── Main handler ─────────────────────────────────────────
export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()

  // ── Parse params ──
  const dayOfWeekParam = qparam(request, 'dayOfWeek')
  const fromParam = qparam(request, 'from') || ''
  const toParam = qparam(request, 'to') || ''
  const zoneParam = qparam(request, 'zone') || 'all'
  const categoryParam = qparam(request, 'category') || 'all'

  if (!dayOfWeekParam) {
    return NextResponse.json({ error: 'dayOfWeek es requerido (1-7)' }, { status: 400 })
  }

  const dayOfWeek = parseInt(dayOfWeekParam, 10)
  if (isNaN(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) {
    return NextResponse.json({ error: 'dayOfWeek debe ser un entero entre 1 (Lunes) y 7 (Domingo)' }, { status: 400 })
  }

  // ── Auto-detect date range if not provided ──
  let from = fromParam
  let to = toParam
  if (!from || !to) {
    const { data: dateRange } = await sb
      .from('pos_sales')
      .select('opened_at')
      .eq('is_paid', true)
      .eq('is_cancelled', false)
      .order('opened_at', { ascending: false })
      .limit(1)
    if (dateRange && dateRange.length > 0) {
      const latest = new Date(dateRange[0].opened_at)
      const y = latest.getFullYear()
      const m = latest.getMonth()
      from = from || `${y}-${String(m + 1).padStart(2, '0')}-01`
      const lastDay = new Date(y, m + 1, 0).getDate()
      to = to || `${y}-${String(m + 1).padStart(2, '0')}-${lastDay}`
    } else {
      from = from || '2026-01-01'
      to = to || '2026-12-31'
    }
  }

  const fromDate = `${from}T00:00:00`
  const toDate = `${to}T23:59:59`

  // ── Available months ──
  const { data: monthsData } = await sb.rpc('pos_dashboard_months')
  const availableMonths = (monthsData || []).map((m: any) => m.month)
  // Also gather from the sales themselves as a fallback
  if (availableMonths.length === 0) {
    const monthSet = new Set<string>()
    for (const s of []) { /* sales not yet fetched */ }
  }

  // ── Fetch groups list (for categoryList) ──
  const { data: allGroupsData } = await sb
    .from('pos_product_groups')
    .select('pos_group_id, name')
    .order('pos_group_id')
  const allGroups = (allGroupsData || []) as any[]

  // ════════════════════════════════════════════════════════════
  // 1. Fetch all sales in date range, filter client-side by ISODOW
  // ════════════════════════════════════════════════════════════
  let allSales: any[] = []
  let salesOffset = 0
  const SALES_PAGE = 900
  while (true) {
    const { data: salesBatch, error } = await sb
      .from('pos_sales')
      .select('id, total, tip_amount, opened_at, closed_at, party_size, derived_zone_name, is_cancelled, pos_staff_id, customer_id, pos_customer_id')
      .eq('restaurant_id', RESTAURANT_ID)
      .gte('opened_at', fromDate)
      .lte('opened_at', toDate)
      .eq('is_cancelled', false)
      .range(salesOffset, salesOffset + SALES_PAGE - 1)
      .order('opened_at', { ascending: true })

    if (error || !salesBatch || salesBatch.length === 0) break
    allSales.push(...salesBatch)
    salesOffset += SALES_PAGE
    if (salesBatch.length < SALES_PAGE) break
  }

  // Filter by day of week (ISODOW)
  const filteredSales = allSales.filter((s: any) => {
    if (!s.opened_at) return false
    const jsDay = new Date(s.opened_at).getDay()
    const isoDay = jsDayToIsoDow(jsDay)
    return isoDay === dayOfWeek
  })

  // Apply zone filter
  let sales = filteredSales
  if (zoneParam && zoneParam !== 'all') {
    sales = sales.filter((s: any) => (s.derived_zone_name || 'Desconocido') === zoneParam)
  }

  const saleIds = sales.map((s: any) => s.id)
  const saleMap = new Map<string, any>()
  for (const s of sales) saleMap.set(s.id, s)

  // ── Count distinct dates for dayCount ──
  const distinctDates = new Set<string>()
  for (const s of sales) {
    if (s.opened_at) distinctDates.add(s.opened_at.slice(0, 10))
  }
  const dayCount = distinctDates.size

  // ════════════════════════════════════════════════════════════
  // 2. Fetch all items for these sales (batched)
  // ════════════════════════════════════════════════════════════
  let allItems: any[] = []
  if (saleIds.length > 0) {
    const saleBatches: string[][] = []
    for (let i = 0; i < saleIds.length; i += BATCH) {
      saleBatches.push(saleIds.slice(i, i + BATCH))
    }

    const itemPromises = saleBatches.map(async (batch) => {
      let items: any[] = []
      let itemOffset = 0
      const ITEM_PAGE = 900
      while (true) {
        const { data: batchData } = await sb
          .from('pos_sale_items')
          .select('pos_sale_id, pos_product_id, quantity, unit_price')
          .in('pos_sale_id', batch)
          .range(itemOffset, itemOffset + ITEM_PAGE - 1)
        if (batchData && batchData.length > 0) {
          items.push(...batchData)
          itemOffset += ITEM_PAGE
          if (batchData.length < ITEM_PAGE) break
        } else break
      }
      return items
    })
    const itemArrays = await Promise.all(itemPromises)
    allItems = itemArrays.flat()
  }

  // Trim product IDs
  for (const item of allItems) {
    if (item.pos_product_id && typeof item.pos_product_id === 'string') {
      item.pos_product_id = item.pos_product_id.trim()
    }
  }

  // ════════════════════════════════════════════════════════════
  // 3. Product info & group names
  // ════════════════════════════════════════════════════════════
  const productIdsForQuery = [...new Set(allItems.map((i: any) => i.pos_product_id).filter(Boolean))]
  const productInfo = new Map<string, { name: string; groupId: string }>()
  if (productIdsForQuery.length > 0) {
    const prodBatches: string[][] = []
    for (let i = 0; i < productIdsForQuery.length; i += BATCH) {
      prodBatches.push(productIdsForQuery.slice(i, i + BATCH))
    }
    const prodPromises = prodBatches.map(async (batch) => {
      const { data: prods } = await sb
        .from('pos_products')
        .select('pos_product_id, name, pos_group_id')
        .in('pos_product_id', batch)
      return prods || []
    })
    const prodArrays = await Promise.all(prodPromises)
    for (const p of prodArrays.flat()) {
      productInfo.set((p.pos_product_id || '').trim(), { name: p.name, groupId: p.pos_group_id || '' })
    }
  }

  const groupIds = [...new Set([...productInfo.values()].map(p => p.groupId).filter(Boolean))]
  const groupNames = new Map<string, string>()
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
      groupNames.set(g.pos_group_id, g.name)
    }
  }

  // Also merge groups from the full groups list
  for (const g of allGroups) {
    if (g.pos_group_id && !groupNames.has(g.pos_group_id)) {
      groupNames.set(g.pos_group_id, g.name)
    }
  }

  // ════════════════════════════════════════════════════════════
  // 4. KPIs
  // ════════════════════════════════════════════════════════════
  const totalRevenue = sales.reduce((s: number, r: any) => s + (Number(r.total) || 0), 0)
  const cheques = sales.length
  const totalTip = sales.reduce((s: number, r: any) => s + (Number(r.tip_amount) || 0), 0)
  const totalPartySize = sales.reduce((s: number, r: any) => s + (Number(r.party_size) || 0), 0)

  let serviceTimeSum = 0
  let serviceTimeCount = 0
  for (const s of sales) {
    if (s.opened_at && s.closed_at) {
      const diff = (new Date(s.closed_at).getTime() - new Date(s.opened_at).getTime()) / 60000
      if (diff > 0) {
        serviceTimeSum += diff
        serviceTimeCount += 1
      }
    }
  }

  // ── Card/Cash totals from payment methods ──
  let cardPaidTotal = 0
  let cashPaidTotal = 0
  if (saleIds.length > 0) {
    let allPaymentsForKpi: any[] = []
    for (let i = 0; i < saleIds.length; i += BATCH) {
      const batch = saleIds.slice(i, i + BATCH)
      const { data: payData } = await sb
        .from('pos_sale_payments')
        .select('pos_sale_id, pos_payment_method_id, amount')
        .in('pos_sale_id', batch)
      if (payData) allPaymentsForKpi.push(...payData)
    }
    const methodIdsForKpi = [...new Set(allPaymentsForKpi.map((p: any) => p.pos_payment_method_id).filter(Boolean))]
    const methodNamesForKpi = new Map<string, string>()
    for (let i = 0; i < methodIdsForKpi.length; i += BATCH) {
      const batch = methodIdsForKpi.slice(i, i + BATCH)
      const { data: methods } = await sb
        .from('pos_payment_methods')
        .select('pos_payment_method_id, name')
        .in('pos_payment_method_id', batch)
      if (methods) {
        for (const m of methods) methodNamesForKpi.set(m.pos_payment_method_id, m.name)
      }
    }
    for (const p of allPaymentsForKpi) {
      const mName = (methodNamesForKpi.get(p.pos_payment_method_id) || '').toLowerCase()
      const amt = Number(p.amount) || 0
      if (mName.includes('tarjeta') || mName.includes('card') || mName.includes('credito') || mName.includes('crédito') || mName.includes('credit')) {
        cardPaidTotal += amt
      } else if (mName.includes('efectivo') || mName.includes('cash') || mName.includes('cash_paid')) {
        cashPaidTotal += amt
      }
    }
  }

  const kpis = {
    revenue: Math.round(totalRevenue),
    cheques,
    ticketPromedio: cheques > 0 ? Math.round(totalRevenue / cheques) : 0,
    propinaTotal: Math.round(totalTip),
    propinaPromedio: cheques > 0 ? Math.round(totalTip / cheques) : 0,
    personas: totalPartySize,
    partySizePromedio: cheques > 0 ? Math.round((totalPartySize / cheques) * 10) / 10 : 0,
    cardPaidTotal: Math.round(cardPaidTotal),
    cashPaidTotal: Math.round(cashPaidTotal),
    avgServiceTime: serviceTimeCount > 0 ? Math.round(serviceTimeSum / serviceTimeCount) : 0,
  }

  // ════════════════════════════════════════════════════════════
  // 5. By Zone
  // ════════════════════════════════════════════════════════════
  const zoneAgg = new Map<string, { revenue: number; cheques: number; tipTotal: number; serviceTimeSum: number; serviceTimeCount: number }>()
  for (const s of sales) {
    const zone = s.derived_zone_name || 'Desconocido'
    if (!zoneAgg.has(zone)) {
      zoneAgg.set(zone, { revenue: 0, cheques: 0, tipTotal: 0, serviceTimeSum: 0, serviceTimeCount: 0 })
    }
    const d = zoneAgg.get(zone)!
    d.revenue += Number(s.total) || 0
    d.cheques += 1
    d.tipTotal += Number(s.tip_amount) || 0
    if (s.opened_at && s.closed_at) {
      const diff = (new Date(s.closed_at).getTime() - new Date(s.opened_at).getTime()) / 60000
      if (diff > 0) {
        d.serviceTimeSum += diff
        d.serviceTimeCount += 1
      }
    }
  }

  const totalZoneRevenue = [...zoneAgg.values()].reduce((s, d) => s + d.revenue, 0)
  const byZone = [...zoneAgg.entries()]
    .filter(([zone]) => zone !== 'Desconocido')
    .map(([zone, d]) => ({
      zone,
      revenue: Math.round(d.revenue),
      cheques: d.cheques,
      ticketPromedio: d.cheques > 0 ? Math.round(d.revenue / d.cheques) : 0,
      propinaTotal: Math.round(d.tipTotal),
      pct: totalZoneRevenue > 0 ? Math.round((d.revenue / totalZoneRevenue) * 100) : 0,
      avgServiceTime: d.serviceTimeCount > 0 ? Math.round(d.serviceTimeSum / d.serviceTimeCount) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // ── Unknown zone ──
  const unknownZone = (() => {
    const unk = zoneAgg.get('Desconocido')
    if (unk) {
      return {
        revenue: Math.round(unk.revenue),
        cheques: unk.cheques,
        pct: totalZoneRevenue > 0 ? Math.round((unk.revenue / (totalZoneRevenue + unk.revenue)) * 100) : 0,
      }
    }
    return { revenue: 0, cheques: 0, pct: 0 }
  })()

  // ════════════════════════════════════════════════════════════
  // 6. Hourly Revenue
  // ════════════════════════════════════════════════════════════
  // Payment methods per sale for hourly card/cash breakdown
  const salePaymentMap = new Map<string, { card: number; cash: number }>()
  if (saleIds.length > 0) {
    let allPayForHourly: any[] = []
    for (let i = 0; i < saleIds.length; i += BATCH) {
      const batch = saleIds.slice(i, i + BATCH)
      const { data: payData } = await sb
        .from('pos_sale_payments')
        .select('pos_sale_id, pos_payment_method_id, amount')
        .in('pos_sale_id', batch)
      if (payData) allPayForHourly.push(...payData)
    }
    const methodIdsHourly = [...new Set(allPayForHourly.map((p: any) => p.pos_payment_method_id).filter(Boolean))]
    const methodNamesHourly = new Map<string, string>()
    for (let i = 0; i < methodIdsHourly.length; i += BATCH) {
      const batch = methodIdsHourly.slice(i, i + BATCH)
      const { data: methods } = await sb
        .from('pos_payment_methods')
        .select('pos_payment_method_id, name')
        .in('pos_payment_method_id', batch)
      if (methods) {
        for (const m of methods) methodNamesHourly.set(m.pos_payment_method_id, m.name)
      }
    }
    for (const p of allPayForHourly) {
      const mName = (methodNamesHourly.get(p.pos_payment_method_id) || '').toLowerCase()
      const amt = Number(p.amount) || 0
      if (!salePaymentMap.has(p.pos_sale_id)) salePaymentMap.set(p.pos_sale_id, { card: 0, cash: 0 })
      const entry = salePaymentMap.get(p.pos_sale_id)!
      if (mName.includes('tarjeta') || mName.includes('card') || mName.includes('credito') || mName.includes('crédito') || mName.includes('credit')) {
        entry.card += amt
      } else if (mName.includes('efectivo') || mName.includes('cash') || mName.includes('cash_paid')) {
        entry.cash += amt
      }
    }
  }

  const hourAgg = new Map<number, { revenue: number; cheques: number; tipTotal: number; cardPaidTotal: number; cashPaidTotal: number }>()
  for (const s of sales) {
    if (!s.opened_at) continue
    const hour = new Date(s.opened_at).getHours()
    if (!hourAgg.has(hour)) {
      hourAgg.set(hour, { revenue: 0, cheques: 0, tipTotal: 0, cardPaidTotal: 0, cashPaidTotal: 0 })
    }
    const d = hourAgg.get(hour)!
    d.revenue += Number(s.total) || 0
    d.cheques += 1
    d.tipTotal += Number(s.tip_amount) || 0
    const payInfo = salePaymentMap.get(s.id)
    if (payInfo) {
      d.cardPaidTotal += payInfo.card
      d.cashPaidTotal += payInfo.cash
    }
  }

  const hourlyRevenue = [...hourAgg.entries()]
    .map(([hour, d]) => ({
      hour: String(hour),
      revenue: Math.round(d.revenue),
      cheques: d.cheques,
      tipTotal: Math.round(d.tipTotal),
      cardPaidTotal: Math.round(d.cardPaidTotal),
      cashPaidTotal: Math.round(d.cashPaidTotal),
    }))
    .sort((a, b) => parseInt(a.hour) - parseInt(b.hour))

  // ════════════════════════════════════════════════════════════
  // 7. Daily Trend
  // ════════════════════════════════════════════════════════════
  const dayMap = new Map<string, { revenue: number; cheques: number; propina: number; personas: number }>()
  for (const s of sales) {
    if (!s.opened_at) continue
    const date = s.opened_at.slice(0, 10)
    if (!dayMap.has(date)) dayMap.set(date, { revenue: 0, cheques: 0, propina: 0, personas: 0 })
    const d = dayMap.get(date)!
    d.revenue += Number(s.total) || 0
    d.cheques += 1
    d.propina += Number(s.tip_amount) || 0
    d.personas += Number(s.party_size) || 0
  }
  const dailyTrend = [...dayMap.entries()]
    .map(([date, d]) => ({
      date,
      revenue: Math.round(d.revenue),
      cheques: d.cheques,
      propina: Math.round(d.propina),
      personas: d.personas,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // ════════════════════════════════════════════════════════════
  // 8. Top Products
  // ════════════════════════════════════════════════════════════
  // Apply category filter for topProducts
  let filteredItems = allItems
  if (categoryParam && categoryParam !== 'all') {
    const categoryProductIds = new Set(
      [...productInfo.entries()]
        .filter(([, info]) => info.groupId === categoryParam)
        .map(([pid]) => pid)
    )
    filteredItems = allItems.filter((item: any) => categoryProductIds.has(String(item.pos_product_id)))
  }

  const productRevenueMap = new Map<string, { name: string; category: string; quantity: number; revenue: number }>()
  for (const item of filteredItems) {
    const info = productInfo.get(item.pos_product_id)
    if (!info) continue
    const cat = groupNames.get(info.groupId) || 'Sin categoria'
    const key = item.pos_product_id
    if (!productRevenueMap.has(key)) {
      productRevenueMap.set(key, { name: info.name, category: cat, quantity: 0, revenue: 0 })
    }
    const d = productRevenueMap.get(key)!
    d.quantity += Number(item.quantity) || 0
    d.revenue += (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
  }

  const topProducts = [...productRevenueMap.entries()]
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .slice(0, 15)
    .map(([productId, p]) => ({
      productId,
      productName: p.name || 'Sin nombre',
      category: p.category,
      quantity: p.quantity,
      revenue: Math.round(p.revenue),
    }))

  // ════════════════════════════════════════════════════════════
  // 9. Top Categories (with enrichment: tipTotal, avgServiceTime, partySizeAvg)
  // ════════════════════════════════════════════════════════════
  const saleToCategories = new Map<string, Set<string>>()
  const categoryRevenueMap = new Map<string, {
    categoryName: string; quantity: number; revenue: number; cheques: Set<string>
  }>()

  for (const item of allItems) {
    const info = productInfo.get(item.pos_product_id)
    if (!info || !info.groupId) continue

    // Track category per sale for companions
    if (!saleToCategories.has(item.pos_sale_id)) saleToCategories.set(item.pos_sale_id, new Set())
    saleToCategories.get(item.pos_sale_id)!.add(info.groupId)

    const catName = groupNames.get(info.groupId) || 'Sin categoria'
    const catKey = info.groupId || catName
    if (!categoryRevenueMap.has(catKey)) {
      categoryRevenueMap.set(catKey, { categoryName: catName, quantity: 0, revenue: 0, cheques: new Set() })
    }
    const d = categoryRevenueMap.get(catKey)!
    d.quantity += Number(item.quantity) || 0
    d.revenue += (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
    d.cheques.add(item.pos_sale_id)
  }

  // Enrich categories with tip, service time, party size from sales
  const allCategorySaleIds = [...new Set([...categoryRevenueMap.values()].flatMap(d => [...d.cheques]))]
  const saleEnrichment = new Map<string, { tip: number; partySize: number; serviceMin: number }>()
  if (allCategorySaleIds.length > 0) {
    const enrichBatches: string[][] = []
    for (let i = 0; i < allCategorySaleIds.length; i += BATCH) {
      enrichBatches.push(allCategorySaleIds.slice(i, i + BATCH))
    }
    const enrichPromises = enrichBatches.map(async (batch) => {
      const { data: salesData } = await sb
        .from('pos_sales')
        .select('id, tip_amount, party_size, opened_at, closed_at')
        .in('id', batch)
      return salesData || []
    })
    const enrichArrays = await Promise.all(enrichPromises)
    for (const s of enrichArrays.flat()) {
      let serviceMin = 0
      if (s.opened_at && s.closed_at) {
        const diff = (new Date(s.closed_at).getTime() - new Date(s.opened_at).getTime()) / 60000
        if (diff > 0) serviceMin = diff
      }
      saleEnrichment.set(s.id, {
        tip: Number(s.tip_amount) || 0,
        partySize: Number(s.party_size) || 0,
        serviceMin,
      })
    }
  }

  const topCategories = [...categoryRevenueMap.entries()]
    .map(([categoryId, d]) => {
      let tipTotal = 0
      let partySizeSum = 0
      let partySizeCount = 0
      let serviceTimeSum = 0
      let serviceTimeCount = 0
      for (const saleId of d.cheques) {
        const enrich = saleEnrichment.get(saleId)
        if (!enrich) continue
        tipTotal += enrich.tip
        partySizeSum += enrich.partySize
        partySizeCount += 1
        if (enrich.serviceMin > 0) {
          serviceTimeSum += enrich.serviceMin
          serviceTimeCount += 1
        }
      }
      return {
        categoryId,
        categoryName: d.categoryName,
        quantity: d.quantity,
        revenue: Math.round(d.revenue),
        cheques: d.cheques.size,
        tipTotal: Math.round(tipTotal),
        tipAvg: d.cheques.size > 0 ? Math.round(tipTotal / d.cheques.size) : 0,
        avgServiceTime: serviceTimeCount > 0 ? Math.round(serviceTimeSum / serviceTimeCount) : 0,
        partySizeAvg: partySizeCount > 0 ? Math.round((partySizeSum / partySizeCount) * 10) / 10 : 0,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)

  // ════════════════════════════════════════════════════════════
  // 10. Products by Category + Top Product by Category + Top/Bottom Performers
  // ════════════════════════════════════════════════════════════
  const perCatProduct = new Map<string, Map<string, { quantity: number; revenue: number }>>()
  for (const item of allItems) {
    const info = productInfo.get(item.pos_product_id)
    if (!info || !info.groupId) continue
    if (!perCatProduct.has(info.groupId)) perCatProduct.set(info.groupId, new Map())
    const catMap = perCatProduct.get(info.groupId)!
    if (!catMap.has(item.pos_product_id)) catMap.set(item.pos_product_id, { quantity: 0, revenue: 0 })
    const d = catMap.get(item.pos_product_id)!
    d.quantity += Number(item.quantity) || 0
    d.revenue += (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
  }

  // Product-level cheques
  const productSaleIds = new Map<string, Set<string>>()
  for (const item of allItems) {
    const pid = item.pos_product_id
    if (!productSaleIds.has(pid)) productSaleIds.set(pid, new Set())
    productSaleIds.get(pid)!.add(item.pos_sale_id)
  }

  const productsByCategory: Record<string, Array<{
    productId: string; productName: string; quantity: number; revenue: number; cheques: number
  }>> = {}
  for (const [catId, prodMap] of perCatProduct.entries()) {
    const products = [...prodMap.entries()]
      .map(([prodId, stats]) => {
        const info = productInfo.get(prodId)
        return {
          productId: prodId,
          productName: info?.name || 'Desconocido',
          quantity: stats.quantity,
          revenue: Math.round(stats.revenue),
          cheques: productSaleIds.get(prodId)?.size || 0,
        }
      })
      .sort((a, b) => b.revenue - a.revenue)
    productsByCategory[String(catId)] = products
  }

  // Top Product by Category
  const topProductByCategory = [...perCatProduct.entries()]
    .map(([groupId, prodMap]) => {
      let topProd = { productId: '', productName: '', quantity: 0, revenue: 0 }
      for (const [prodId, stats] of prodMap.entries()) {
        if (stats.revenue > topProd.revenue) {
          const info = productInfo.get(prodId)
          topProd = { productId: prodId, productName: info?.name || 'Desconocido', quantity: stats.quantity, revenue: stats.revenue }
        }
      }
      return {
        categoryId: groupId,
        categoryName: groupNames.get(groupId) || 'Sin categoria',
        ...topProd,
        revenue: Math.round(topProd.revenue),
      }
    })
    .filter(c => c.categoryName !== 'Sin categoria')
    .sort((a, b) => b.revenue - a.revenue)

  // Top & Bottom Performers per Category
  const topPerformersByCategory: Record<string, Array<{ productId: string; productName: string; quantity: number; revenue: number; cheques: number }>> = {}
  const bottomPerformersByCategory: Record<string, Array<{ productId: string; productName: string; quantity: number; revenue: number; cheques: number }>> = {}
  for (const [catId, prodMap] of perCatProduct.entries()) {
    const allProds = [...prodMap.entries()]
      .map(([prodId, stats]) => {
        const info = productInfo.get(prodId)
        return {
          productId: prodId,
          productName: info?.name || 'Desconocido',
          quantity: stats.quantity,
          revenue: Math.round(stats.revenue),
          cheques: productSaleIds.get(prodId)?.size || 0,
        }
      })
      .sort((a, b) => b.revenue - a.revenue)
    const key = String(catId)
    topPerformersByCategory[key] = allProds.slice(0, 2)
    bottomPerformersByCategory[key] = allProds.length > 2 ? allProds.slice(-2).reverse() : []
  }

  // ── Category List ──
  const categoriesWithProducts = new Set(Array.from(productInfo.values()).map(v => v.groupId).filter(Boolean))
  const categoryList = allGroups
    .filter((g: any) => g.pos_group_id && !g.pos_group_id.startsWith('SG_') && categoriesWithProducts.has(g.pos_group_id))
    .map((g: any) => ({ id: g.pos_group_id, name: g.name }))

  // ════════════════════════════════════════════════════════════
  // 11. Staff Performance
  // ════════════════════════════════════════════════════════════
  const staffAgg = new Map<string, { cheques: number; revenue: number; tipTotal: number }>()
  for (const s of sales) {
    const staffId = s.pos_staff_id
    if (!staffId) continue
    if (!staffAgg.has(staffId)) staffAgg.set(staffId, { cheques: 0, revenue: 0, tipTotal: 0 })
    const d = staffAgg.get(staffId)!
    d.cheques += 1
    d.revenue += Number(s.total) || 0
    d.tipTotal += Number(s.tip_amount) || 0
  }

  // Resolve staff names
  const staffIds = [...staffAgg.keys()]
  const staffNames = new Map<string, { name: string; staffType: number }>()
  if (staffIds.length > 0) {
    const staffBatches: string[][] = []
    for (let i = 0; i < staffIds.length; i += BATCH) {
      staffBatches.push(staffIds.slice(i, i + BATCH))
    }
    const staffPromises = staffBatches.map(async (batch) => {
      const { data: staffData } = await sb
        .from('pos_staff')
        .select('pos_staff_id, name, staff_type')
        .in('pos_staff_id', batch)
      return staffData || []
    })
    const staffArrays = await Promise.all(staffPromises)
    for (const st of staffArrays.flat()) {
      staffNames.set(st.pos_staff_id, { name: st.name, staffType: Number(st.staff_type) || 0 })
    }
  }

  const staffPerformance = [...staffAgg.entries()]
    .map(([staffId, d]) => {
      const info = staffNames.get(staffId)
      return {
        staffId,
        staffName: info?.name || 'Desconocido',
        staffType: info?.staffType || 0,
        cheques: d.cheques,
        revenue: Math.round(d.revenue),
        propinaTotal: Math.round(d.tipTotal),
        ticketPromedio: d.cheques > 0 ? Math.round(d.revenue / d.cheques) : 0,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)

  // ════════════════════════════════════════════════════════════
  // 12. Payment Methods
  // ════════════════════════════════════════════════════════════
  const paymentMethods = await fetchPaymentMethodsForSales(sb, saleIds)

  // ════════════════════════════════════════════════════════════
  // 13. Category Companions
  // ════════════════════════════════════════════════════════════
  const pairMap = new Map<string, { cat1Id: string; cat1Name: string; cat2Id: string; cat2Name: string; sharedCheques: number }>()
  for (const [, catSet] of saleToCategories.entries()) {
    const catIdsArr = [...catSet.values()]
    if (catIdsArr.length < 2) continue
    catIdsArr.sort()
    for (let i = 0; i < catIdsArr.length; i++) {
      for (let j = i + 1; j < catIdsArr.length; j++) {
        const pairKey = `${catIdsArr[i]}|${catIdsArr[j]}`
        if (!pairMap.has(pairKey)) {
          pairMap.set(pairKey, {
            cat1Id: catIdsArr[i],
            cat1Name: groupNames.get(catIdsArr[i]) || catIdsArr[i],
            cat2Id: catIdsArr[j],
            cat2Name: groupNames.get(catIdsArr[j]) || catIdsArr[j],
            sharedCheques: 0,
          })
        }
        pairMap.get(pairKey)!.sharedCheques += 1
      }
    }
  }

  const categoryCompanions = [...pairMap.values()]
    .sort((a, b) => b.sharedCheques - a.sharedCheques)
    .slice(0, 20)

  // ════════════════════════════════════════════════════════════
  // 14. Client Split & Client Tiers
  // ════════════════════════════════════════════════════════════
  const consumidorFinalSales = sales.filter((s: any) => !s.customer_id && !s.pos_customer_id)
  const identificadosSales = sales.filter((s: any) => s.customer_id || s.pos_customer_id)
  const consumidorFinalRevenue = consumidorFinalSales.reduce((s: number, r: any) => s + (Number(r.total) || 0), 0)
  const identificadosRevenue = identificadosSales.reduce((s: number, r: any) => s + (Number(r.total) || 0), 0)
  const clientSplit = {
    consumidorFinal: { cheques: consumidorFinalSales.length, revenue: Math.round(consumidorFinalRevenue) },
    identificados: { cheques: identificadosSales.length, revenue: Math.round(identificadosRevenue) },
  }

  // Client Tiers
  let customerIdSet = new Set<string>()
  for (const s of sales) {
    const cid = s.customer_id || s.pos_customer_id
    if (cid) customerIdSet.add(cid)
  }
  const customerIds = [...customerIdSet]
  const tierMap = new Map<string, { count: number; totalSpent: number }>()
  if (customerIds.length > 0) {
    const custBatches: string[][] = []
    for (let i = 0; i < customerIds.length; i += BATCH) {
      custBatches.push(customerIds.slice(i, i + BATCH))
    }
    const tierPromises = custBatches.map(async (batch) => {
      const { data: tierData } = await sb
        .from('customer_stats')
        .select('loyalty_tier, total_spent')
        .in('customer_id', batch)
        .not('loyalty_tier', 'is', null)
      return tierData || []
    })
    const tierArrays = await Promise.all(tierPromises)
    for (const t of tierArrays.flat()) {
      const tier = t.loyalty_tier
      if (!tier) continue
      if (!tierMap.has(tier)) tierMap.set(tier, { count: 0, totalSpent: 0 })
      const d = tierMap.get(tier)!
      d.count += 1
      d.totalSpent += Number(t.total_spent) || 0
    }
  }
  const clientTiers = [...tierMap.entries()]
    .map(([tier, d]) => ({ tier, count: d.count, totalSpent: Math.round(d.totalSpent) }))
    .sort((a, b) => {
      const order = ['vip', 'oro', 'plata', 'bronce', 'new', 'none', 'occasional', 'regular']
      return order.indexOf(a.tier.toLowerCase()) - order.indexOf(b.tier.toLowerCase())
    })

  // ════════════════════════════════════════════════════════════
  // 15. Shifts
  // ════════════════════════════════════════════════════════════
  const { data: shiftsData } = await sb
    .from('pos_shifts')
    .select('pos_shift_id, station, cashier, cash_total, card_total, credit_total, opened_at, closed_at, is_closed')
    .gte('opened_at', fromDate)
    .lte('opened_at', toDate)
    .order('opened_at', { ascending: false })
    .range(0, 9)
  const shifts = (shiftsData || []).map((s: any) => ({
    shiftId: s.pos_shift_id,
    station: s.station,
    cashier: s.cashier,
    cashTotal: Number(s.cash_total) || 0,
    cardTotal: Number(s.card_total) || 0,
    creditTotal: Number(s.credit_total) || 0,
    openedAt: s.opened_at,
    closedAt: s.closed_at,
    isClosed: s.is_closed,
  }))

  // ════════════════════════════════════════════════════════════
  // 16. By Zone Payment
  // ════════════════════════════════════════════════════════════
  // Build zone -> payments map from sales + payment data already fetched
  const zonePayments = new Map<string, Map<string, { amount: number; count: number }>>()
  // We need payment data per sale, and we know the zone per sale
  // Re-fetch zone-payment mapping using the existing payment data
  if (saleIds.length > 0) {
    // Get all payments grouped by sale
    let allPaymentsByZone: any[] = []
    for (let i = 0; i < saleIds.length; i += BATCH) {
      const batch = saleIds.slice(i, i + BATCH)
      const { data: payData } = await sb
        .from('pos_sale_payments')
        .select('pos_sale_id, pos_payment_method_id, amount')
        .in('pos_sale_id', batch)
      if (payData) allPaymentsByZone.push(...payData)
    }

    const methodIdsZP = [...new Set(allPaymentsByZone.map((p: any) => p.pos_payment_method_id).filter(Boolean))]
    const methodNamesZP = new Map<string, string>()
    for (let i = 0; i < methodIdsZP.length; i += BATCH) {
      const batch = methodIdsZP.slice(i, i + BATCH)
      const { data: methods } = await sb
        .from('pos_payment_methods')
        .select('pos_payment_method_id, name')
        .in('pos_payment_method_id', batch)
      if (methods) {
        for (const m of methods) methodNamesZP.set(m.pos_payment_method_id, m.name)
      }
    }

    for (const p of allPaymentsByZone) {
      const sale = saleMap.get(p.pos_sale_id)
      if (!sale) continue
      const zone = sale.derived_zone_name || 'Desconocido'
      const mName = methodNamesZP.get(p.pos_payment_method_id) || 'Otro'
      if (!zonePayments.has(zone)) zonePayments.set(zone, new Map())
      const zMap = zonePayments.get(zone)!
      if (!zMap.has(mName)) zMap.set(mName, { amount: 0, count: 0 })
      const d = zMap.get(mName)!
      d.amount += Number(p.amount) || 0
      d.count += 1
    }
  }

  const byZonePayment = [...zonePayments.entries()]
    .map(([zone, methods]) => {
      const sorted = [...methods.entries()]
        .map(([method, d]) => ({ method, amount: Math.round(d.amount), count: d.count }))
        .sort((a, b) => b.amount - a.amount)
      const total = sorted.reduce((s, m) => s + m.amount, 0)
      return {
        zone,
        methods: sorted.map(m => ({
          ...m,
          pct: total > 0 ? Math.round((m.amount / total) * 100) : 0,
        })),
      }
    })
    .sort((a, b) => {
      const totalA = a.methods.reduce((s, m) => s + m.amount, 0)
      const totalB = b.methods.reduce((s, m) => s + m.amount, 0)
      return totalB - totalA
    })

  // ════════════════════════════════════════════════════════════
  // 17. Items Revenue Total
  // ════════════════════════════════════════════════════════════
  const itemsRevenueTotal = Math.round(
    allItems.reduce((s: number, item: any) => s + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0)
  )

  // ════════════════════════════════════════════════════════════
  // Return response
  // ════════════════════════════════════════════════════════════
  return NextResponse.json({
    dayOfWeek,
    from,
    to,
    kpis,
    itemsRevenueTotal,
    byZone,
    unknownZone,
    hourlyRevenue,
    dailyTrend,
    topProducts,
    topCategories,
    topProductByCategory,
    productsByCategory,
    staffPerformance,
    paymentMethods,
    clientTiers,
    clientSplit,
    categoryList,
    shifts,
    categoryCompanions,
    byZonePayment,
    topPerformersByCategory,
    bottomPerformersByCategory,
    filters: { zone: zoneParam, category: categoryParam, from, to },
    availableMonths,
    dayCount,
  })
}