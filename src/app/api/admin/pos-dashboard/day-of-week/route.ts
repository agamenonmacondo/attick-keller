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

  // ════════════════════════════════════════════════════════════
  // 1. Fetch all sales in date range, filter client-side by ISODOW
  // ════════════════════════════════════════════════════════════
  let allSales: any[] = []
  let salesOffset = 0
  const SALES_PAGE = 900
  while (true) {
    const { data: salesBatch, error } = await sb
      .from('pos_sales')
      .select('id, total, tip_amount, opened_at, closed_at, party_size, derived_zone_name, is_cancelled, pos_staff_id')
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

  const kpis = {
    revenue: Math.round(totalRevenue),
    cheques,
    tipTotal: Math.round(totalTip),
    tipAvg: cheques > 0 ? Math.round(totalTip / cheques) : 0,
    ticketPromedio: cheques > 0 ? Math.round(totalRevenue / cheques) : 0,
    partySizeAvg: cheques > 0 ? Math.round((totalPartySize / cheques) * 10) / 10 : 0,
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

  // ════════════════════════════════════════════════════════════
  // 6. Hourly Revenue
  // ════════════════════════════════════════════════════════════
  const hourAgg = new Map<number, { revenue: number; cheques: number; tipTotal: number }>()
  for (const s of sales) {
    if (!s.opened_at) continue
    const hour = new Date(s.opened_at).getHours()
    if (!hourAgg.has(hour)) {
      hourAgg.set(hour, { revenue: 0, cheques: 0, tipTotal: 0 })
    }
    const d = hourAgg.get(hour)!
    d.revenue += Number(s.total) || 0
    d.cheques += 1
    d.tipTotal += Number(s.tip_amount) || 0
  }

  const hourlyRevenue = [...hourAgg.entries()]
    .map(([hour, d]) => ({
      hour: String(hour),
      revenue: Math.round(d.revenue),
      cheques: d.cheques,
      tipTotal: Math.round(d.tipTotal),
    }))
    .sort((a, b) => parseInt(a.hour) - parseInt(b.hour))

  // ════════════════════════════════════════════════════════════
  // 7. Top Products
  // ════════════════════════════════════════════════════════════
  const productRevenueMap = new Map<string, { name: string; category: string; quantity: number; revenue: number }>()
  for (const item of allItems) {
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
  // 8. Top Categories (with enrichment: tipTotal, avgServiceTime, partySizeAvg)
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
  // 9. Products by Category
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

  // ════════════════════════════════════════════════════════════
  // 10. Staff Performance
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
  // 11. Payment Methods
  // ════════════════════════════════════════════════════════════
  const paymentMethods = await fetchPaymentMethodsForSales(sb, saleIds)

  // ════════════════════════════════════════════════════════════
  // 12. Category Companions
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
  // Return response
  // ════════════════════════════════════════════════════════════
  return NextResponse.json({
    dayOfWeek,
    from,
    to,
    kpis,
    byZone,
    hourlyRevenue,
    topProducts,
    topCategories,
    productsByCategory,
    staffPerformance,
    paymentMethods,
    categoryCompanions,
    dayCount,
  })
}