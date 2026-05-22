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
// PRODUCT DETAIL
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

  // Get sale IDs and fetch related sales
  const saleIds = [...new Set(allItems.map((i: any) => i.pos_sale_id))]
  let allSales: any[] = []
  for (let i = 0; i < saleIds.length; i += BATCH) {
    const batch = saleIds.slice(i, i + BATCH)
    const { data: salesData } = await sb
      .from('pos_sales')
      .select('id, total, tip_amount, opened_at, derived_zone_name, is_cancelled')
      .in('id', batch)
      .gte('opened_at', from)
      .lte('opened_at', to)
      .eq('is_cancelled', false)
    if (salesData) allSales.push(...salesData)
  }

  const validSaleIds = new Set(allSales.map((s: any) => s.id))
  const validItems = allItems.filter((i: any) => validSaleIds.has(i.pos_sale_id))

  // Build sale lookup
  const saleMap = new Map<string, any>()
  for (const s of allSales) saleMap.set(s.id, s)

  // ── byZone ──
  const zoneMap = new Map<string, { qty: number; revenue: number; cheques: Set<string> }>()
  for (const item of validItems) {
    const sale = saleMap.get(item.pos_sale_id)
    if (!sale) continue
    const zone = sale.derived_zone_name || 'Desconocido'
    if (!zoneMap.has(zone)) zoneMap.set(zone, { qty: 0, revenue: 0, cheques: new Set() })
    const d = zoneMap.get(zone)!
    d.qty += Number(item.quantity) || 0
    d.revenue += (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
    d.cheques.add(item.pos_sale_id)
  }
  const byZone = [...zoneMap.entries()].map(([zone, d]) => ({
    zone,
    qty: d.qty,
    revenue: Math.round(d.revenue),
    cheques: d.cheques.size,
  })).sort((a, b) => b.revenue - a.revenue)

  // ── byHour ──
  const hourMap = new Map<number, { qty: number; revenue: number }>()
  for (const item of validItems) {
    const sale = saleMap.get(item.pos_sale_id)
    if (!sale?.opened_at) continue
    const hour = new Date(sale.opened_at).getHours()
    if (!hourMap.has(hour)) hourMap.set(hour, { qty: 0, revenue: 0 })
    const d = hourMap.get(hour)!
    d.qty += Number(item.quantity) || 0
    d.revenue += (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
  }
  const byHour = [...hourMap.entries()].map(([hour, d]) => ({
    hour,
    qty: d.qty,
    revenue: Math.round(d.revenue),
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
  // Get all items in the same sales that are NOT this product
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

  // Filter companions to valid (non-cancelled, in date range) sales
  companionItems = companionItems.filter((i: any) => validSaleIds.has(i.pos_sale_id))

  // Get product names for companions
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

  // ── Summary ──
  const totalRevenue = validItems.reduce(
    (s: number, i: any) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0
  )
  const totalQty = validItems.reduce((s: number, i: any) => s + (Number(i.quantity) || 0), 0)
  const totalCheques = validSaleIds.size
  const avgTicket = totalCheques > 0 ? totalRevenue / totalCheques : 0

  return NextResponse.json({
    type: 'product',
    byZone,
    byHour,
    byDay,
    companions,
    summary: {
      name: productName,
      totalRevenue: Math.round(totalRevenue),
      totalQty,
      totalCheques,
      avgTicket: Math.round(avgTicket),
    },
  })
}

// ════════════════════════════════════════════════════════════
// STAFF DETAIL
// ════════════════════════════════════════════════════════════
async function handleStaff(sb: any, staffId: string, from: string, to: string) {
  // ── Staff info ──
  const { data: staffData } = await sb
    .from('pos_staff')
    .select('pos_staff_id, name')
    .eq('pos_staff_id', staffId)
    .single()

  const staffName = staffData?.name || 'Desconocido'

  // ── Fetch sales for this staff member ──
  let allSales: any[] = []
  let offset = 0
  let hasMore = true
  while (hasMore) {
    const { data: batch, error } = await sb
      .from('pos_sales')
      .select('id, total, tip_amount, opened_at, derived_zone_name, is_cancelled')
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

  // ── byZone ──
  const zoneMap = new Map<string, { cheques: number; revenue: number; propina: number }>()
  for (const s of allSales) {
    const zone = s.derived_zone_name || 'Desconocido'
    if (!zoneMap.has(zone)) zoneMap.set(zone, { cheques: 0, revenue: 0, propina: 0 })
    const d = zoneMap.get(zone)!
    d.cheques += 1
    d.revenue += Number(s.total) || 0
    d.propina += Number(s.tip_amount) || 0
  }
  const byZone = [...zoneMap.entries()].map(([zone, d]) => ({
    zone,
    cheques: d.cheques,
    revenue: Math.round(d.revenue),
    propina: Math.round(d.propina),
  })).sort((a, b) => b.revenue - a.revenue)

  // ── byHour ──
  const hourMap = new Map<number, { cheques: number; revenue: number }>()
  for (const s of allSales) {
    if (!s.opened_at) continue
    const hour = new Date(s.opened_at).getHours()
    if (!hourMap.has(hour)) hourMap.set(hour, { cheques: 0, revenue: 0 })
    const d = hourMap.get(hour)!
    d.cheques += 1
    d.revenue += Number(s.total) || 0
  }
  const byHour = [...hourMap.entries()].map(([hour, d]) => ({
    hour,
    cheques: d.cheques,
    revenue: Math.round(d.revenue),
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
    .slice(0, 15)
    .map(p => ({ ...p, revenue: Math.round(p.revenue) }))

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

  // ── Summary ──
  const totalRevenue = allSales.reduce((s: number, r: any) => s + (Number(r.total) || 0), 0)
  const totalCheques = allSales.length
  const totalPropina = allSales.reduce((s: number, r: any) => s + (Number(r.tip_amount) || 0), 0)
  const avgTicket = totalCheques > 0 ? totalRevenue / totalCheques : 0

  return NextResponse.json({
    type: 'staff',
    byZone,
    byHour,
    topProducts,
    dailyTrend,
    summary: {
      name: staffName,
      totalRevenue: Math.round(totalRevenue),
      totalCheques,
      totalPropina: Math.round(totalPropina),
      avgTicket: Math.round(avgTicket),
    },
  })
}

// ════════════════════════════════════════════════════════════
// CATEGORY DETAIL
// ════════════════════════════════════════════════════════════
async function handleCategory(sb: any, groupId: string, from: string, to: string) {
  // ── Category info ──
  const { data: groupData } = await sb
    .from('pos_product_groups')
    .select('pos_group_id, name')
    .eq('pos_group_id', groupId)
    .single()

  const categoryName = groupData?.name || 'Desconocido'

  // ── Get product IDs in this category ──
  let catProducts: any[] = []
  let prodOffset = 0
  let prodHasMore = true
  while (prodHasMore) {
    const { data, error } = await sb
      .from('pos_products')
      .select('pos_product_id, name')
      .eq('pos_group_id', groupId)
      .range(prodOffset, prodOffset + BATCH - 1)
    if (error || !data || data.length === 0) { prodHasMore = false; break }
    catProducts.push(...data)
    prodOffset += BATCH
    prodHasMore = data.length === BATCH
  }

  const productIdsInCat = catProducts.map((p: any) => p.pos_product_id)
  const productNameMap = new Map<string, string>()
  for (const p of catProducts) productNameMap.set(p.pos_product_id, p.name)

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

  // Get sale IDs and filter by date/cancelled
  const saleIdsFromItems = [...new Set(allItems.map((i: any) => i.pos_sale_id))]
  let validSales: any[] = []
  for (let i = 0; i < saleIdsFromItems.length; i += BATCH) {
    const batch = saleIdsFromItems.slice(i, i + BATCH)
    const { data: sales } = await sb
      .from('pos_sales')
      .select('id, opened_at, derived_zone_name, is_cancelled')
      .in('id', batch)
      .gte('opened_at', from)
      .lte('opened_at', to)
      .eq('is_cancelled', false)
    if (sales) validSales.push(...sales)
  }

  const validSaleIds = new Set(validSales.map((s: any) => s.id))
  const validItems = allItems.filter((i: any) => validSaleIds.has(i.pos_sale_id))
  const saleMap = new Map<string, any>()
  for (const s of validSales) saleMap.set(s.id, s)

  // ── topProducts ──
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
  const topProducts = [...topProductMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15)
    .map(p => ({ productId: p.productId, name: p.name, qty: p.qty, revenue: Math.round(p.revenue), cheques: p.cheques.size }))

  // ── byZone ──
  const zoneMap = new Map<string, { revenue: number; cheques: Set<string> }>()
  for (const item of validItems) {
    const sale = saleMap.get(item.pos_sale_id)
    if (!sale) continue
    const zone = sale.derived_zone_name || 'Desconocido'
    if (!zoneMap.has(zone)) zoneMap.set(zone, { revenue: 0, cheques: new Set() })
    const d = zoneMap.get(zone)!
    d.revenue += (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
    d.cheques.add(item.pos_sale_id)
  }
  const byZone = [...zoneMap.entries()].map(([zone, d]) => ({
    zone,
    revenue: Math.round(d.revenue),
    cheques: d.cheques.size,
  })).sort((a, b) => b.revenue - a.revenue)

  // ── byHour ──
  const hourMap = new Map<number, { revenue: number; cheques: Set<string> }>()
  for (const item of validItems) {
    const sale = saleMap.get(item.pos_sale_id)
    if (!sale?.opened_at) continue
    const hour = new Date(sale.opened_at).getHours()
    if (!hourMap.has(hour)) hourMap.set(hour, { revenue: 0, cheques: new Set() })
    const d = hourMap.get(hour)!
    d.revenue += (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
    d.cheques.add(item.pos_sale_id)
  }
  const byHour = [...hourMap.entries()].map(([hour, d]) => ({
    hour,
    revenue: Math.round(d.revenue),
    cheques: d.cheques.size,
  })).sort((a, b) => a.hour - b.hour)

  // ── Summary ──
  const totalRevenue = validItems.reduce(
    (s: number, i: any) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0
  )
  const totalQty = validItems.reduce((s: number, i: any) => s + (Number(i.quantity) || 0), 0)
  const totalCheques = validSaleIds.size

  return NextResponse.json({
    type: 'category',
    topProducts,
    byZone,
    byHour,
    summary: {
      name: categoryName,
      totalRevenue: Math.round(totalRevenue),
      totalQty,
      totalCheques,
    },
  })
}

// ════════════════════════════════════════════════════════════
// HOUR DETAIL
// ════════════════════════════════════════════════════════════
async function handleHour(sb: any, hourStr: string, from: string, to: string) {
  const hour = parseInt(hourStr, 10)
  if (isNaN(hour) || hour < 0 || hour > 23) {
    return NextResponse.json({ error: 'Hora inválida. Debe ser 0-23' }, { status: 400 })
  }

  // ── Fetch all sales in the date range, then filter by hour client-side ──
  // (Supabase PostgREST doesn't support EXTRACT in filters)
  let allSales: any[] = []
  let offset = 0
  let hasMore = true
  while (hasMore) {
    const { data: batch, error } = await sb
      .from('pos_sales')
      .select('id, total, tip_amount, opened_at, derived_zone_name, pos_staff_id, is_cancelled')
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

  // ── Summary ──
  const totalRevenue = hourSales.reduce((s: number, r: any) => s + (Number(r.total) || 0), 0)
  const totalCheques = hourSales.length

  return NextResponse.json({
    type: 'hour',
    topProducts,
    topStaff,
    byZone,
    summary: {
      hour,
      totalRevenue: Math.round(totalRevenue),
      totalCheques,
    },
  })
}

// ════════════════════════════════════════════════════════════
// ZONE DETAIL
// ════════════════════════════════════════════════════════════
async function handleZone(sb: any, zoneName: string, from: string, to: string) {
  // ── Fetch sales for this zone ──
  let allSales: any[] = []
  let offset = 0
  let hasMore = true
  while (hasMore) {
    const { data: batch, error } = await sb
      .from('pos_sales')
      .select('id, total, tip_amount, opened_at, derived_zone_name, pos_staff_id, is_cancelled')
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
    .slice(0, 15)
    .map(p => ({ ...p, revenue: Math.round(p.revenue) }))

  // ── byHour ──
  const hourMap = new Map<number, { revenue: number }>()
  for (const s of allSales) {
    if (!s.opened_at) continue
    const hour = new Date(s.opened_at).getHours()
    if (!hourMap.has(hour)) hourMap.set(hour, { revenue: 0 })
    const d = hourMap.get(hour)!
    d.revenue += Number(s.total) || 0
  }
  const byHour = [...hourMap.entries()].map(([hour, d]) => ({
    hour,
    revenue: Math.round(d.revenue),
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
  const dayMap = new Map<string, { revenue: number }>()
  for (const s of allSales) {
    if (!s.opened_at) continue
    const date = s.opened_at.slice(0, 10)
    if (!dayMap.has(date)) dayMap.set(date, { revenue: 0 })
    const d = dayMap.get(date)!
    d.revenue += Number(s.total) || 0
  }
  const dailyTrend = [...dayMap.entries()].map(([date, d]) => ({
    date,
    revenue: Math.round(d.revenue),
  })).sort((a, b) => a.date.localeCompare(b.date))

  // ── Summary ──
  const totalRevenue = allSales.reduce((s: number, r: any) => s + (Number(r.total) || 0), 0)
  const totalCheques = allSales.length
  const totalPropina = allSales.reduce((s: number, r: any) => s + (Number(r.tip_amount) || 0), 0)

  return NextResponse.json({
    type: 'zone',
    topProducts,
    byHour,
    topStaff,
    dailyTrend,
    summary: {
      zone: zoneName,
      totalRevenue: Math.round(totalRevenue),
      totalCheques,
      totalPropina: Math.round(totalPropina),
    },
  })
}