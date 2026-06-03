import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

// ── Helpers ──────────────────────────────────────────────
function qparam(request: NextRequest, key: string): string | null {
  return request.nextUrl.searchParams.get(key)
}

// ── Core data fetching (cached) ──────────────────────────
async function fetchDashboardData(
  zoneParam: string,
  categoryParam: string,
  from: string,
  to: string,
  availableMonths: string[],
) {
  const sb = getServiceClient()
  const PAGE_SIZE = 900  // for .range() pagination — no limit
  const IN_BATCH = 200   // for .in() clauses — Supabase fails silently beyond ~200 UUIDs

  // ── 1. Parallel: all RPCs + shifts + groups + sale IDs ──
  const rpcParams = { p_from: from, p_to: to }
  const rpcParamsZone = { ...rpcParams, p_zone: zoneParam }
  const rpcParamsCat = { ...rpcParamsZone, p_category: categoryParam }

  const [
    kpiResult,
    zoneResult,
    hourlyResult,
    dailyResult,
    staffResult,
    paymentsResult,
    clientSplitResult,
    paymentsByZoneResult,
    shiftsResult,
    groupsResult,
  ] = await Promise.all([
    sb.rpc('pos_dashboard_kpis', rpcParamsCat),
    sb.rpc('pos_dashboard_by_zone', rpcParamsCat),
    sb.rpc('pos_dashboard_hourly', rpcParamsCat),
    sb.rpc('pos_dashboard_daily', rpcParamsCat),
    sb.rpc('pos_dashboard_staff', rpcParamsCat),
    sb.rpc('pos_dashboard_payments', rpcParamsCat),
    sb.rpc('pos_dashboard_client_split', rpcParamsCat),
    sb.rpc('pos_dashboard_payments_by_zone', rpcParamsCat),
    sb.from('pos_shifts')
      .select('pos_shift_id, station, cashier, cash_total, card_total, credit_total, opened_at, closed_at, is_closed')
      .gte('opened_at', `${from}T00:00:00`)
      .lte('opened_at', `${to}T23:59:59`)
      .order('opened_at', { ascending: false })
      .range(0, 9),
    sb.from('pos_product_groups')
      .select('pos_group_id, name')
      .order('pos_group_id'),
  ])

  const kpiData = kpiResult.data
  const zonesData = (zoneResult.data || []) as any[]
  const hourlyData = (hourlyResult.data || []) as any[]
  const dailyData = (dailyResult.data || []) as any[]
  const staffData = (staffResult.data || []) as any[]
  const paymentsData = (paymentsResult.data || []) as any[]
  const clientSplitData = (clientSplitResult.data || []) as any[]
  const paymentsByZoneData = (paymentsByZoneResult.data || []) as any[]
  const shiftsData = (shiftsResult.data || []) as any[]
  const allGroups = (groupsResult.data || []) as any[]

  // ── 1b. Fetch all sale IDs for the period (lightweight) ──
  let allSaleIds: string[] = []
  let saleOffset = 0
  while (true) {
    const { data: saleIdsBatch } = await sb
      .from('pos_sales')
      .select('id')
      .gte('opened_at', `${from}T00:00:00`)
      .lte('opened_at', `${to}T23:59:59`)
      .eq('is_cancelled', false)
      .range(saleOffset, saleOffset + PAGE_SIZE - 1)
      .order('opened_at', { ascending: true })
    if (saleIdsBatch && saleIdsBatch.length > 0) {
      allSaleIds.push(...saleIdsBatch.map((s: any) => s.id))
      saleOffset += PAGE_SIZE
      if (saleIdsBatch.length < PAGE_SIZE) break
    } else break
  }

  // ── 2. Fetch all items for categories (parallelized by sale batches) ──
  let allItems: any[] = []
  if (allSaleIds.length > 0) {
    // Split sales into batches of IN_BATCH for the .in() clause
    const saleBatches: string[][] = []
    for (let i = 0; i < allSaleIds.length; i += IN_BATCH) {
      saleBatches.push(allSaleIds.slice(i, i + IN_BATCH))
    }

    // Fetch items for each sale batch in parallel
    const itemPromises = saleBatches.map(async (saleBatch) => {
      let items: any[] = []
      let itemOffset = 0
      while (true) {
        const { data: batch } = await sb
          .from('pos_sale_items')
          .select('pos_sale_id, pos_product_id, quantity, unit_price')
          .in('pos_sale_id', saleBatch)
          .range(itemOffset, itemOffset + PAGE_SIZE - 1)
        if (batch && batch.length > 0) {
          items.push(...batch)
          itemOffset += PAGE_SIZE
          if (batch.length < PAGE_SIZE) break
        } else break
      }
      return items
    })
    const itemArrays = await Promise.all(itemPromises)
    allItems = itemArrays.flat()
  }

  // ── Trim item product IDs for in-memory lookups ──
  for (const item of allItems) {
    if (item.pos_product_id && typeof item.pos_product_id === 'string') {
      item.pos_product_id = item.pos_product_id.trim()
    }
  }

  // ── 3. Product info & group names ──
  const productIdsForQuery = [...new Set(allItems.map((i: any) => i.pos_product_id).filter(Boolean))]
  const productInfo = new Map<string, { name: string; groupId: string }>()
  if (productIdsForQuery.length > 0) {
    const prodBatches: string[][] = []
    for (let i = 0; i < productIdsForQuery.length; i += IN_BATCH) {
      prodBatches.push(productIdsForQuery.slice(i, i + IN_BATCH))
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
    for (let i = 0; i < groupIds.length; i += IN_BATCH) {
      groupBatches.push(groupIds.slice(i, i + IN_BATCH))
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

  // Also merge groups from the full groups list (some may not be in items)
  for (const g of allGroups) {
    if (g.pos_group_id && !groupNames.has(g.pos_group_id)) {
      groupNames.set(g.pos_group_id, g.name)
    }
  }

  // ── 4. Build category data from items ──
  const itemsRevenueTotal = Math.round(
    allItems.reduce((s, item) => s + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0)
  )

  // Sale -> categories map (for companions)
  const saleToCategories = new Map<string, Set<string>>()
  for (const item of allItems) {
    const info = productInfo.get(item.pos_product_id)
    if (!info || !info.groupId) continue
    if (!saleToCategories.has(item.pos_sale_id)) saleToCategories.set(item.pos_sale_id, new Set())
    saleToCategories.get(item.pos_sale_id)!.add(info.groupId)
  }

  // Per-category aggregation
  const categoryRevenueMap = new Map<string, {
    categoryName: string; quantity: number; revenue: number; cheques: Set<string>
  }>()
  for (const item of allItems) {
    const info = productInfo.get(item.pos_product_id)
    if (!info) continue
    const catName = groupNames.get(info.groupId) || 'Sin categoria'
    const catKey = info.groupId || catName
    if (!categoryRevenueMap.has(catKey)) {
      categoryRevenueMap.set(catKey, {
        categoryName: catName, quantity: 0, revenue: 0, cheques: new Set(),
      })
    }
    const d = categoryRevenueMap.get(catKey)!
    d.quantity += Number(item.quantity) || 0
    d.revenue += (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
    d.cheques.add(item.pos_sale_id)
  }

  // For category enrichment (tip, party_size, service_time), query sale-level data
  const allCategorySaleIds = [...new Set(
    [...categoryRevenueMap.values()].flatMap(d => [...d.cheques])
  )]
  const saleEnrichment = new Map<string, { tip: number; partySize: number; serviceMin: number }>()
  if (allCategorySaleIds.length > 0) {
    const enrichBatches: string[][] = []
    for (let i = 0; i < allCategorySaleIds.length; i += IN_BATCH) {
      enrichBatches.push(allCategorySaleIds.slice(i, i + IN_BATCH))
    }
    const enrichPromises = enrichBatches.map(async (batch) => {
      const { data: sales } = await sb
        .from('pos_sales')
        .select('id, tip_amount, party_size, opened_at, closed_at')
        .in('id', batch)
      return sales || []
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

  // Enrich categories
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

  // Per-category product ranking
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

  // Products by Category
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

  // Category Companions
  const pairMap = new Map<string, { cat1Id: string; cat1Name: string; cat2Id: string; cat2Name: string; sharedCheques: number }>()
  for (const [, catSet] of saleToCategories.entries()) {
    const catIds = [...catSet.values()]
    if (catIds.length < 2) continue
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

  // ── 5. Apply category filter to items (for filtered topProducts) ──
  let filteredItems = allItems
  if (categoryParam && categoryParam !== 'all') {
    const categoryProductIds = new Set(
      [...productInfo.entries()]
        .filter(([, info]) => info.groupId === categoryParam)
        .map(([pid]) => pid)
    )
    filteredItems = allItems.filter((item: any) => categoryProductIds.has(String(item.pos_product_id)))
  }

  // Filtered Top Products
  const filteredProductRevenueMap = new Map<string, { name: string; category: string; quantity: number; revenue: number }>()
  for (const item of filteredItems) {
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
  const topProducts = [...filteredProductRevenueMap.entries()]
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .slice(0, 15)
    .map(([productId, p]) => ({ productId, productName: p.name || 'Sin nombre', category: p.category, quantity: p.quantity, revenue: Math.round(p.revenue) }))

  // ── 6. Assemble KPIs from RPC ──
  const kpi = kpiData && kpiData.length > 0 ? kpiData[0] : null
  const totalRevenue = Number(kpi?.revenue) || 0
  const cheques = Number(kpi?.cheques) || 0
  const totalTip = Number(kpi?.tip_total) || 0
  const totalParty = Number(kpi?.party_size_total) || 0
  const cardPaidTotal = Number(kpi?.card_paid_total) || 0
  const cashPaidTotal = Number(kpi?.cash_paid_total) || 0
  const avgServiceTime = Number(kpi?.avg_service_time_min) || 0
  const ticketPromedio = Number(kpi?.ticket_promedio) || 0
  const propinaPromedio = Number(kpi?.tip_promedio) || 0
  const partySizePromedio = Number(kpi?.party_size_promedio) || 0

  // ── 7. By Zone from RPC ──
  const unknownZoneRow = zonesData.find((z: any) => z.zone === 'Desconocido')
  const unknownZone = unknownZoneRow ? {
    revenue: Number(unknownZoneRow.revenue) || 0,
    cheques: Number(unknownZoneRow.cheques) || 0,
    pct: totalRevenue > 0 ? Math.round((Number(unknownZoneRow.revenue) / totalRevenue) * 100) : 0,
  } : { revenue: 0, cheques: 0, pct: 0 }

  const knownZones = zonesData.filter((z: any) => z.zone !== 'Desconocido')
  const totalZoneRevenue = knownZones.reduce((s: number, z: any) => s + (Number(z.revenue) || 0), 0)
  const byZone = knownZones
    .map((z: any) => ({
      zone: z.zone,
      revenue: Number(z.revenue) || 0,
      cheques: Number(z.cheques) || 0,
      ticketPromedio: Number(z.cheques) > 0 ? Math.round(Number(z.revenue) / Number(z.cheques)) : 0,
      propinaTotal: Number(z.tip_total) || 0,
      pct: totalZoneRevenue > 0 ? Math.round((Number(z.revenue) / totalZoneRevenue) * 100) : 0,
      avgServiceTime: Number(z.avg_service_time_min) || 0,
    }))
    .sort((a: any, b: any) => b.revenue - a.revenue)

  // ── 8. Hourly from RPC ──
  const hourlyRevenue = hourlyData.map((h: any) => ({
    hour: String(h.hour),
    revenue: Number(h.revenue) || 0,
    cheques: Number(h.cheques) || 0,
    tipTotal: Number(h.tip_total) || 0,
    cardPaidTotal: Number(h.card_paid_total) || 0,
    cashPaidTotal: Number(h.cash_paid_total) || 0,
  }))

  // ── 9. Daily from RPC ──
  const dailyTrend = dailyData.map((d: any) => ({
    date: d.date,
    revenue: Number(d.revenue) || 0,
    cheques: Number(d.cheques) || 0,
    propina: Number(d.propina) || 0,
    personas: Number(d.personas) || 0,
  }))

  // ── 10. Staff from RPC ──
  const staffPerformance = staffData.map((s: any) => ({
    staffId: s.staff_id,
    staffName: s.staff_name,
    staffType: Number(s.staff_type) || 0,
    cheques: Number(s.cheques) || 0,
    revenue: Number(s.revenue) || 0,
    propinaTotal: Number(s.tip_total) || 0,
    ticketPromedio: Number(s.ticket_promedio) || 0,
  }))

  // ── 11. Payments from RPC ──
  const paymentMethods = paymentsData.map((p: any) => ({
    method: p.method,
    amount: Number(p.amount) || 0,
    count: Number(p.count) || 0,
    pct: Number(p.pct) || 0,
  }))

  // ── 12. Client Split from RPC ──
  const cfRow = clientSplitData.find((c: any) => c.consumer_type === 'consumidor_final')
  const idRow = clientSplitData.find((c: any) => c.consumer_type === 'identificados')
  const clientSplit = {
    consumidorFinal: { cheques: Number(cfRow?.cheques) || 0, revenue: Number(cfRow?.revenue) || 0 },
    identificados: { cheques: Number(idRow?.cheques) || 0, revenue: Number(idRow?.revenue) || 0 },
  }

  // ── 13. Client Tiers ──
  let customerIdSet = new Set<string>()
  {
    let custOffset = 0
    while (true) {
      const { data: custBatch } = await sb
        .from('pos_sales')
        .select('customer_id, pos_customer_id')
        .gte('opened_at', `${from}T00:00:00`)
        .lte('opened_at', `${to}T23:59:59`)
        .eq('is_cancelled', false)
        .range(custOffset, custOffset + PAGE_SIZE - 1)
      if (custBatch && custBatch.length > 0) {
        for (const r of custBatch) {
          const cid = r.customer_id || r.pos_customer_id
          if (cid) customerIdSet.add(cid)
        }
        custOffset += PAGE_SIZE
        if (custBatch.length < PAGE_SIZE) break
      } else break
    }
  }
  const customerIds = [...customerIdSet]
  const tierMap = new Map<string, { count: number; totalSpent: number }>()
  if (customerIds.length > 0) {
    const custBatches: string[][] = []
    for (let i = 0; i < customerIds.length; i += IN_BATCH) {
      custBatches.push(customerIds.slice(i, i + IN_BATCH))
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

  // ── 14. Category List ──
  const categoriesWithProducts = new Set(Array.from(productInfo.values()).map(v => v.groupId).filter(Boolean))
  const categoryList = allGroups
    .filter((g: any) => g.pos_group_id && !g.pos_group_id.startsWith('SG_') && categoriesWithProducts.has(g.pos_group_id))
    .map((g: any) => ({ id: g.pos_group_id, name: g.name }))

  // ── 15. Shifts ──
  const shifts = shiftsData.map((s: any) => ({
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

  // ── 16. By Zone Payment from RPC ──
  const zonePaymentGrouped = new Map<string, Array<{ method: string; amount: number; count: number }>>()
  for (const p of paymentsByZoneData) {
    const z = p.zone
    if (!zonePaymentGrouped.has(z)) zonePaymentGrouped.set(z, [])
    zonePaymentGrouped.get(z)!.push({
      method: p.method,
      amount: Number(p.amount) || 0,
      count: Number(p.count) || 0,
    })
  }
  const byZonePayment = [...zonePaymentGrouped.entries()]
    .map(([zone, methods]) => {
      const sorted = methods.sort((a, b) => b.amount - a.amount)
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

  return {
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
  }
}

// ── Main handler ─────────────────────────────────────────
export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const zoneParam = qparam(request, 'zone') || 'all'
  const categoryParam = qparam(request, 'category') || 'all'
  let from = qparam(request, 'from') || ''
  let to = qparam(request, 'to') || ''

  const sb = getServiceClient()

  // Resolve date range and available months (single RPC call)
  const { data: months } = await sb.rpc('pos_dashboard_months')
  const monthsList = (months || []).map((m: any) => m.month)

  if (!from || !to) {
    if (monthsList.length > 0) {
      const latest = monthsList[monthsList.length - 1]
      const [y, m] = latest.split('-').map(Number)
      from = from || `${y}-${String(m).padStart(2, '0')}-01`
      const lastDay = new Date(y, m, 0).getDate()
      to = to || `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    } else {
      from = from || '2026-01-01'
      to = to || '2026-12-31'
    }
  }

  const getCachedData = unstable_cache(
    fetchDashboardData,
    ['pos-dashboard', zoneParam, categoryParam, from, to],
    { revalidate: 300 }
  )

  try {
    const data = await getCachedData(zoneParam, categoryParam, from, to, monthsList)
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error cargando dashboard' }, { status: 500 })
  }
}
