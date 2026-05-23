import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

// ── Helpers ──────────────────────────────────────────────
function qparam(request: NextRequest, key: string): string | null {
  return request.nextUrl.searchParams.get(key)
}

const BATCH = 1000

/** Paginated fetch for Supabase queries with range */
async function fetchPaginated(
  sb: any,
  builder: any,
  batchSize = BATCH
): Promise<any[]> {
  const results: any[] = []
  let offset = 0
  let hasMore = true
  while (hasMore) {
    const { data, error } = await builder.range(offset, offset + batchSize - 1)
    if (error) break
    if (data && data.length > 0) {
      results.push(...data)
      offset += batchSize
      hasMore = data.length === batchSize
    } else {
      hasMore = false
    }
  }
  return results
}

/** Helper: fetch payment methods for a set of sale IDs */
async function fetchPaymentMethodsForSales(
  sb: any,
  saleIds: string[]
): Promise<{ method: string; amount: number; count: number }[]> {
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

/** Helper: compute avgServiceTime from sales */
function computeServiceTime(sales: any[]): { avgServiceTime: number; serviceTimeCount: number } {
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
  return {
    avgServiceTime: serviceTimeCount > 0 ? Math.round(serviceTimeSum / serviceTimeCount) : 0,
    serviceTimeCount,
  }
}

// ── Main handler ─────────────────────────────────────────
export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()

  // ── Parse params ──
  const type = qparam(request, 'type') as 'product' | 'staff' | 'category' | 'hour' | 'zone' | null
  const id = qparam(request, 'id')
  const fromParam = qparam(request, 'from')
  const toParam = qparam(request, 'to')

  if (!type || !id || !fromParam || !toParam) {
    return NextResponse.json(
      { error: 'Faltan parámetros requeridos: type, id, from, to' },
      { status: 400 }
    )
  }

  const validTypes = ['product', 'staff', 'category', 'hour', 'zone']
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: `Tipo inválido. Debe ser uno de: ${validTypes.join(', ')}` },
      { status: 400 }
    )
  }

  const fromDate = `${fromParam}T00:00:00`
  const toDate = `${toParam}T23:59:59`

  // ── Route by type ──
  switch (type) {
    case 'product':
      return handleProduct(sb, id, fromDate, toDate)
    case 'staff':
      return handleStaff(sb, id, fromDate, toDate)
    case 'category':
      return handleCategory(sb, id, fromDate, toDate)
    case 'hour':
      return handleHour(sb, id, fromDate, toDate)
    case 'zone':
      return handleZone(sb, id, fromDate, toDate)
    default:
      return NextResponse.json({ error: 'Tipo no implementado' }, { status: 400 })
  }
}

