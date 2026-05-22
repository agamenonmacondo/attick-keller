import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

// ── Helpers ──────────────────────────────────────────────
function qparam(request: NextRequest, key: string): string | null {
  return request.nextUrl.searchParams.get(key)
}

/** Format COP compact: $1.2M, $890K, $12.500 */
function formatCOPCoin(n: number): string {
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

// ── Main handler ─────────────────────────────────────────
export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()

  // ── Parse filters ──
  const zoneParam = qparam(request, 'zone') || 'all'
  const categoryParam = qparam(request, 'category') || 'all'
  const fromParam = qparam(request, 'from') || '2026-04-01'
  const toParam = qparam(request, 'to') || '2026-04-30'

  // ── Build base sales query ──
  let salesQuery = sb
    .from('pos_sales')
    .select('id, total, tip_amount, subtotal, tax_amount, item_count, party_size, opened_at, closed_at, derived_zone_name, is_cancelled, pos_staff_id, pos_customer_id, customer_id')
    .gte('opened_at', `${fromParam}T00:00:00`)
    .lte('opened_at', `${toParam}T23:59:59`)
    .eq('is_cancelled', false)

  if (zoneParam !== 'all') {
    salesQuery = salesQuery.eq('derived_zone_name', zoneParam)
  }

  // If category filter is active, we need a sub-select approach: 
  // First find sale IDs that contain items from the given category, then filter.
  let categorySaleIds: Set<string> | null = null
  if (categoryParam !== 'all') {
    // Get product_group_id for products in this category via pos_id_mapping
    // categoryParam is a pos_product_group_id
    const { data: catProducts } = await sb
      .from('pos_products')
      .select('pos_product_id')
      .eq('pos_product_group_id', categoryParam)

    if (catProducts && catProducts.length > 0) {
      const productIds = catProducts.map((p: any) => p.pos_product_id)
      
      // Fetch sale_items with these product IDs 
      // Need pagination since >1000 possible
      let allSaleIds: string[] = []
      let offset = 0
      const batchSize = 1000
      let hasMore = true
      while (hasMore) {
        const { data: items } = await sb
          .from('pos_sale_items')
          .select('pos_sale_id')
          .in('pos_product_id', productIds)
          .range(offset, offset + batchSize - 1)
        if (items && items.length > 0) {
          allSaleIds.push(...items.map((i: any) => i.pos_sale_id))
          offset += batchSize
          hasMore = items.length === batchSize
        } else {
          hasMore = false
        }
      }
      categorySaleIds = new Set(allSaleIds)
    } else {
      // No products in this category → empty result
      categorySaleIds = new Set()
    }
  }

  // Now fetch all qualifying sales with pagination
  let allSales: any[] = []
  let salesOffset = 0
  const salesBatch = 1000
  let salesHasMore = true
  while (salesHasMore) {
    const { data: salesBatchData, error: salesErr } = await sb
      .from('pos_sales')
      .select('id, total, tip_amount, subtotal, tax_amount, item_count, party_size, opened_at, closed_at, derived_zone_name, is_cancelled, pos_staff_id, pos_customer_id, customer_id')
      .gte('opened_at', `${fromParam}T00:00:00`)
      .lte('opened_at', `${toParam}T23:59:59`)
      .eq('is_cancelled', false)
      .range(salesOffset, salesOffset + salesBatch - 1)
      .order('opened_at', { ascending: true })

    if (salesErr) {
      return NextResponse.json({ error: 'Error cargando ventas' }, { status: 500 })
    }

    if (salesBatchData && salesBatchData.length > 0) {
      // Apply zone filter server-side if needed
      let batch = salesBatchData
      if (zoneParam !== 'all') {
        batch = batch.filter((s: any) => s.derived_zone_name === zoneParam)
      }
      // Apply category filter
      if (categorySaleIds !== null) {
        batch = batch.filter((s: any) => categorySaleIds.has(s.id))
      }
      allSales.push(...batch)
      salesOffset += salesBatch
      salesHasMore = salesBatchData.length === salesBatch
    } else {
      salesHasMore = false
    }
  }

  // ── Also fetch ALL sales without zone/category filter for byZone breakdown ──
  // Only when zone or category filter is active (we still need global zone data)
  let allSalesForZone: any[] = []
  if (zoneParam !== 'all' || categoryParam !== 'all') {
    let zoneOffset = 0
    let zoneHasMore = true
    while (zoneHasMore) {
      const { data: zoneBatch } = await sb
        .from('pos_sales')
        .select('id, total, derived_zone_name, opened_at')
        .gte('opened_at', `${fromParam}T00:00:00`)
        .lte('opened_at', `${toParam}T23:59:59`)
        .eq('is_cancelled', false)
        .range(zoneOffset, zoneOffset + salesBatch - 1)

      if (zoneBatch && zoneBatch.length > 0) {
        // Apply category filter if active
        let batch = zoneBatch
        if (categorySaleIds !== null) {
          batch = batch.filter((s: any) => categorySaleIds.has(s.id))
        }
        allSalesForZone.push(...batch)
        zoneOffset += salesBatch
        zoneHasMore = zoneBatch.length === salesBatch
      } else {
        zoneHasMore = false
      }
    }
  }

  // ── Calculate KPIs ──
  const totalRevenue = allSales.reduce((s: number, r: any) => s + (Number(r.total) || 0), 0)
  const totalTip = allSales.reduce((s: number, r: any) => s + (Number(r.tip_amount) || 0), 0)
  const totalParty = allSales.reduce((s: number, r: any) => s + (Number(r.party_size) || 0), 0)
  const cheques = allSales.length
  const ticketPromedio = cheques > 0 ? totalRevenue / cheques : 0
  const propinaPromedio = cheques > 0 ? totalTip / cheques : 0
  const partySizePromedio = cheques > 0 ? totalParty / cheques : 0

  // ── By Zone ──
  const zoneSource = zoneParam !== 'all' || categoryParam !== 'all' ? allSalesForZone : allSales
  const zoneMap = new Map<string, { revenue: number; cheques: number; propina: number }>()
  for (const s of zoneSource) {
    const z = s.derived_zone_name || 'Desconocido'
    if (!zoneMap.has(z)) zoneMap.set(z, { revenue: 0, cheques: 0, propina: 0 })
    const d = zoneMap.get(z)!
    d.revenue += Number(s.total) || 0
    d.cheques += 1
    d.propina += Number(s.tip_amount) || 0
  }
  const totalZoneRevenue = [...zoneMap.values()].reduce((s, d) => s + d.revenue, 0)
  const byZone = [...zoneMap.entries()]
    .map(([zone, d]) => ({
      zone,
      revenue: Math.round(d.revenue),
      cheques: d.cheques,
      ticketPromedio: d.cheques > 0 ? Math.round(d.revenue / d.cheques) : 0,
      propinaTotal: Math.round(d.propina),
      pct: totalZoneRevenue > 0 ? Math.round((d.revenue / totalZoneRevenue) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // ── Hourly Revenue ──
  const hourMap = new Map<string, { revenue: number; cheques: number }>()
  for (const s of allSales) {
    const opened = s.opened_at
    if (!opened) continue
    const hour = new Date(opened).getHours().toString()
    if (!hourMap.has(hour)) hourMap.set(hour, { revenue: 0, cheques: 0 })
    const d = hourMap.get(hour)!
    d.revenue += Number(s.total) || 0
    d.cheques += 1
  }
  const hourlyRevenue = [...hourMap.entries()]
    .map(([hour, d]) => ({ hour, revenue: Math.round(d.revenue), cheques: d.cheques }))
    .sort((a, b) => Number(a.hour) - Number(b.hour))

  // ── Daily Trend ──
  const dayMap = new Map<string, { revenue: number; cheques: number; propina: number }>()
  for (const s of allSales) {
    const opened = s.opened_at
    if (!opened) continue
    const date = opened.slice(0, 10) // YYYY-MM-DD
    if (!dayMap.has(date)) dayMap.set(date, { revenue: 0, cheques: 0, propina: 0 })
    const d = dayMap.get(date)!
    d.revenue += Number(s.total) || 0
    d.cheques += 1
    d.propina += Number(s.tip_amount) || 0
  }
  const dailyTrend = [...dayMap.entries()]
    .map(([date, d]) => ({
      date,
      revenue: Math.round(d.revenue),
      cheques: d.cheques,
      propina: Math.round(d.propina),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // ── Top Products & Categories ──
  // Fetch sale_items for filtered sales
  const saleIds = allSales.map((s: any) => s.id)
  let allItems: any[] = []
  if (saleIds.length > 0) {
    // Fetch in batches of 1000
    for (let i = 0; i < saleIds.length; i += 1000) {
      const batch = saleIds.slice(i, i + 1000)
      const { data: itemsData } = await sb
        .from('pos_sale_items')
        .select('pos_sale_id, pos_product_id, quantity, total, unit_price')
        .in('pos_sale_id', batch)
      if (itemsData) allItems.push(...itemsData)
    }
  }

  // Get product names and group_ids
  const productIds = [...new Set(allItems.map((i: any) => i.pos_product_id))]
  const productInfo = new Map<string, { name: string; groupId: string }>()
  if (productIds.length > 0) {
    for (let i = 0; i < productIds.length; i += 1000) {
      const batch = productIds.slice(i, i + 1000)
      const { data: prods } = await sb
        .from('pos_products')
        .select('pos_product_id, name, pos_product_group_id')
        .in('pos_product_id', batch)
      if (prods) {
        for (const p of prods) {
          productInfo.set(p.pos_product_id, { name: p.name, groupId: p.pos_product_group_id })
        }
      }
    }
  }

  // Get group names
  const groupIds = [...new Set([...productInfo.values()].map(p => p.groupId).filter(Boolean))]
  const groupNames = new Map<string, string>()
  if (groupIds.length > 0) {
    for (let i = 0; i < groupIds.length; i += 1000) {
      const batch = groupIds.slice(i, i + 1000)
      const { data: groups } = await sb
        .from('pos_product_groups')
        .select('pos_product_group_id, name')
        .in('pos_product_group_id', batch)
      if (groups) {
        for (const g of groups) {
          groupNames.set(g.pos_product_group_id, g.name)
        }
      }
    }
  }

  // Top Products
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
    d.revenue += Number(item.total) || 0
  }
  const topProducts = [...productRevenueMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15)
    .map(p => ({
      ...p,
      revenue: Math.round(p.revenue),
    }))

  // Top Categories
  const categoryRevenueMap = new Map<string, { categoryName: string; quantity: number; revenue: number; cheques: Set<string> }>()
  for (const item of allItems) {
    const info = productInfo.get(item.pos_product_id)
    if (!info) continue
    const catName = groupNames.get(info.groupId) || 'Sin categoria'
    const catKey = info.groupId || catName
    if (!categoryRevenueMap.has(catKey)) {
      categoryRevenueMap.set(catKey, { categoryName: catName, quantity: 0, revenue: 0, cheques: new Set() })
    }
    const d = categoryRevenueMap.get(catKey)!
    d.quantity += Number(item.quantity) || 0
    d.revenue += Number(item.total) || 0
    d.cheques.add(item.pos_sale_id)
  }
  const topCategories = [...categoryRevenueMap.entries()]
    .map(([categoryId, d]) => ({
      categoryId,
      categoryName: d.categoryName,
      quantity: d.quantity,
      revenue: Math.round(d.revenue),
      cheques: d.cheques.size,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // ── Staff Performance ──
  const staffMap = new Map<string, { cheques: number; revenue: number; propinaTotal: number }>()
  for (const s of allSales) {
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
  if (staffIds.length > 0) {
    for (let i = 0; i < staffIds.length; i += 1000) {
      const batch = staffIds.slice(i, i + 1000)
      const { data: staffData } = await sb
        .from('pos_staff')
        .select('pos_staff_id, name')
        .in('pos_staff_id', batch)
      if (staffData) {
        for (const st of staffData) {
          staffNames.set(st.pos_staff_id, st.name)
        }
      }
    }
  }
  const staffPerformance = [...staffMap.entries()]
    .map(([staffId, d]) => ({
      staffId,
      staffName: staffNames.get(staffId) || 'Desconocido',
      cheques: d.cheques,
      revenue: Math.round(d.revenue),
      propinaTotal: Math.round(d.propinaTotal),
      ticketPromedio: d.cheques > 0 ? Math.round(d.revenue / d.cheques) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // ── Payment Methods ──
  const paymentSaleIds = allSales.map((s: any) => s.id)
  let allPayments: any[] = []
  if (paymentSaleIds.length > 0) {
    for (let i = 0; i < paymentSaleIds.length; i += 1000) {
      const batch = paymentSaleIds.slice(i, i + 1000)
      const { data: payData } = await sb
        .from('pos_sale_payments')
        .select('sale_id, payment_method_id, amount')
        .in('sale_id', batch)
      if (payData) allPayments.push(...payData)
    }
  }

  const methodIds = [...new Set(allPayments.map((p: any) => p.payment_method_id))]
  const methodNames = new Map<string, string>()
  if (methodIds.length > 0) {
    for (let i = 0; i < methodIds.length; i += 1000) {
      const batch = methodIds.slice(i, i + 1000)
      const { data: methods } = await sb
        .from('pos_payment_methods')
        .select('pos_payment_method_id, name')
        .in('pos_payment_method_id', batch)
      if (methods) {
        for (const m of methods) {
          methodNames.set(m.pos_payment_method_id, m.name)
        }
      }
    }
  }

  const paymentMap = new Map<string, { amount: number; count: number }>()
  for (const p of allPayments) {
    const mName = methodNames.get(p.payment_method_id) || 'Otro'
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
    .select('tier, total_spent, customer_id')
    .not('tier', 'is', null)

  const tierMap = new Map<string, { count: number; totalSpent: number }>()
  if (tierData) {
    for (const t of tierData) {
      const tier = t.tier
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
      const order = ['VIP', 'Oro', 'Plata', 'Bronce']
      return order.indexOf(a.tier) - order.indexOf(b.tier)
    })

  // ── Client Split (consumidor final vs identificados) ──
  let consumidorFinal = { cheques: 0, revenue: 0 }
  let identificados = { cheques: 0, revenue: 0 }
  for (const s of allSales) {
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

  // ── Category list for filters (always return all categories) ──
  const { data: allGroups } = await sb
    .from('pos_product_groups')
    .select('pos_product_group_id, name')
    .order('pos_product_group_id')
  const categoryList = (allGroups || []).map((g: any) => ({
    id: g.pos_product_group_id,
    name: g.name,
  }))

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
    },
    byZone,
    hourlyRevenue,
    dailyTrend,
    topProducts,
    topCategories,
    staffPerformance,
    paymentMethods,
    clientTiers,
    clientSplit,
    categoryList,
    filters: { zone: zoneParam, category: categoryParam, from: fromParam, to: toParam },
  })
}