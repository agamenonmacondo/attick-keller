import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

// ── Helpers ──────────────────────────────────────────────
function qparam(request: NextRequest, key: string): string | null {
  return request.nextUrl.searchParams.get(key)
}

/** Format COP compact: $1.2M, $890K, $12.500 */
function formatCOPDisplay(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000
    const str = m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)
    return `${sign}$${str}M`
  }
  if (abs >= 1_000) {
    const k = abs / 1_000
    const str = k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)
    return `${sign}$${str}K`
  }
  return `${sign}$${abs.toLocaleString('es-CO')}`
}

// ── Pagination helper ──
async function fetchAll<T = any>(
  sb: any,
  table: string,
  select: string,
  filters: Record<string, any>,
  batchSize = 1000
): Promise<T[]> {
  const results: T[] = []
  let offset = 0
  let hasMore = true
  while (hasMore) {
    let query = sb.from(table).select(select).range(offset, offset + batchSize - 1)
    for (const [key, value] of Object.entries(filters)) {
      if (key === '_in' && Array.isArray(value)) {
        continue
      }
      if (key === '_gte' && Array.isArray(value)) {
        continue
      }
      if (key === '_lte' && Array.isArray(value)) {
        continue
      }
      query = query.eq(key, value)
    }
    if (filters._gte) {
      for (const { column, value } of filters._gte) {
        query = query.gte(column, value)
      }
    }
    if (filters._lte) {
      for (const { column, value } of filters._lte) {
        query = query.lte(column, value)
      }
    }
    const { data, error } = await query
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

// ── Main handler ─────────────────────────────────────────
export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const BATCH = 1000

  // ── Parse filters ──
  const zoneParam = qparam(request, 'zone') || 'all'
  const categoryParam = qparam(request, 'category') || 'all'
  const fromParam = qparam(request, 'from') || '2026-04-01'
  const toParam = qparam(request, 'to') || '2026-04-30'

  // ── Fetch ALL sales (paginated) ──
  let allSales: any[] = []
  let salesOffset = 0
  let salesHasMore = true
  while (salesHasMore) {
    const { data: batch, error } = await sb
      .from('pos_sales')
      .select('id, total, tip_amount, subtotal, tax_amount, item_count, party_size, opened_at, closed_at, derived_zone_name, is_cancelled, pos_staff_id, pos_customer_id, customer_id, card_paid, cash_paid')
      .gte('opened_at', `${fromParam}T00:00:00`)
      .lte('opened_at', `${toParam}T23:59:59`)
      .eq('is_cancelled', false)
      .range(salesOffset, salesOffset + BATCH - 1)
      .order('opened_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Error cargando ventas: ' + error.message }, { status: 500 })
    }
    if (batch && batch.length > 0) {
      allSales.push(...batch)
      salesOffset += BATCH
      salesHasMore = batch.length === BATCH
    } else {
      salesHasMore = false
    }
  }

  // ── Category filter: find sale IDs with items from given category ──
  let categorySaleIds: Set<string> | null = null
  if (categoryParam !== 'all') {
    const { data: catProducts } = await sb
      .from('pos_products')
      .select('pos_product_id')
      .eq('pos_group_id', categoryParam)

    if (catProducts && catProducts.length > 0) {
      const productIds = catProducts.map((p: any) => p.pos_product_id)
      let allSaleIdsList: string[] = []
      for (let i = 0; i < productIds.length; i += BATCH) {
        const pidBatch = productIds.slice(i, i + BATCH)
        const { data: items } = await sb
          .from('pos_sale_items')
          .select('pos_sale_id')
          .in('pos_product_id', pidBatch)
          .range(0, BATCH - 1)
        if (items) allSaleIdsList.push(...items.map((it: any) => it.pos_sale_id))
      }
      categorySaleIds = new Set(allSaleIdsList)
    } else {
      categorySaleIds = new Set()
    }
  }

  // ── Apply filters ──
  let filteredSales = allSales
  if (zoneParam !== 'all') {
    filteredSales = filteredSales.filter((s: any) => s.derived_zone_name === zoneParam)
  }
  if (categorySaleIds !== null) {
    filteredSales = filteredSales.filter((s: any) => categorySaleIds.has(s.id))
  }

  const salesForKPIs = filteredSales
  const salesForZone = zoneParam !== 'all' || categoryParam !== 'all' ? allSales.filter((s: any) => {
    if (categorySaleIds !== null && !categorySaleIds.has(s.id)) return false
    return true
  }) : filteredSales

  // ── KPIs ──
  const totalRevenue = salesForKPIs.reduce((s: number, r: any) => s + (Number(r.total) || 0), 0)
  const totalTip = salesForKPIs.reduce((s: number, r: any) => s + (Number(r.tip_amount) || 0), 0)
  const totalParty = salesForKPIs.reduce((s: number, r: any) => s + (Number(r.party_size) || 0), 0)
  const cardPaidTotal = salesForKPIs.reduce((s: number, r: any) => s + (Number(r.card_paid) || 0), 0)
  const cashPaidTotal = salesForKPIs.reduce((s: number, r: any) => s + (Number(r.cash_paid) || 0), 0)
  const cheques = salesForKPIs.length

  // avgServiceTime: only from sales with closed_at
  const salesWithBothTimestamps = salesForKPIs.filter((s: any) => s.opened_at && s.closed_at)
  const totalServiceTime = salesWithBothTimestamps.reduce((s: number, r: any) => {
    const diff = (new Date(r.closed_at).getTime() - new Date(r.opened_at).getTime()) / 60000
    return s + (diff > 0 ? diff : 0)
  }, 0)
  const avgServiceTime = salesWithBothTimestamps.length > 0 ? totalServiceTime / salesWithBothTimestamps.length : 0

  const ticketPromedio = cheques > 0 ? totalRevenue / cheques : 0
  const propinaPromedio = cheques > 0 ? totalTip / cheques : 0
  const partySizePromedio = cheques > 0 ? totalParty / cheques : 0

  // ── By Zone (ENRICHED: avgServiceTime) ──
  const zoneMap = new Map<string, { revenue: number; cheques: number; propina: number; serviceTimeSum: number; serviceTimeCount: number }>()
  for (const s of salesForZone) {
    const z = s.derived_zone_name || 'Desconocido'
    if (!zoneMap.has(z)) zoneMap.set(z, { revenue: 0, cheques: 0, propina: 0, serviceTimeSum: 0, serviceTimeCount: 0 })
    const d = zoneMap.get(z)!
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
  // ── BUG-03 FIX: Separate "Desconocido" from regular zones ──
  const unknownZoneData = zoneMap.get('Desconocido')
  const unknownZone = unknownZoneData ? {
    revenue: Math.round(unknownZoneData.revenue),
    cheques: unknownZoneData.cheques,
    pct: totalRevenue > 0 ? Math.round((unknownZoneData.revenue / totalRevenue) * 100) : 0,
  } : { revenue: 0, cheques: 0, pct: 0 }

  const knownZoneEntries = [...zoneMap.entries()].filter(([zone]) => zone !== 'Desconocido')
  const totalZoneRevenue = knownZoneEntries.reduce((s, [, d]) => s + d.revenue, 0)
  const byZone = knownZoneEntries
    .map(([zone, d]) => ({
      zone,
      revenue: Math.round(d.revenue),
      cheques: d.cheques,
      ticketPromedio: d.cheques > 0 ? Math.round(d.revenue / d.cheques) : 0,
      propinaTotal: Math.round(d.propina),
      pct: totalZoneRevenue > 0 ? Math.round((d.revenue / totalZoneRevenue) * 100) : 0,
      avgServiceTime: d.serviceTimeCount > 0 ? Math.round(d.serviceTimeSum / d.serviceTimeCount) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // ── Hourly Revenue (ENRICHED: tipTotal, cardPaidTotal, cashPaidTotal) ──
  const hourMap = new Map<string, { revenue: number; cheques: number; tipTotal: number; cardPaidTotal: number; cashPaidTotal: number }>()
  for (const s of salesForKPIs) {
    const opened = s.opened_at
    if (!opened) continue
    const hour = new Date(opened).getHours().toString()
    if (!hourMap.has(hour)) hourMap.set(hour, { revenue: 0, cheques: 0, tipTotal: 0, cardPaidTotal: 0, cashPaidTotal: 0 })
    const d = hourMap.get(hour)!
    d.revenue += Number(s.total) || 0
    d.cheques += 1
    d.tipTotal += Number(s.tip_amount) || 0
    d.cardPaidTotal += Number(s.card_paid) || 0
    d.cashPaidTotal += Number(s.cash_paid) || 0
  }
  const hourlyRevenue = [...hourMap.entries()]
    .map(([hour, d]) => ({
      hour,
      revenue: Math.round(d.revenue),
      cheques: d.cheques,
      tipTotal: Math.round(d.tipTotal),
      cardPaidTotal: Math.round(d.cardPaidTotal),
      cashPaidTotal: Math.round(d.cashPaidTotal),
    }))
    .sort((a, b) => Number(a.hour) - Number(b.hour))

  // ── Daily Trend ──
  const dayMap = new Map<string, { revenue: number; cheques: number; propina: number; personas: number }>()
  for (const s of salesForKPIs) {
    const opened = s.opened_at
    if (!opened) continue
    const date = opened.slice(0, 10)
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
      personas: Math.round(d.personas),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // ── Sale items for products/categories ──
  const saleIds = salesForKPIs.map((s: any) => s.id)
  let allItems: any[] = []
  if (saleIds.length > 0) {
    for (let i = 0; i < saleIds.length; i += BATCH) {
      const batch = saleIds.slice(i, i + BATCH)
      const { data: itemsData } = await sb
        .from('pos_sale_items')
        .select('pos_sale_id, pos_product_id, quantity, unit_price')
        .in('pos_sale_id', batch)
      if (itemsData) allItems.push(...itemsData)
    }
  }

  // ── Product info (CORRECT column: pos_group_id) ──
  const productIdsInItems = [...new Set(allItems.map((i: any) => i.pos_product_id))]
  const productInfo = new Map<string, { name: string; groupId: string }>()
  if (productIdsInItems.length > 0) {
    for (let i = 0; i < productIdsInItems.length; i += BATCH) {
      const batch = productIdsInItems.slice(i, i + BATCH)
      const { data: prods } = await sb
        .from('pos_products')
        .select('pos_product_id, name, pos_group_id')
        .in('pos_product_id', batch)
      if (prods) {
        for (const p of prods) {
          productInfo.set(p.pos_product_id, { name: p.name, groupId: p.pos_group_id || '' })
        }
      }
    }
  }

  // ── Group names (CORRECT column: pos_group_id) ──
  const groupIds = [...new Set([...productInfo.values()].map(p => p.groupId).filter(Boolean))]
  const groupNames = new Map<string, string>()
  if (groupIds.length > 0) {
    for (let i = 0; i < groupIds.length; i += BATCH) {
      const batch = groupIds.slice(i, i + BATCH)
      const { data: groups } = await sb
        .from('pos_product_groups')
        .select('pos_group_id, name')
        .in('pos_group_id', batch)
      if (groups) {
        for (const g of groups) {
          groupNames.set(g.pos_group_id, g.name)
        }
      }
    }
  }

  // ── BUG FIX: Build ALL category/product data BEFORE applying category filter ──
  // This ensures topCategories, topProductByCategory, productsByCategory, etc.
  // always show ALL categories regardless of the selected category filter.

  // ── Top Products (revenue = quantity * unit_price, NO 'total' column) ──
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
  // ── Note: topProducts will be recomputed AFTER category filter (see below) ──

  // ── Top Categories (UNFILTERED — always shows ALL categories)
  // First, map each sale to its categories via items, so we can pull sale-level data (tip, party_size, service time)
  const saleToCategories = new Map<string, Set<string>>()
  for (const item of allItems) {
    const info = productInfo.get(item.pos_product_id)
    if (!info || !info.groupId) continue
    if (!saleToCategories.has(item.pos_sale_id)) saleToCategories.set(item.pos_sale_id, new Set())
    saleToCategories.get(item.pos_sale_id)!.add(info.groupId)
  }

  // Build sale lookup for category enrichment
  const saleLookup = new Map<string, any>()
  for (const s of salesForKPIs) saleLookup.set(s.id, s)

  const categoryRevenueMap = new Map<string, { categoryName: string; quantity: number; revenue: number; cheques: Set<string>; tipTotal: number; partySizeSum: number; partySizeCount: number; serviceTimeSum: number; serviceTimeCount: number }>()
  for (const item of allItems) {
    const info = productInfo.get(item.pos_product_id)
    if (!info) continue
    const catName = groupNames.get(info.groupId) || 'Sin categoria'
    const catKey = info.groupId || catName
    if (!categoryRevenueMap.has(catKey)) {
      categoryRevenueMap.set(catKey, { categoryName: catName, quantity: 0, revenue: 0, cheques: new Set(), tipTotal: 0, partySizeSum: 0, partySizeCount: 0, serviceTimeSum: 0, serviceTimeCount: 0 })
    }
    const d = categoryRevenueMap.get(catKey)!
    d.quantity += Number(item.quantity) || 0
    d.revenue += (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
    d.cheques.add(item.pos_sale_id)
  }
  // Enrich categories with sale-level data (tip, party_size, service_time)
  for (const [catKey, d] of categoryRevenueMap.entries()) {
    for (const saleId of d.cheques) {
      const sale = saleLookup.get(saleId)
      if (!sale) continue
      d.tipTotal += Number(sale.tip_amount) || 0
      d.partySizeSum += Number(sale.party_size) || 0
      d.partySizeCount += 1
      if (sale.opened_at && sale.closed_at) {
        const diff = (new Date(sale.closed_at).getTime() - new Date(sale.opened_at).getTime()) / 60000
        if (diff > 0) {
          d.serviceTimeSum += diff
          d.serviceTimeCount += 1
        }
      }
    }
  }
  const topCategories = [...categoryRevenueMap.entries()]
    .map(([categoryId, d]) => ({
      categoryId,
      categoryName: d.categoryName,
      quantity: d.quantity,
      revenue: Math.round(d.revenue),
      cheques: d.cheques.size,
      tipTotal: Math.round(d.tipTotal),
      tipAvg: d.cheques.size > 0 ? Math.round(d.tipTotal / d.cheques.size) : 0,
      avgServiceTime: d.serviceTimeCount > 0 ? Math.round(d.serviceTimeSum / d.serviceTimeCount) : 0,
      partySizeAvg: d.partySizeCount > 0 ? Math.round((d.partySizeSum / d.partySizeCount) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // ── Top Product BY Category (#1 product in each category) ──
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

  // ── Products by Category (ALL products, not just top 1, for inline expand) ──
  // Also need cheques per product: count unique sale IDs
  const productSaleIds = new Map<string, Set<string>>()
  for (const item of allItems) {
    const pid = item.pos_product_id
    if (!productSaleIds.has(pid)) productSaleIds.set(pid, new Set())
    productSaleIds.get(pid)!.add(item.pos_sale_id)
  }

  // Build productsByCategory for ALL categories (not just top 15)
  const productsByCategory: Record<string, Array<{ productId: string; productName: string; quantity: number; revenue: number; cheques: number }>> = {}
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

  // ── Top & Bottom Performers per Category ──
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

  // ── Category Companions (built from UNFILTERED data) ──
  const pairMap = new Map<string, { cat1Id: string; cat1Name: string; cat2Id: string; cat2Name: string; sharedCheques: number }>()
  for (const [saleId, catSet] of saleToCategories.entries()) {
    const catIds = [...catSet.values()]
    if (catIds.length < 2) continue
    // Sort to create consistent pair keys (lower id first)
    catIds.sort()
    for (let i = 0; i < catIds.length; i++) {
      for (let j = i + 1; j < catIds.length; j++) {
        const pairKey = `${catIds[i]}|${catIds[j]}`
        if (!pairMap.has(pairKey)) {
          pairMap.set(pairKey, {
            cat1Id: catIds[i],
            cat1Name: groupNames.get(catIds[i]) || catIds[i],
            cat2Id: catIds[j],
            cat2Name: groupNames.get(catIds[j]) || catIds[j],
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

  // ── NOW filter items by selected category (only affects KPIs, byZone, hourlyRevenue, dailyTrend, staffPerformance, topProducts, etc.) ──
  if (categoryParam && categoryParam !== 'all') {
    const categoryProductIds = new Set(
      [...productInfo.entries()]
        .filter(([, info]) => info.groupId === categoryParam)
        .map(([pid]) => pid)
    )
    allItems = allItems.filter((item: any) => categoryProductIds.has(String(item.pos_product_id)))
  }

  // ── Top Products (FILTERED by category — recomputed after category filter) ──
  const filteredProductRevenueMap = new Map<string, { name: string; category: string; quantity: number; revenue: number }>()
  for (const item of allItems) {
    const info = productInfo.get(item.pos_product_id)
    if (!info) continue
    const cat = groupNames.get(info.groupId) || 'Sin categoria'
    const key = item.pos_product_id
    if (!filteredProductRevenueMap.has(key)) {
      filteredProductRevenueMap.set(key, { name: info.name, category: cat, quantity: 0, revenue: 0 })
    }
    const d = filteredProductRevenueMap.get(key)!
    d.quantity += Number(item.quantity) || 0
    d.revenue += (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
  }
  const topProducts = [...filteredProductRevenueMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15)
    .map(p => ({ ...p, revenue: Math.round(p.revenue) }))

  // ── Staff Performance (ENRICHED: staff_type) ──
  const staffMap = new Map<string, { cheques: number; revenue: number; propinaTotal: number }>()
  for (const s of salesForKPIs) {
    const sid = s.pos_staff_id
    if (!sid) continue
    if (!staffMap.has(sid)) staffMap.set(sid, { cheques: 0, revenue: 0, propinaTotal: 0 })
    const d = staffMap.get(sid)!
    d.cheques += 1
    d.revenue += Number(s.total) || 0
    d.propinaTotal += Number(s.tip_amount) || 0
  }
  const staffIds = [...staffMap.keys()]
  const staffNames = new Map<string, string>()
  const staffTypes = new Map<string, number>()
  if (staffIds.length > 0) {
    for (let i = 0; i < staffIds.length; i += BATCH) {
      const batch = staffIds.slice(i, i + BATCH)
      const { data: staffData } = await sb
        .from('pos_staff')
        .select('pos_staff_id, name, staff_type')
        .in('pos_staff_id', batch)
      if (staffData) {
        for (const st of staffData) {
          staffNames.set(st.pos_staff_id, st.name)
          staffTypes.set(st.pos_staff_id, st.staff_type)
        }
      }
    }
  }
  const staffPerformance = [...staffMap.entries()]
    .map(([staffId, d]) => ({
      staffId,
      staffName: staffNames.get(staffId) || 'Desconocido',
      staffType: staffTypes.get(staffId) || 0,
      cheques: d.cheques,
      revenue: Math.round(d.revenue),
      propinaTotal: Math.round(d.propinaTotal),
      ticketPromedio: d.cheques > 0 ? Math.round(d.revenue / d.cheques) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // ── Payment Methods (CORRECT columns: pos_sale_id, pos_payment_method_id) ──
  let allPayments: any[] = []
  if (saleIds.length > 0) {
    for (let i = 0; i < saleIds.length; i += BATCH) {
      const batch = saleIds.slice(i, i + BATCH)
      const { data: payData } = await sb
        .from('pos_sale_payments')
        .select('pos_sale_id, pos_payment_method_id, amount, tip')
        .in('pos_sale_id', batch)
      if (payData) allPayments.push(...payData)
    }
  }

  const methodIds = [...new Set(allPayments.map((p: any) => p.pos_payment_method_id).filter(Boolean))]
  const methodNames = new Map<string, string>()
  if (methodIds.length > 0) {
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
  }

  const paymentMap = new Map<string, { amount: number; count: number }>()
  for (const p of allPayments) {
    const mName = methodNames.get(p.pos_payment_method_id) || 'Otro'
    if (!paymentMap.has(mName)) paymentMap.set(mName, { amount: 0, count: 0 })
    const d = paymentMap.get(mName)!
    d.amount += Number(p.amount) || 0
    d.count += 1
  }
  const totalPaymentAmount = [...paymentMap.values()].reduce((s, d) => s + d.amount, 0)
  const paymentMethods = [...paymentMap.entries()]
    .map(([method, d]) => ({
      method,
      amount: Math.round(d.amount),
      count: d.count,
      pct: totalPaymentAmount > 0 ? Math.round((d.amount / totalPaymentAmount) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)

  // ── Client Tiers ──
  const { data: tierData } = await sb
    .from('customer_stats')
    .select('loyalty_tier, total_spent')
    .not('loyalty_tier', 'is', null)

  const tierMap = new Map<string, { count: number; totalSpent: number }>()
  if (tierData) {
    for (const t of tierData) {
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

  // ── Client Split ──
  let consumidorFinal = { cheques: 0, revenue: 0 }
  let identificados = { cheques: 0, revenue: 0 }
  for (const s of salesForKPIs) {
    if (s.customer_id || s.pos_customer_id) {
      identificados.cheques += 1
      identificados.revenue += Number(s.total) || 0
    } else {
      consumidorFinal.cheques += 1
      consumidorFinal.revenue += Number(s.total) || 0
    }
  }
  const clientSplit = {
    consumidorFinal: { cheques: consumidorFinal.cheques, revenue: Math.round(consumidorFinal.revenue) },
    identificados: { cheques: identificados.cheques, revenue: Math.round(identificados.revenue) },
  }

  // ── Category list for filters (CORRECT column: pos_group_id) ──
  const { data: allGroups } = await sb
    .from('pos_product_groups')
    .select('pos_group_id, name')
    .order('pos_group_id')
  // Only include categories that have at least one product assigned
  const categoriesWithProducts = new Set(Array.from(productInfo.values()).map((v: any) => v.groupId).filter(Boolean))
  const categoryList = (allGroups || [])
    .filter((g: any) => g.pos_group_id && !g.pos_group_id.startsWith('SG_') && categoriesWithProducts.has(g.pos_group_id))
    .map((g: any) => ({ id: g.pos_group_id, name: g.name }))

  // ── NEW: Shifts (last 10) ──
  const { data: shiftData } = await sb
    .from('pos_shifts')
    .select('pos_shift_id, station, cashier, cash_total, card_total, credit_total, opened_at, closed_at, is_closed')
    .gte('opened_at', `${fromParam}T00:00:00`)
    .lte('opened_at', `${toParam}T23:59:59`)
    .order('opened_at', { ascending: false })
    .range(0, 9)

  const shifts = (shiftData || []).map((s: any) => ({
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

  // ── NEW: Payment methods by zone ──
  // Map saleId -> zone from saleLookup
  const zonePaymentMap = new Map<string, Map<string, { amount: number; count: number }>>()
  for (const p of allPayments) {
    const sale = saleLookup.get(p.pos_sale_id)
    if (!sale) continue
    const zone = sale.derived_zone_name || 'Desconocido'
    const mName = methodNames.get(p.pos_payment_method_id) || 'Otro'
    if (!zonePaymentMap.has(zone)) zonePaymentMap.set(zone, new Map())
    const zMap = zonePaymentMap.get(zone)!
    if (!zMap.has(mName)) zMap.set(mName, { amount: 0, count: 0 })
    const d = zMap.get(mName)!
    d.amount += Number(p.amount) || 0
    d.count += 1
  }
  const byZonePayment = [...zonePaymentMap.entries()]
    .map(([zone, methods]) => {
      const methodsArr = [...methods.entries()]
        .map(([method, d]) => ({
          method,
          amount: Math.round(d.amount),
          count: d.count,
        }))
        .sort((a, b) => b.amount - a.amount)
      const totalMethodAmount = methodsArr.reduce((s, m) => s + m.amount, 0)
      return {
        zone,
        methods: methodsArr.map(m => ({
          ...m,
          pct: totalMethodAmount > 0 ? Math.round((m.amount / totalMethodAmount) * 100) : 0,
        })),
      }
    })
    .sort((a, b) => {
      const totalA = a.methods.reduce((s, m) => s + m.amount, 0)
      const totalB = b.methods.reduce((s, m) => s + m.amount, 0)
      return totalB - totalA
    })

  // ── Assemble response ──
  return NextResponse.json({
    kpis: {
      revenue: Math.round(totalRevenue),
      cheques,
      ticketPromedio: Math.round(ticketPromedio),
      propinaTotal: Math.round(totalTip),
      propinaPromedio: Math.round(propinaPromedio),
      personas: totalParty,
      partySizePromedio: Math.round(partySizePromedio * 10) / 10,
      cardPaidTotal: Math.round(cardPaidTotal),
      cashPaidTotal: Math.round(cashPaidTotal),
      avgServiceTime: Math.round(avgServiceTime),
    },
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
    filters: { zone: zoneParam, category: categoryParam, from: fromParam, to: toParam },
  })
}