// ════════════════════════════════════════════════════════════
// PRODUCT DETAIL (ENRICHED: tipTotal, tipAvg, partySizeAvg, avgServiceTime, cancelledCount, service by zone/hour, payment methods)
// ════════════════════════════════════════════════════════════
async function handleProduct(sb: any, productId: string, from: string, to: string) {
  // ── Product info ──
  const { data: productData } = await sb
    .from('pos_products')
    .select('pos_product_id, name')
    .eq('pos_product_id', productId)
    .single()

  const productName = productData?.name || 'Desconocido'

  // ── Get all items for this product, then join with sales ──
  let allItems: any[] = []
  let itemsOffset = 0
  let itemsHasMore = true
  while (itemsHasMore) {
    const { data: items, error } = await sb
      .from('pos_sale_items')
      .select('pos_sale_id, quantity, unit_price')
      .eq('pos_product_id', productId)
      .range(itemsOffset, itemsOffset + BATCH - 1)

    if (error || !items || items.length === 0) {
      itemsHasMore = false
      break
    }
    allItems.push(...items)
    itemsOffset += BATCH
    itemsHasMore = items.length === BATCH
  }

  // Get sale IDs and fetch related sales (ENRICHED: also fetch closed_at, party_size, tip_amount for service time)
  const saleIds = [...new Set(allItems.map((i: any) => i.pos_sale_id))]
  let allSales: any[] = []
  for (let i = 0; i < saleIds.length; i += BATCH) {
    const batch = saleIds.slice(i, i + BATCH)
    const { data: salesData } = await sb
      .from('pos_sales')
      .select('id, total, tip_amount, opened_at, closed_at, party_size, derived_zone_name, is_cancelled')
      .in('id', batch)
      .gte('opened_at', from)
      .lte('opened_at', to)
    if (salesData) allSales.push(...salesData)
  }

  // Separate active vs cancelled
  const activeSales = allSales.filter((s: any) => !s.is_cancelled)
  const cancelledSales = allSales.filter((s: any) => s.is_cancelled)

  const validSaleIds = new Set(activeSales.map((s: any) => s.id))
  const validItems = allItems.filter((i: any) => validSaleIds.has(i.pos_sale_id))

  // Build sale lookup
  const saleMap = new Map<string, any>()
  for (const s of activeSales) saleMap.set(s.id, s)

  // ── byZone (ENRICHED: avgServiceTime) ──
  const zoneMap = new Map<string, { qty: number; revenue: number; cheques: Set<string>; serviceTimeSum: number; serviceTimeCount: number }>()
  for (const item of validItems) {
    const sale = saleMap.get(item.pos_sale_id)
    if (!sale) continue
    const zone = sale.derived_zone_name || 'Desconocido'
    if (!zoneMap.has(zone)) zoneMap.set(zone, { qty: 0, revenue: 0, cheques: new Set(), serviceTimeSum: 0, serviceTimeCount: 0 })
    const d = zoneMap.get(zone)!
    d.qty += Number(item.quantity) || 0
    d.revenue += (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
    d.cheques.add(item.pos_sale_id)
    if (sale.opened_at && sale.closed_at) {
      const diff = (new Date(sale.closed_at).getTime() - new Date(sale.opened_at).getTime()) / 60000
      if (diff > 0) {
        d.serviceTimeSum += diff
        d.serviceTimeCount += 1
      }
    }
  }
  const byZone = [...zoneMap.entries()].map(([zone, d]) => ({
    zone,
    qty: d.qty,
    revenue: Math.round(d.revenue),
    cheques: d.cheques.size,
    avgServiceTime: d.serviceTimeCount > 0 ? Math.round(d.serviceTimeSum / d.serviceTimeCount) : 0,
  })).sort((a, b) => b.revenue - a.revenue)

  // ── byHour (ENRICHED: avgServiceTime) ──
  const hourMap = new Map<number, { qty: number; revenue: number; serviceTimeSum: number; serviceTimeCount: number }>()
  for (const item of validItems) {
    const sale = saleMap.get(item.pos_sale_id)
    if (!sale?.opened_at) continue
    const hour = new Date(sale.opened_at).getHours()
    if (!hourMap.has(hour)) hourMap.set(hour, { qty: 0, revenue: 0, serviceTimeSum: 0, serviceTimeCount: 0 })
    const d = hourMap.get(hour)!
    d.qty += Number(item.quantity) || 0
    d.revenue += (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
    if (sale.opened_at && sale.closed_at) {
      const diff = (new Date(sale.closed_at).getTime() - new Date(sale.opened_at).getTime()) / 60000
      if (diff > 0) {
        d.serviceTimeSum += diff
        d.serviceTimeCount += 1
      }
    }
  }
  const byHour = [...hourMap.entries()].map(([hour, d]) => ({
    hour,
    qty: d.qty,
    revenue: Math.round(d.revenue),
    avgServiceTime: d.serviceTimeCount > 0 ? Math.round(d.serviceTimeSum / d.serviceTimeCount) : 0,
  })).sort((a, b) => a.hour - b.hour)

  // ── byDay ──
  const dayMap = new Map<string, { qty: number; revenue: number }>()
  for (const item of validItems) {
    const sale = saleMap.get(item.pos_sale_id)
    if (!sale?.opened_at) continue
    const date = sale.opened_at.slice(0, 10)
    if (!dayMap.has(date)) dayMap.set(date, { qty: 0, revenue: 0 })
    const d = dayMap.get(date)!
    d.qty += Number(item.quantity) || 0
    d.revenue += (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
  }
  const byDay = [...dayMap.entries()].map(([date, d]) => ({
    date,
    qty: d.qty,
    revenue: Math.round(d.revenue),
  })).sort((a, b) => a.date.localeCompare(b.date))

  // ── Companions (products in same cheques) ──
  let companionItems: any[] = []
  for (let i = 0; i < saleIds.length; i += BATCH) {
    const batch = saleIds.slice(i, i + BATCH)
    const { data: compData } = await sb
      .from('pos_sale_items')
      .select('pos_product_id, quantity, unit_price, pos_sale_id')
      .in('pos_sale_id', batch)
      .neq('pos_product_id', productId)
    if (compData) companionItems.push(...compData)
  }

  companionItems = companionItems.filter((i: any) => validSaleIds.has(i.pos_sale_id))

  const companionProductIds = [...new Set(companionItems.map((i: any) => i.pos_product_id))]
  const companionNames = new Map<string, string>()
  for (let i = 0; i < companionProductIds.length; i += BATCH) {
    const batch = companionProductIds.slice(i, i + BATCH)
    const { data: prods } = await sb
      .from('pos_products')
      .select('pos_product_id, name')
      .in('pos_product_id', batch)
    if (prods) {
      for (const p of prods) companionNames.set(p.pos_product_id, p.name)
    }
  }

  const companionMap = new Map<string, { name: string; qty: number; revenue: number }>()
  for (const item of companionItems) {
    const name = companionNames.get(item.pos_product_id) || 'Desconocido'
    if (!companionMap.has(item.pos_product_id)) {
      companionMap.set(item.pos_product_id, { name, qty: 0, revenue: 0 })
    }
    const d = companionMap.get(item.pos_product_id)!
    d.qty += Number(item.quantity) || 0
    d.revenue += (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
  }
  const companions = [...companionMap.values()]
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10)
    .map(c => ({ ...c, revenue: Math.round(c.revenue) }))

  // ── Payment methods for this product's sales ──
  const paymentMethods = await fetchPaymentMethodsForSales(sb, [...validSaleIds])

  // ── Summary (ENRICHED: tipTotal, tipAvg, partySizeAvg, avgServiceTime, cancelledCount) ──
  const totalRevenue = validItems.reduce(
    (s: number, i: any) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0
  )
  const totalQty = validItems.reduce((s: number, i: any) => s + (Number(i.quantity) || 0), 0)
  const totalCheques = validSaleIds.size
  const avgTicket = totalCheques > 0 ? totalRevenue / totalCheques : 0

  const tipTotal = activeSales.reduce((s: number, r: any) => s + (Number(r.tip_amount) || 0), 0)
  const tipAvg = totalCheques > 0 ? tipTotal / totalCheques : 0
  const partySizeTotal = activeSales.reduce((s: number, r: any) => s + (Number(r.party_size) || 0), 0)
  const partySizeAvg = totalCheques > 0 ? partySizeTotal / totalCheques : 0
  const { avgServiceTime } = computeServiceTime(activeSales)

  return NextResponse.json({
    type: 'product',
    byZone,
    byHour,
    byDay,
    companions,
    paymentMethods,
    summary: {
      name: productName,
      totalRevenue: Math.round(totalRevenue),
      totalQty,
      totalCheques,
      avgTicket: Math.round(avgTicket),
      tipTotal: Math.round(tipTotal),
      tipAvg: Math.round(tipAvg),
      partySizeAvg: Math.round(partySizeAvg * 10) / 10,
      avgServiceTime,
      cancelledCount: cancelledSales.length,
    },
  })
}

// ════════════════════════════════════════════════════════════
// STAFF DETAIL (ENRICHED: partySizeAvg, avgServiceTime, service by zone/hour, payment methods, category breakdown)
// ════════════════════════════════════════════════════════════
async function handleStaff(sb: any, staffId: string, from: string, to: string) {
  // ── Staff info (ENRICHED: staff_type) ──
  const { data: staffData } = await sb
    .from('pos_staff')
    .select('pos_staff_id, name, staff_type')
    .eq('pos_staff_id', staffId)
    .single()

  const staffName = staffData?.name || 'Desconocido'
  const staffType = staffData?.staff_type || 0

  // ── Fetch sales for this staff member (ENRICHED: closed_at, party_size) ──
  let allSales: any[] = []
  let offset = 0
  let hasMore = true
  while (hasMore) {
    const { data: batch, error } = await sb
      .from('pos_sales')
      .select('id, total, tip_amount, opened_at, closed_at, party_size, derived_zone_name, is_cancelled')
      .eq('pos_staff_id', staffId)
      .gte('opened_at', from)
      .lte('opened_at', to)
      .eq('is_cancelled', false)
      .range(offset, offset + BATCH - 1)
      .order('opened_at', { ascending: true })

    if (error || !batch || batch.length === 0) { hasMore = false; break }
    allSales.push(...batch)
    offset += BATCH
    hasMore = batch.length === BATCH
  }

  // ── byZone (ENRICHED: avgServiceTime) ──
  const zoneMap = new Map<string, { cheques: number; revenue: number; propina: number; serviceTimeSum: number; serviceTimeCount: number }>()
  for (const s of allSales) {
    const zone = s.derived_zone_name || 'Desconocido'
    if (!zoneMap.has(zone)) zoneMap.set(zone, { cheques: 0, revenue: 0, propina: 0, serviceTimeSum: 0, serviceTimeCount: 0 })
    const d = zoneMap.get(zone)!
    d.cheques += 1
    d.revenue += Number(s.total) || 0
    d.propina += Number(s.tip_amount) || 0
    if (s.opened_at && s.closed_at) {
      const diff = (new Date(s.closed_at).getTime() - new Date(s.opened_at).getTime()) / 60000
      if (diff > 0) {
        d.serviceTimeSum += diff
        d.serviceTimeCount += 1
      }
    }
  }
  const byZone = [...zoneMap.entries()].map(([zone, d]) => ({
    zone,
    cheques: d.cheques,
    revenue: Math.round(d.revenue),
    propina: Math.round(d.propina),
    avgServiceTime: d.serviceTimeCount > 0 ? Math.round(d.serviceTimeSum / d.serviceTimeCount) : 0,
  })).sort((a, b) => b.revenue - a.revenue)

  // ── byHour (ENRICHED: avgServiceTime, propina) ──
  const hourMap = new Map<number, { cheques: number; revenue: number; propina: number; serviceTimeSum: number; serviceTimeCount: number }>()
  for (const s of allSales) {
    if (!s.opened_at) continue
    const hour = new Date(s.opened_at).getHours()
    if (!hourMap.has(hour)) hourMap.set(hour, { cheques: 0, revenue: 0, propina: 0, serviceTimeSum: 0, serviceTimeCount: 0 })
    const d = hourMap.get(hour)!
    d.cheques += 1
    d.revenue += Number(s.total) || 0
    d.propina += Number(s.tip_amount) || 0
    if (s.opened_at && s.closed_at) {
      const diff = (new Date(s.closed_at).getTime() - new Date(s.opened_at).getTime()) / 60000
      if (diff > 0) {
        d.serviceTimeSum += diff
        d.serviceTimeCount += 1
      }
    }
  }
  const byHour = [...hourMap.entries()].map(([hour, d]) => ({
    hour,
    cheques: d.cheques,
    revenue: Math.round(d.revenue),
    propina: Math.round(d.propina),
    avgServiceTime: d.serviceTimeCount > 0 ? Math.round(d.serviceTimeSum / d.serviceTimeCount) : 0,
  })).sort((a, b) => a.hour - b.hour)

  // ── topProducts ──
  const saleIds = allSales.map((s: any) => s.id)
  let allItems: any[] = []
  for (let i = 0; i < saleIds.length; i += BATCH) {
    const batch = saleIds.slice(i, i + BATCH)
    const { data: items } = await sb
      .from('pos_sale_items')
      .select('pos_product_id, quantity, unit_price')
      .in('pos_sale_id', batch)
    if (items) allItems.push(...items)
  }

  const productIds = [...new Set(allItems.map((i: any) => i.pos_product_id))]
  const productNames = new Map<string, string>()
  const productGroups = new Map<string, string>()
  for (let i = 0; i < productIds.length; i += BATCH) {
    const batch = productIds.slice(i, i + BATCH)
    const { data: prods } = await sb
      .from('pos_products')
      .select('pos_product_id, name, pos_group_id')
      .in('pos_product_id', batch)
    if (prods) {
      for (const p of prods) {
        productNames.set(p.pos_product_id, p.name)
        productGroups.set(p.pos_product_id, p.pos_group_id || '')
      }
    }
  }

  const topProductMap = new Map<string, { product: string; qty: number; revenue: number }>()
  for (const item of allItems) {
    const name = productNames.get(item.pos_product_id) || 'Desconocido'
    if (!topProductMap.has(item.pos_product_id)) {
      topProductMap.set(item.pos_product_id, { product: name, qty: 0, revenue: 0 })
    }
    const d = topProductMap.get(item.pos_product_id)!
    d.qty += Number(item.quantity) || 0
    d.revenue += (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
  }
  const topProducts = [...topProductMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15)
    .map(p => ({ ...p, revenue: Math.round(p.revenue) }))

  // ── NEW: Category breakdown (what categories this staff sells most) ──
  const groupIds = [...new Set([...productGroups.values()].filter(Boolean))]
  const groupNames = new Map<string, string>()
  for (let i = 0; i < groupIds.length; i += BATCH) {
    const batch = groupIds.slice(i, i + BATCH)
    const { data: groups } = await sb
      .from('pos_product_groups')
      .select('pos_group_id, name')
      .in('pos_group_id', batch)
    if (groups) {
      for (const g of groups) groupNames.set(g.pos_group_id, g.name)
    }
  }

  const categoryBreakdownMap = new Map<string, { categoryId: string; categoryName: string; qty: number; revenue: number }>()
  for (const item of allItems) {
    const groupId = productGroups.get(item.pos_product_id)
    if (!groupId) continue
    const catName = groupNames.get(groupId) || groupId
    if (!categoryBreakdownMap.has(groupId)) {
      categoryBreakdownMap.set(groupId, { categoryId: groupId, categoryName: catName, qty: 0, revenue: 0 })
    }
    const d = categoryBreakdownMap.get(groupId)!
    d.qty += Number(item.quantity) || 0
    d.revenue += (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
  }
  const categoryBreakdown = [...categoryBreakdownMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .map(c => ({ ...c, revenue: Math.round(c.revenue) }))

  // ── dailyTrend ──
  const dayMap = new Map<string, { cheques: number; revenue: number; propina: number }>()
  for (const s of allSales) {
    if (!s.opened_at) continue
    const date = s.opened_at.slice(0, 10)
    if (!dayMap.has(date)) dayMap.set(date, { cheques: 0, revenue: 0, propina: 0 })
    const d = dayMap.get(date)!
    d.cheques += 1
    d.revenue += Number(s.total) || 0
    d.propina += Number(s.tip_amount) || 0
  }
  const dailyTrend = [...dayMap.entries()].map(([date, d]) => ({
    date,
    cheques: d.cheques,
    revenue: Math.round(d.revenue),
    propina: Math.round(d.propina),
  })).sort((a, b) => a.date.localeCompare(b.date))

  // ── Payment methods for this staff's sales ──
  const paymentMethods = await fetchPaymentMethodsForSales(sb, saleIds)

  // ── Summary (ENRICHED: partySizeAvg, avgServiceTime) ──
  const totalRevenue = allSales.reduce((s: number, r: any) => s + (Number(r.total) || 0), 0)
  const totalCheques = allSales.length
  const totalPropina = allSales.reduce((s: number, r: any) => s + (Number(r.tip_amount) || 0), 0)
  const avgTicket = totalCheques > 0 ? totalRevenue / totalCheques : 0
  const partySizeTotal = allSales.reduce((s: number, r: any) => s + (Number(r.party_size) || 0), 0)
  const partySizeAvg = totalCheques > 0 ? partySizeTotal / totalCheques : 0
  const { avgServiceTime } = computeServiceTime(allSales)

  return NextResponse.json({
    type: 'staff',
    byZone,
    byHour,
    topProducts,
    categoryBreakdown,
    dailyTrend,
    paymentMethods,
    summary: {
      name: staffName,
      staffType,
      totalRevenue: Math.round(totalRevenue),
      totalCheques,
      totalPropina: Math.round(totalPropina),
      avgTicket: Math.round(avgTicket),
      partySizeAvg: Math.round(partySizeAvg * 10) / 10,
      avgServiceTime,
    },
  })
}

// ════════════════════════════════════════════════════════════
// CATEGORY DETAIL (ENRICHED: tipTotal, tipAvg, partySizeAvg, avgServiceTime, ticketPromedio, cancelledCount, cancelledRatio, dailyTrend, cross-category companions, service by zone/hour, payment methods, tip by zone/hour)
// ════════════════════════════════════════════════════════════
async function handleCategory(sb: any, groupId: string, from: string, to: string) {
  // ── Category info ──
  const { data: groupData } = await sb
    .from('pos_product_groups')
    .select('pos_group_id, name')
    .eq('pos_group_id', groupId)
    .single()

  const categoryName = groupData?.name || 'Desconocido'

  // ── Get product IDs in this category (BUG-02 FIX: include price for left-join) ──
  let catProducts: any[] = []
  let prodOffset = 0
  let prodHasMore = true
  while (prodHasMore) {
    const { data, error } = await sb
      .from('pos_products')
      .select('pos_product_id, name, price')
      .eq('pos_group_id', groupId)
      .range(prodOffset, prodOffset + BATCH - 1)
    if (error || !data || data.length === 0) { prodHasMore = false; break }
    catProducts.push(...data)
    prodOffset += BATCH
    prodHasMore = data.length === BATCH
  }

  const productIdsInCat = catProducts.map((p: any) => p.pos_product_id)
  const productNameMap = new Map<string, string>()
  const productPriceMap = new Map<string, number>()
  for (const p of catProducts) {
    productNameMap.set(p.pos_product_id, p.name)
    productPriceMap.set(p.pos_product_id, Number(p.price) || 0)
  }

  // ── Get all items for these products ──
  let allItems: any[] = []
  for (let i = 0; i < productIdsInCat.length; i += BATCH) {
    const pidBatch = productIdsInCat.slice(i, i + BATCH)
    const { data: items } = await sb
      .from('pos_sale_items')
      .select('pos_sale_id, pos_product_id, quantity, unit_price')
      .in('pos_product_id', pidBatch)
    if (items) allItems.push(...items)
  }

  // Get sale IDs and filter by date (include cancelled for counting)
  const saleIdsFromItems = [...new Set(allItems.map((i: any) => i.pos_sale_id))]
  let allSales: any[] = []
  for (let i = 0; i < saleIdsFromItems.length; i += BATCH) {
    const batch = saleIdsFromItems.slice(i, i + BATCH)
    const { data: sales } = await sb
      .from('pos_sales')
      .select('id, total, tip_amount, opened_at, closed_at, party_size, derived_zone_name, is_cancelled')
      .in('id', batch)
      .gte('opened_at', from)
      .lte('opened_at', to)
    if (sales) allSales.push(...sales)
  }

  const activeSales = allSales.filter((s: any) => !s.is_cancelled)
  const cancelledCount = allSales.filter((s: any) => s.is_cancelled).length
  const validSaleIds = new Set(activeSales.map((s: any) => s.id))
  const validItems = allItems.filter((i: any) => validSaleIds.has(i.pos_sale_id))
  const saleMap = new Map<string, any>()
  for (const s of activeSales) saleMap.set(s.id, s)

  // ── BUG-02 FIX: topProducts as LEFT-JOIN (ALL category products, even with 0 sales) ──
  const topProductMap = new Map<string, { productId: string; name: string; qty: number; revenue: number; cheques: Set<string> }>()
  for (const item of validItems) {
    const name = productNameMap.get(item.pos_product_id) || 'Desconocido'
    if (!topProductMap.has(item.pos_product_id)) {
      topProductMap.set(item.pos_product_id, { productId: item.pos_product_id, name, qty: 0, revenue: 0, cheques: new Set() })
    }
    const d = topProductMap.get(item.pos_product_id)!
    d.qty += Number(item.quantity) || 0
    d.revenue += (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
    d.cheques.add(item.pos_sale_id)
  }
  // Left-join: include products with no sales in the period
  const topProducts = catProducts.map((p: any) => {
    const d = topProductMap.get(p.pos_product_id)
    const name = p.name || 'Desconocido'
    const price = productPriceMap.get(p.pos_product_id) || 0
    return {
      productId: String(p.pos_product_id),
      name,
      qty: d?.qty || 0,
      revenue: d ? Math.round(d.revenue) : 0,
      avgPrice: d && d.qty > 0 ? Math.round(d.revenue / d.qty) : Math.round(price),
      cheques: d?.cheques.size || 0,
    }
  }).sort((a: any, b: any) => b.revenue - a.revenue)

  // ── byZone (ENRICHED: propina, avgServiceTime) ──
  const zoneMap = new Map<string, { revenue: number; cheques: Set<string>; propina: number; serviceTimeSum: number; serviceTimeCount: number }>()
  for (const item of validItems) {
    const sale = saleMap.get(item.pos_sale_id)
    if (!sale) continue
    const zone = sale.derived_zone_name || 'Desconocido'
    if (!zoneMap.has(zone)) zoneMap.set(zone, { revenue: 0, cheques: new Set(), propina: 0, serviceTimeSum: 0, serviceTimeCount: 0 })
    const d = zoneMap.get(zone)!
    d.revenue += (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
    d.cheques.add(item.pos_sale_id)
    d.propina += Number(sale.tip_amount) || 0
    if (sale.opened_at && sale.closed_at) {
      const diff = (new Date(sale.closed_at).getTime() - new Date(sale.opened_at).getTime()) / 60000
      if (diff > 0) {
        d.serviceTimeSum += diff
        d.serviceTimeCount += 1
      }
    }
  }
  const byZone = [...zoneMap.entries()].map(([zone, d]) => ({
    zone,
    revenue: Math.round(d.revenue),
    cheques: d.cheques.size,
    propina: Math.round(d.propina),
    avgServiceTime: d.serviceTimeCount > 0 ? Math.round(d.serviceTimeSum / d.serviceTimeCount) : 0,
  })).sort((a, b) => b.revenue - a.revenue)

  // ── byHour (ENRICHED: propina, avgServiceTime) ──
  const hourMap = new Map<number, { revenue: number; cheques: Set<string>; propina: number; serviceTimeSum: number; serviceTimeCount: number }>()
  for (const item of validItems) {
    const sale = saleMap.get(item.pos_sale_id)
    if (!sale?.opened_at) continue
    const hour = new Date(sale.opened_at).getHours()
    if (!hourMap.has(hour)) hourMap.set(hour, { revenue: 0, cheques: new Set(), propina: 0, serviceTimeSum: 0, serviceTimeCount: 0 })
    const d = hourMap.get(hour)!
    d.revenue += (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
    d.cheques.add(item.pos_sale_id)
    d.propina += Number(sale.tip_amount) || 0
    if (sale.opened_at && sale.closed_at) {
      const diff = (new Date(sale.closed_at).getTime() - new Date(sale.opened_at).getTime()) / 60000
      if (diff > 0) {
        d.serviceTimeSum += diff
        d.serviceTimeCount += 1
      }
    }
  }
  const byHour = [...hourMap.entries()].map(([hour, d]) => ({
    hour,
    revenue: Math.round(d.revenue),
    cheques: d.cheques.size,
    propina: Math.round(d.propina),
    avgServiceTime: d.serviceTimeCount > 0 ? Math.round(d.serviceTimeSum / d.serviceTimeCount) : 0,
  })).sort((a, b) => a.hour - b.hour)

  // ── NEW: dailyTrend (revenue/cheques/propina per day) ──
  const dayMap = new Map<string, { revenue: number; cheques: Set<string>; propina: number }>()
  for (const item of validItems) {
    const sale = saleMap.get(item.pos_sale_id)
    if (!sale?.opened_at) continue
    const date = sale.opened_at.slice(0, 10)
    if (!dayMap.has(date)) dayMap.set(date, { revenue: 0, cheques: new Set(), propina: 0 })
    const d = dayMap.get(date)!
    d.revenue += (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
    d.cheques.add(item.pos_sale_id)
    d.propina += Number(sale.tip_amount) || 0
  }
  const dailyTrend = [...dayMap.entries()].map(([date, d]) => ({
    date,
    revenue: Math.round(d.revenue),
    cheques: d.cheques.size,
    propina: Math.round(d.propina),
  })).sort((a, b) => a.date.localeCompare(b.date))

  // ── NEW: Cross-category companions (top 10 categories ordered with this one) ──
  // Get all items in the same sales as this category's items, but from OTHER categories
  let companionItems: any[] = []
  const allSaleIdsList = [...validSaleIds]
  for (let i = 0; i < allSaleIdsList.length; i += BATCH) {
    const batch = allSaleIdsList.slice(i, i + BATCH)
    const { data: compData } = await sb
      .from('pos_sale_items')
      .select('pos_product_id, pos_sale_id')
      .in('pos_sale_id', batch)
    if (compData) companionItems.push(...compData)
  }

  // Get group IDs for companion products
  const compProductIds = [...new Set(companionItems.map((i: any) => i.pos_product_id))]
  const compProductGroups = new Map<string, string>()
  for (let i = 0; i < compProductIds.length; i += BATCH) {
    const batch = compProductIds.slice(i, i + BATCH)
    const { data: prods } = await sb
      .from('pos_products')
      .select('pos_product_id, pos_group_id')
      .in('pos_product_id', batch)
    if (prods) {
      for (const p of prods) compProductGroups.set(p.pos_product_id, p.pos_group_id || '')
    }
  }

  // Count shared cheques per OTHER category
  const compCatMap = new Map<string, { categoryId: string; categoryName: string; sharedCheques: Set<string> }>()
  const compGroupIds = [...new Set([...compProductGroups.values()].filter(Boolean))]
  const compGroupNames = new Map<string, string>()
  for (let i = 0; i < compGroupIds.length; i += BATCH) {
    const batch = compGroupIds.slice(i, i + BATCH)
    const { data: groups } = await sb
      .from('pos_product_groups')
      .select('pos_group_id, name')
      .in('pos_group_id', batch)
    if (groups) {
      for (const g of groups) compGroupNames.set(g.pos_group_id, g.name)
    }
  }

  for (const item of companionItems) {
    const itemGroupId = compProductGroups.get(item.pos_product_id)
    if (!itemGroupId || itemGroupId === groupId) continue // Skip same category
    const catName = compGroupNames.get(itemGroupId) || itemGroupId
    if (!compCatMap.has(itemGroupId)) {
      compCatMap.set(itemGroupId, { categoryId: itemGroupId, categoryName: catName, sharedCheques: new Set() })
    }
    compCatMap.get(itemGroupId)!.sharedCheques.add(item.pos_sale_id)
  }
  const crossCategoryCompanions = [...compCatMap.values()]
    .sort((a, b) => b.sharedCheques.size - a.sharedCheques.size)
    .slice(0, 10)
    .map(c => ({ categoryId: c.categoryId, categoryName: c.categoryName, sharedCheques: c.sharedCheques.size }))

  // ── Payment methods for this category's sales ──
  const paymentMethods = await fetchPaymentMethodsForSales(sb, allSaleIdsList)

  // ── NEW: Tip by zone ──
  const tipByZone = byZone.map(z => ({
    zone: z.zone,
    tipTotal: z.propina,
    tipAvg: z.cheques > 0 ? Math.round(z.propina / z.cheques) : 0,
  }))

  // ── NEW: Tip by hour ──
  const tipByHour = byHour.map(h => ({
    hour: h.hour,
    tipTotal: h.propina,
    tipAvg: h.cheques > 0 ? Math.round(h.propina / h.cheques) : 0,
  }))

  // ── Summary (ENRICHED) ──
  const totalRevenue = validItems.reduce(
    (s: number, i: any) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0
  )
  const totalQty = validItems.reduce((s: number, i: any) => s + (Number(i.quantity) || 0), 0)
  const totalCheques = validSaleIds.size
  const ticketPromedio = totalCheques > 0 ? totalRevenue / totalCheques : 0

  const tipTotal = activeSales.reduce((s: number, r: any) => s + (Number(r.tip_amount) || 0), 0)
  const tipAvg = totalCheques > 0 ? tipTotal / totalCheques : 0
  const partySizeTotal = activeSales.reduce((s: number, r: any) => s + (Number(r.party_size) || 0), 0)
  const partySizeAvg = totalCheques > 0 ? partySizeTotal / totalCheques : 0
  const { avgServiceTime } = computeServiceTime(activeSales)
  const totalSalesCount = allSales.length
  const cancelledRatio = totalSalesCount > 0 ? cancelledCount / totalSalesCount : 0

  return NextResponse.json({
    type: 'category',
    topProducts,
    byZone,
    byHour,
    dailyTrend,
    crossCategoryCompanions,
    paymentMethods,
    tipByZone,
    tipByHour,
    summary: {
      name: categoryName,
      totalRevenue: Math.round(totalRevenue),
      totalQty,
      totalCheques,
      ticketPromedio: Math.round(ticketPromedio),
      tipTotal: Math.round(tipTotal),
      tipAvg: Math.round(tipAvg),
      partySizeAvg: Math.round(partySizeAvg * 10) / 10,
      avgServiceTime,
      cancelledCount,
      cancelledRatio: Math.round(cancelledRatio * 10000) / 10000, // e.g. 0.0091 for 0.91%
    },
  })
}

// ════════════════════════════════════════════════════════════
// HOUR DETAIL (ENRICHED: tipTotal, tipAvg, partySizeAvg, avgServiceTime, payment methods)
// ════════════════════════════════════════════════════════════
async function handleHour(sb: any, hourStr: string, from: string, to: string) {
  const hour = parseInt(hourStr, 10)
  if (isNaN(hour) || hour < 0 || hour > 23) {
    return NextResponse.json({ error: 'Hora inválida. Debe ser 0-23' }, { status: 400 })
  }

  // ── Fetch all sales in the date range, then filter by hour client-side ──
  let allSales: any[] = []
  let offset = 0
  let hasMore = true
  while (hasMore) {
    const { data: batch, error } = await sb
      .from('pos_sales')
      .select('id, total, tip_amount, opened_at, closed_at, party_size, derived_zone_name, pos_staff_id, is_cancelled')
      .gte('opened_at', from)
      .lte('opened_at', to)
      .eq('is_cancelled', false)
      .range(offset, offset + BATCH - 1)

    if (error || !batch || batch.length === 0) { hasMore = false; break }
    allSales.push(...batch)
    offset += BATCH
    hasMore = batch.length === BATCH
  }

  // Filter by hour
  const hourSales = allSales.filter((s: any) => {
    if (!s.opened_at) return false
    return new Date(s.opened_at).getHours() === hour
  })

  const saleIds = hourSales.map((s: any) => s.id)

  // ── topProducts ──
  let allItems: any[] = []
  for (let i = 0; i < saleIds.length; i += BATCH) {
    const batch = saleIds.slice(i, i + BATCH)
    const { data: items } = await sb
      .from('pos_sale_items')
      .select('pos_product_id, quantity, unit_price')
      .in('pos_sale_id', batch)
    if (items) allItems.push(...items)
  }

  const productIds = [...new Set(allItems.map((i: any) => i.pos_product_id))]
  const productNames = new Map<string, string>()
  for (let i = 0; i < productIds.length; i += BATCH) {
    const batch = productIds.slice(i, i + BATCH)
    const { data: prods } = await sb
      .from('pos_products')
      .select('pos_product_id, name')
      .in('pos_product_id', batch)
    if (prods) {
      for (const p of prods) productNames.set(p.pos_product_id, p.name)
    }
  }

  const topProductMap = new Map<string, { product: string; qty: number; revenue: number }>()
  for (const item of allItems) {
    const name = productNames.get(item.pos_product_id) || 'Desconocido'
    if (!topProductMap.has(item.pos_product_id)) {
      topProductMap.set(item.pos_product_id, { product: name, qty: 0, revenue: 0 })
    }
    const d = topProductMap.get(item.pos_product_id)!
    d.qty += Number(item.quantity) || 0
    d.revenue += (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
  }
  const topProducts = [...topProductMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map(p => ({ ...p, revenue: Math.round(p.revenue) }))

  // ── topStaff ──
  const staffIds = [...new Set(hourSales.map((s: any) => s.pos_staff_id).filter(Boolean))]
  const staffNames = new Map<string, string>()
  for (let i = 0; i < staffIds.length; i += BATCH) {
    const batch = staffIds.slice(i, i + BATCH)
    const { data: staffData } = await sb
      .from('pos_staff')
      .select('pos_staff_id, name')
      .in('pos_staff_id', batch)
    if (staffData) {
      for (const st of staffData) staffNames.set(st.pos_staff_id, st.name)
    }
  }

  const staffMap = new Map<string, { name: string; cheques: number; revenue: number }>()
  for (const s of hourSales) {
    if (!s.pos_staff_id) continue
    const name = staffNames.get(s.pos_staff_id) || 'Desconocido'
    if (!staffMap.has(s.pos_staff_id)) {
      staffMap.set(s.pos_staff_id, { name, cheques: 0, revenue: 0 })
    }
    const d = staffMap.get(s.pos_staff_id)!
    d.cheques += 1
    d.revenue += Number(s.total) || 0
  }
  const topStaff = [...staffMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map(s => ({ ...s, revenue: Math.round(s.revenue) }))

  // ── byZone ──
  const zoneMap = new Map<string, { cheques: number; revenue: number }>()
  for (const s of hourSales) {
    const zone = s.derived_zone_name || 'Desconocido'
    if (!zoneMap.has(zone)) zoneMap.set(zone, { cheques: 0, revenue: 0 })
    const d = zoneMap.get(zone)!
    d.cheques += 1
    d.revenue += Number(s.total) || 0
  }
  const byZone = [...zoneMap.entries()].map(([zone, d]) => ({
    zone,
    cheques: d.cheques,
    revenue: Math.round(d.revenue),
  })).sort((a, b) => b.revenue - a.revenue)

  // ── Payment methods for this hour's sales ──
  const paymentMethods = await fetchPaymentMethodsForSales(sb, saleIds)

  // ── Summary (ENRICHED) ──
  const totalRevenue = hourSales.reduce((s: number, r: any) => s + (Number(r.total) || 0), 0)
  const totalCheques = hourSales.length
  const tipTotal = hourSales.reduce((s: number, r: any) => s + (Number(r.tip_amount) || 0), 0)
  const tipAvg = totalCheques > 0 ? tipTotal / totalCheques : 0
  const partySizeTotal = hourSales.reduce((s: number, r: any) => s + (Number(r.party_size) || 0), 0)
  const partySizeAvg = totalCheques > 0 ? partySizeTotal / totalCheques : 0
  const { avgServiceTime } = computeServiceTime(hourSales)

  return NextResponse.json({
    type: 'hour',
    topProducts,
    topStaff,
    byZone,
    paymentMethods,
    summary: {
      hour,
      totalRevenue: Math.round(totalRevenue),
      totalCheques,
      tipTotal: Math.round(tipTotal),
      tipAvg: Math.round(tipAvg),
      partySizeAvg: Math.round(partySizeAvg * 10) / 10,
      avgServiceTime,
    },
  })
}

// ════════════════════════════════════════════════════════════
// ZONE DETAIL (ENRICHED: partySizeAvg, avgServiceTime, service by hour, payment methods, category breakdown)
// ════════════════════════════════════════════════════════════
async function handleZone(sb: any, zoneName: string, from: string, to: string) {
  // ── Fetch sales for this zone (ENRICHED: closed_at, party_size) ──
  let allSales: any[] = []
  let offset = 0
  let hasMore = true
  while (hasMore) {
    const { data: batch, error } = await sb
      .from('pos_sales')
      .select('id, total, tip_amount, opened_at, closed_at, party_size, derived_zone_name, pos_staff_id, is_cancelled')
      .eq('derived_zone_name', zoneName)
      .gte('opened_at', from)
      .lte('opened_at', to)
      .eq('is_cancelled', false)
      .range(offset, offset + BATCH - 1)
      .order('opened_at', { ascending: true })

    if (error || !batch || batch.length === 0) { hasMore = false; break }
    allSales.push(...batch)
    offset += BATCH
    hasMore = batch.length === BATCH
  }

  const saleIds = allSales.map((s: any) => s.id)

  // ── topProducts ──
  let allItems: any[] = []
  for (let i = 0; i < saleIds.length; i += BATCH) {
    const batch = saleIds.slice(i, i + BATCH)
    const { data: items } = await sb
      .from('pos_sale_items')
      .select('pos_product_id, quantity, unit_price')
      .in('pos_sale_id', batch)
    if (items) allItems.push(...items)
  }

  const productIds = [...new Set(allItems.map((i: any) => i.pos_product_id))]
  const productNames = new Map<string, string>()
  const productGroups = new Map<string, string>()
  for (let i = 0; i < productIds.length; i += BATCH) {
    const batch = productIds.slice(i, i + BATCH)
    const { data: prods } = await sb
      .from('pos_products')
      .select('pos_product_id, name, pos_group_id')
      .in('pos_product_id', batch)
    if (prods) {
      for (const p of prods) {
        productNames.set(p.pos_product_id, p.name)
        productGroups.set(p.pos_product_id, p.pos_group_id || '')
      }
    }
  }

  const topProductMap = new Map<string, { product: string; qty: number; revenue: number }>()
  for (const item of allItems) {
    const name = productNames.get(item.pos_product_id) || 'Desconocido'
    if (!topProductMap.has(item.pos_product_id)) {
      topProductMap.set(item.pos_product_id, { product: name, qty: 0, revenue: 0 })
    }
    const d = topProductMap.get(item.pos_product_id)!
    d.qty += Number(item.quantity) || 0
    d.revenue += (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
  }
  const topProducts = [...topProductMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15)
    .map(p => ({ ...p, revenue: Math.round(p.revenue) }))

  // ── byHour (ENRICHED: avgServiceTime, propina) ──
  const hourMap = new Map<number, { revenue: number; cheques: number; propina: number; serviceTimeSum: number; serviceTimeCount: number }>()
  for (const s of allSales) {
    if (!s.opened_at) continue
    const hr = new Date(s.opened_at).getHours()
    if (!hourMap.has(hr)) hourMap.set(hr, { revenue: 0, cheques: 0, propina: 0, serviceTimeSum: 0, serviceTimeCount: 0 })
    const d = hourMap.get(hr)!
    d.revenue += Number(s.total) || 0
    d.cheques += 1
    d.propina += Number(s.tip_amount) || 0
    if (s.opened_at && s.closed_at) {
      const diff = (new Date(s.closed_at).getTime() - new Date(s.opened_at).getTime()) / 60000
      if (diff > 0) {
        d.serviceTimeSum += diff
        d.serviceTimeCount += 1
      }
    }
  }
  const byHour = [...hourMap.entries()].map(([hour, d]) => ({
    hour,
    revenue: Math.round(d.revenue),
    cheques: d.cheques,
    propina: Math.round(d.propina),
    avgServiceTime: d.serviceTimeCount > 0 ? Math.round(d.serviceTimeSum / d.serviceTimeCount) : 0,
  })).sort((a, b) => a.hour - b.hour)

  // ── topStaff ──
  const staffIds = [...new Set(allSales.map((s: any) => s.pos_staff_id).filter(Boolean))]
  const staffNames = new Map<string, string>()
  for (let i = 0; i < staffIds.length; i += BATCH) {
    const batch = staffIds.slice(i, i + BATCH)
    const { data: staffData } = await sb
      .from('pos_staff')
      .select('pos_staff_id, name')
      .in('pos_staff_id', batch)
    if (staffData) {
      for (const st of staffData) staffNames.set(st.pos_staff_id, st.name)
    }
  }

  const staffMap = new Map<string, { name: string; cheques: number; revenue: number }>()
  for (const s of allSales) {
    if (!s.pos_staff_id) continue
    const name = staffNames.get(s.pos_staff_id) || 'Desconocido'
    if (!staffMap.has(s.pos_staff_id)) {
      staffMap.set(s.pos_staff_id, { name, cheques: 0, revenue: 0 })
    }
    const d = staffMap.get(s.pos_staff_id)!
    d.cheques += 1
    d.revenue += Number(s.total) || 0
  }
  const topStaff = [...staffMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map(s => ({ ...s, revenue: Math.round(s.revenue) }))

  // ── dailyTrend ──
  const dayMap = new Map<string, { revenue: number; cheques: number; propina: number }>()
  for (const s of allSales) {
    if (!s.opened_at) continue
    const date = s.opened_at.slice(0, 10)
    if (!dayMap.has(date)) dayMap.set(date, { revenue: 0, cheques: 0, propina: 0 })
    const d = dayMap.get(date)!
    d.revenue += Number(s.total) || 0
    d.cheques += 1
    d.propina += Number(s.tip_amount) || 0
  }
  const dailyTrend = [...dayMap.entries()].map(([date, d]) => ({
    date,
    revenue: Math.round(d.revenue),
    cheques: d.cheques,
    propina: Math.round(d.propina),
  })).sort((a, b) => a.date.localeCompare(b.date))

  // ── NEW: Category breakdown (what categories sell in this zone) ──
  const groupIds = [...new Set([...productGroups.values()].filter(Boolean))]
  const groupNames = new Map<string, string>()
  for (let i = 0; i < groupIds.length; i += BATCH) {
    const batch = groupIds.slice(i, i + BATCH)
    const { data: groups } = await sb
      .from('pos_product_groups')
      .select('pos_group_id, name')
      .in('pos_group_id', batch)
    if (groups) {
      for (const g of groups) groupNames.set(g.pos_group_id, g.name)
    }
  }

  const categoryBreakdownMap = new Map<string, { categoryId: string; categoryName: string; qty: number; revenue: number }>()
  for (const item of allItems) {
    const gId = productGroups.get(item.pos_product_id)
    if (!gId) continue
    const catName = groupNames.get(gId) || gId
    if (!categoryBreakdownMap.has(gId)) {
      categoryBreakdownMap.set(gId, { categoryId: gId, categoryName: catName, qty: 0, revenue: 0 })
    }
    const d = categoryBreakdownMap.get(gId)!
    d.qty += Number(item.quantity) || 0
    d.revenue += (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
  }
  const categoryBreakdown = [...categoryBreakdownMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .map(c => ({ ...c, revenue: Math.round(c.revenue) }))

  // ── Payment methods for this zone's sales ──
  const paymentMethods = await fetchPaymentMethodsForSales(sb, saleIds)

  // ── Summary (ENRICHED) ──
  const totalRevenue = allSales.reduce((s: number, r: any) => s + (Number(r.total) || 0), 0)
  const totalCheques = allSales.length
  const totalPropina = allSales.reduce((s: number, r: any) => s + (Number(r.tip_amount) || 0), 0)
  const partySizeTotal = allSales.reduce((s: number, r: any) => s + (Number(r.party_size) || 0), 0)
  const partySizeAvg = totalCheques > 0 ? partySizeTotal / totalCheques : 0
  const { avgServiceTime } = computeServiceTime(allSales)

  return NextResponse.json({
    type: 'zone',
    topProducts,
    byHour,
    topStaff,
    dailyTrend,
    categoryBreakdown,
    paymentMethods,
    summary: {
      zone: zoneName,
      totalRevenue: Math.round(totalRevenue),
      totalCheques,
      totalPropina: Math.round(totalPropina),
      partySizeAvg: Math.round(partySizeAvg * 10) / 10,
      avgServiceTime,
    },
  })
}