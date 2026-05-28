import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

// ── Helpers ──────────────────────────────────────────────
function qparam(request: NextRequest, key: string): string | null {
  return request.nextUrl.searchParams.get(key)
}

// ── Main handler ─────────────────────────────────────────
export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const BATCH = 200

  // ── Parse filters ──
  const fromParam = qparam(request, 'from') || ''
  const toParam = qparam(request, 'to') || ''
  const groupParam = qparam(request, 'group') || 'all'

  let from = fromParam
  let to = toParam

  // ── Default date range: last 3 months ──
  if (!from || !to) {
    const now = new Date()
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    from = from || `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    to = to || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`
  }

  // ── 1. Fetch purchases (main cost data source) ──
  let allPurchases: any[] = []
  let purchaseOffset = 0
  let purchaseHasMore = true
  while (purchaseHasMore) {
    const { data: batch, error } = await sb
      .from('pos_purchases')
      .select('pos_purchase_id, pos_supplier_id, applied_date, total, subtotal, is_cancelled, discount, tax1')
      .gte('applied_date', from)
      .lte('applied_date', to)
      .eq('is_cancelled', false)
      .range(purchaseOffset, purchaseOffset + BATCH - 1)
      .order('applied_date', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Error cargando compras: ' + error.message }, { status: 500 })
    }
    if (batch && batch.length > 0) {
      allPurchases.push(...batch)
      purchaseOffset += BATCH
      purchaseHasMore = batch.length === BATCH
    } else {
      purchaseHasMore = false
    }
  }

  // ── 2. Fetch purchase items (for category-level cost breakdown) ──
  const purchaseIds = allPurchases.map((p: any) => p.pos_purchase_id)
  let allPurchaseItems: any[] = []
  if (purchaseIds.length > 0) {
    for (let i = 0; i < purchaseIds.length; i += BATCH) {
      const idBatch = purchaseIds.slice(i, i + BATCH)
      let itemOffset = 0
      let itemsHasMore = true
      while (itemsHasMore) {
        const { data: itemsData } = await sb
          .from('pos_purchase_items')
          .select('pos_purchase_id, pos_ingredient_id, quantity, unit_cost, total')
          .in('pos_purchase_id', idBatch)
          .range(itemOffset, itemOffset + BATCH - 1)
        if (itemsData && itemsData.length > 0) {
          allPurchaseItems.push(...itemsData)
          itemOffset += BATCH
          itemsHasMore = itemsData.length === BATCH
        } else {
          itemsHasMore = false
        }
      }
    }
  }

  // ── 3. Fetch ingredient costs and categories ──
  const { data: ingredientCosts } = await sb
    .from('pos_ingredient_costs')
    .select('pos_ingredient_id, cost, avg_cost, cost_with_tax, waste')

  const ingredientCostMap = new Map<string, { cost: number; avg_cost: number; cost_with_tax: number; waste: number }>()
  if (ingredientCosts) {
    for (const ic of ingredientCosts) {
      ingredientCostMap.set(ic.pos_ingredient_id, {
        cost: Number(ic.cost) || 0,
        avg_cost: Number(ic.avg_cost) || 0,
        cost_with_tax: Number(ic.cost_with_tax) || 0,
        waste: Number(ic.waste) || 0,
      })
    }
  }

  const { data: ingredients } = await sb
    .from('pos_ingredients')
    .select('pos_ingredient_id, name, pos_category_id, is_composite, yield')

  const ingredientMap = new Map<string, { name: string; pos_category_id: string; is_composite: boolean; yield: number }>()
  if (ingredients) {
    for (const ing of ingredients) {
      ingredientMap.set(ing.pos_ingredient_id, {
        name: ing.name,
        pos_category_id: ing.pos_category_id || '',
        is_composite: ing.is_composite || false,
        yield: Number(ing.yield) || 100,
      })
    }
  }

  const { data: ingredientCategories } = await sb
    .from('pos_ingredient_categories')
    .select('pos_category_id, name')

  const categoryNames = new Map<string, string>()
  if (ingredientCategories) {
    for (const cat of ingredientCategories) {
      categoryNames.set(cat.pos_category_id, cat.name)
    }
  }

  // ── 4. Fetch product recipes and prices for margin analysis ──
  const { data: recipes } = await sb
    .from('pos_product_recipes')
    .select('pos_product_id, pos_ingredient_id, quantity')

  const recipeMap = new Map<string, Array<{ ingredientId: string; quantity: number }>>()
  if (recipes) {
    for (const r of recipes) {
      if (!recipeMap.has(r.pos_product_id)) recipeMap.set(r.pos_product_id, [])
      recipeMap.get(r.pos_product_id)!.push({
        ingredientId: r.pos_ingredient_id,
        quantity: Number(r.quantity) || 0,
      })
    }
  }

  const { data: productPrices } = await sb
    .from('pos_product_prices')
    .select('pos_product_id, price, price_before_tax')
    .eq('is_blocked', false)

  const priceMap = new Map<string, { price: number; priceBeforeTax: number }>()
  if (productPrices) {
    for (const pp of productPrices) {
      if (!priceMap.has(pp.pos_product_id)) {
        priceMap.set(pp.pos_product_id, {
          price: Number(pp.price) || 0,
          priceBeforeTax: Number(pp.price_before_tax) || 0,
        })
      }
    }
  }

  const { data: products } = await sb
    .from('pos_products')
    .select('pos_product_id, name, pos_group_id')

  const productMap = new Map<string, { name: string; groupId: string }>()
  if (products) {
    for (const p of products) {
      const pid = (p.pos_product_id || '').trim()
      productMap.set(pid, { name: p.name, groupId: p.pos_group_id || '' })
    }
  }

  const { data: productGroups } = await sb
    .from('pos_product_groups')
    .select('pos_group_id, name')

  const groupNames = new Map<string, string>()
  if (productGroups) {
    for (const g of productGroups) {
      groupNames.set(g.pos_group_id, g.name)
    }
  }

  // ── 5. Fetch suppliers ──
  const { data: suppliers } = await sb
    .from('pos_suppliers')
    .select('pos_supplier_id, name')

  const supplierNames = new Map<string, string>()
  if (suppliers) {
    for (const s of suppliers) {
      supplierNames.set(s.pos_supplier_id, s.name)
    }
  }

  // ════════════════════════════════════════════════════════
  // COMPUTATIONS
  // ════════════════════════════════════════════════════════

  // ── Total purchase cost (COGS proxy) ──
  const totalPurchases = allPurchases.reduce((s: number, p: any) => s + (Number(p.total) || 0), 0)

  // ── Daily purchase trend ──
  const dailyMap = new Map<string, { total: number; count: number }>()
  for (const p of allPurchases) {
    const date = String(p.applied_date).slice(0, 10)
    if (!dailyMap.has(date)) dailyMap.set(date, { total: 0, count: 0 })
    const d = dailyMap.get(date)!
    d.total += Number(p.total) || 0
    d.count += 1
  }
  const dailyCOGS = [...dailyMap.entries()]
    .map(([date, d]) => ({ date, total: Math.round(d.total), count: d.count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // ── Monthly purchase trend ──
  const monthlyMap = new Map<string, { total: number; count: number }>()
  for (const p of allPurchases) {
    const month = String(p.applied_date).slice(0, 7) // YYYY-MM
    if (!monthlyMap.has(month)) monthlyMap.set(month, { total: 0, count: 0 })
    const d = monthlyMap.get(month)!
    d.total += Number(p.total) || 0
    d.count += 1
  }
  const monthlyCOGS = [...monthlyMap.entries()]
    .map(([month, d]) => ({ month, total: Math.round(d.total), count: d.count }))
    .sort((a, b) => a.month.localeCompare(b.month))

  // ── Cost by ingredient category ──
  const categoryCostMap = new Map<string, { categoryName: string; totalCost: number; ingredientCount: number }>()
  for (const item of allPurchaseItems) {
    const ingredient = ingredientMap.get(item.pos_ingredient_id)
    if (!ingredient) continue
    const catId = ingredient.pos_category_id || 'sin-categoria'
    const catName = categoryNames.get(catId) || 'Sin categoria'
    if (!categoryCostMap.has(catId)) {
      categoryCostMap.set(catId, { categoryName: catName, totalCost: 0, ingredientCount: 0 })
    }
    const d = categoryCostMap.get(catId)!
    d.totalCost += Number(item.total) || 0
    d.ingredientCount += 1
  }
  const costByCategory = [...categoryCostMap.entries()]
    .map(([categoryId, d]) => ({
      categoryId,
      categoryName: d.categoryName,
      totalCost: Math.round(d.totalCost),
      ingredientCount: d.ingredientCount,
    }))
    .sort((a, b) => b.totalCost - a.totalCost)

  // ── Product margin analysis ──
  // Group filter
  let filteredProductIds: Set<string> | null = null
  if (groupParam !== 'all') {
    filteredProductIds = new Set<string>()
    if (products) {
      for (const p of products) {
        if (p.pos_group_id === groupParam) {
          filteredProductIds.add((p.pos_product_id || '').trim())
        }
      }
    }
  }

  const productMargins: Array<{
    productId: string
    productName: string
    groupName: string
    salePrice: number
    recipeCost: number
    margin: number
    marginPct: number
  }> = []

  for (const [productId, recipeItems] of recipeMap.entries()) {
    if (filteredProductIds && !filteredProductIds.has(productId.trim())) continue

    const productInfo = productMap.get(productId.trim())
    if (!productInfo) continue

    // Calculate recipe cost
    let recipeCost = 0
    for (const ri of recipeItems) {
      const ic = ingredientCostMap.get(ri.ingredientId)
      if (ic) {
        // Use cost_with_tax if available, fallback to avg_cost, then cost
        const unitCost = ic.cost_with_tax > 0 ? ic.cost_with_tax : (ic.avg_cost > 0 ? ic.avg_cost : ic.cost)
        recipeCost += unitCost * ri.quantity
      }
    }

    // Get sale price
    const priceInfo = priceMap.get(productId.trim())
    if (!priceInfo || priceInfo.price === 0) continue

    const salePrice = priceInfo.price
    const margin = salePrice - recipeCost
    const marginPct = salePrice > 0 ? (margin / salePrice) * 100 : 0

    productMargins.push({
      productId,
      productName: productInfo.name,
      groupName: groupNames.get(productInfo.groupId) || 'Sin categoria',
      salePrice: Math.round(salePrice),
      recipeCost: Math.round(recipeCost * 100) / 100,
      margin: Math.round(margin * 100) / 100,
      marginPct: Math.round(marginPct * 10) / 10,
    })
  }

  // ── Top 10 lowest margin products (red flags) ──
  const topLowMarginProducts = [...productMargins]
    .filter(p => p.salePrice > 0)
    .sort((a, b) => a.marginPct - b.marginPct)
    .slice(0, 10)

  // ── Top 10 highest margin products ──
  const topHighMarginProducts = [...productMargins]
    .filter(p => p.salePrice > 0)
    .sort((a, b) => b.marginPct - a.marginPct)
    .slice(0, 10)

  // ── Purchases by supplier ──
  const supplierCostMap = new Map<string, { supplierName: string; total: number; count: number }>()
  for (const p of allPurchases) {
    const sid = p.pos_supplier_id
    if (!sid) continue
    const sName = supplierNames.get(sid) || 'Desconocido'
    if (!supplierCostMap.has(sid)) {
      supplierCostMap.set(sid, { supplierName: sName, total: 0, count: 0 })
    }
    const d = supplierCostMap.get(sid)!
    d.total += Number(p.total) || 0
    d.count += 1
  }
  const purchasesBySupplier = [...supplierCostMap.entries()]
    .map(([supplierId, d]) => ({
      supplierId,
      supplierName: d.supplierName,
      total: Math.round(d.total),
      count: d.count,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 15)

  // ── Summary KPIs ──
  // Use revenue from sales if available, otherwise estimate from purchases
  // Since we don't have full sales data for the date range (pos_sale_items has April only),
  // use totalPurchases as COGS
  const totalCOGS = totalPurchases
  // Estimate revenue = COGS / typical food cost ratio (~30%)
  // We don't include revenue from sales here since purchase data is our primary source
  const grossMargin = 0 // Can't calculate without matching revenue
  const grossMarginPct = 0

  return NextResponse.json({
    summary: {
      totalCOGS: Math.round(totalCOGS),
      totalPurchases: Math.round(totalPurchases),
      grossMargin,
      grossMarginPct,
      purchaseCount: allPurchases.length,
    },
    dailyCOGS,
    monthlyCOGS,
    costByCategory,
    topLowMarginProducts,
    topHighMarginProducts,
    purchasesBySupplier,
  })
}