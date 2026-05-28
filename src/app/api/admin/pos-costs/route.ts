import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

function qparam(request: NextRequest, key: string): string | null {
  return request.nextUrl.searchParams.get(key)
}

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const BATCH = 200

  const fromParam = qparam(request, 'from') || ''
  const toParam = qparam(request, 'to') || ''

  // ── Auto-detect date range: default to last 3 months ──
  let from = fromParam
  let to = toParam

  // ── Available months from purchases ──
  const { data: monthData } = await sb
    .from('pos_purchases')
    .select('applied_date')
    .not('applied_date', 'is', null)
    .order('applied_date', { ascending: true })
    .limit(5000)

  const availableMonths: string[] = []
  if (monthData && monthData.length > 0) {
    const seen = new Set<string>()
    for (const row of monthData) {
      const d = new Date(row.applied_date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!seen.has(key)) {
        seen.add(key)
        availableMonths.push(key)
      }
    }
  }

  if (!from || !to) {
    const now = new Date()
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    from = from || `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    to = to || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`
  }

  // ── 1. Fetch ALL purchases (paginated) ──
  let allPurchases: any[] = []
  let offset = 0
  let hasMore = true
  while (hasMore) {
    const { data: batch, error } = await sb
      .from('pos_purchases')
      .select('pos_purchase_id, pos_supplier_id, applied_date, total, subtotal, is_cancelled, discount, tax1')
      .gte('applied_date', `${from}T00:00:00`)
      .lte('applied_date', `${to}T23:59:59`)
      .order('applied_date', { ascending: true })
      .range(offset, offset + BATCH - 1)

    if (error) {
      return NextResponse.json({ error: 'Error cargando compras: ' + error.message }, { status: 500 })
    }
    if (batch && batch.length > 0) {
      allPurchases.push(...batch)
      offset += BATCH
      hasMore = batch.length === BATCH
    } else {
      hasMore = false
    }
  }

  // ── 2. Filter out cancelled ──
  const activePurchases = allPurchases.filter(p => !p.is_cancelled)
  const cancelledCount = allPurchases.filter(p => p.is_cancelled).length
  const totalPurchases = activePurchases.reduce((sum, p) => sum + (p.total || 0), 0)

  // ── 3. Daily purchases ──
  const dailyMap = new Map<string, { total: number; count: number }>()
  for (const p of activePurchases) {
    if (!p.applied_date) continue
    const day = p.applied_date.slice(0, 10) // YYYY-MM-DD
    const entry = dailyMap.get(day) || { total: 0, count: 0 }
    entry.total += p.total || 0
    entry.count += 1
    dailyMap.set(day, entry)
  }
  const dailyPurchases = Array.from(dailyMap.entries())
    .map(([date, v]) => ({ date, total: v.total, count: v.count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // ── 4. Monthly purchases ──
  const monthlyMap = new Map<string, { total: number; count: number }>()
  for (const p of activePurchases) {
    if (!p.applied_date) continue
    const month = p.applied_date.slice(0, 7) // YYYY-MM
    const entry = monthlyMap.get(month) || { total: 0, count: 0 }
    entry.total += p.total || 0
    entry.count += 1
    monthlyMap.set(month, entry)
  }
  const monthlyPurchases = Array.from(monthlyMap.entries())
    .map(([month, v]) => ({ month, total: v.total, count: v.count }))
    .sort((a, b) => a.month.localeCompare(b.month))

  const avgMonthlyPurchases = monthlyPurchases.length > 0
    ? totalPurchases / monthlyPurchases.length
    : 0

  // ── 5. Purchases by supplier ──
  const supplierMap = new Map<string, { total: number; count: number }>()
  for (const p of activePurchases) {
    const sid = p.pos_supplier_id
    if (!sid) continue
    const entry = supplierMap.get(sid) || { total: 0, count: 0 }
    entry.total += p.total || 0
    entry.count += 1
    supplierMap.set(sid, entry)
  }

  // Fetch supplier names
  const supplierIds = Array.from(supplierMap.keys())
  const supplierNameMap = new Map<string, string>()
  for (let i = 0; i < supplierIds.length; i += BATCH) {
    const idsBatch = supplierIds.slice(i, i + BATCH)
    const { data: suppliers } = await sb
      .from('pos_suppliers')
      .select('pos_supplier_id, name')
      .in('pos_supplier_id', idsBatch)
    if (suppliers) {
      for (const s of suppliers) {
        supplierNameMap.set(s.pos_supplier_id, s.name)
      }
    }
  }

  const purchasesBySupplier = Array.from(supplierMap.entries())
    .map(([id, v]) => ({
      supplierId: id,
      supplierName: supplierNameMap.get(id) || 'Desconocido',
      total: v.total,
      count: v.count,
      pct: totalPurchases > 0 ? (v.total / totalPurchases) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 20)

  const topSupplier = purchasesBySupplier.length > 0 ? purchasesBySupplier[0].supplierName : ''

  // ── 6. Purchase items by ingredient category ──
  // Get all active purchase IDs
  const activePurchaseIds = activePurchases.map(p => p.pos_purchase_id)

  // Fetch purchase items in batches
  let allPurchaseItems: any[] = []
  for (let i = 0; i < activePurchaseIds.length; i += BATCH) {
    const idsBatch = activePurchaseIds.slice(i, i + BATCH)
    const { data: items } = await sb
      .from('pos_purchase_items')
      .select('pos_purchase_id, pos_ingredient_id, quantity, cost, amount_with_tax')
      .in('pos_purchase_id', idsBatch)
    if (items) allPurchaseItems.push(...items)
  }

  // Fetch ingredients with categories
  const ingredientIds = [...new Set(allPurchaseItems.map(it => it.pos_ingredient_id))].filter(Boolean)
  const ingredientMap = new Map<string, { name: string; categoryId: string }>()
  for (let i = 0; i < ingredientIds.length; i += BATCH) {
    const idsBatch = ingredientIds.slice(i, i + BATCH)
    const { data: ingredients } = await sb
      .from('pos_ingredients')
      .select('pos_ingredient_id, name, pos_category_id')
      .in('pos_ingredient_id', idsBatch)
    if (ingredients) {
      for (const ing of ingredients) {
        ingredientMap.set(ing.pos_ingredient_id, { name: ing.name, categoryId: ing.pos_category_id })
      }
    }
  }

  // Fetch all ingredient categories
  const { data: categories } = await sb
    .from('pos_ingredient_categories')
    .select('pos_category_id, name')
  const categoryNameMap = new Map<string, string>()
  if (categories) {
    for (const c of categories) {
      categoryNameMap.set(c.pos_category_id, c.name)
    }
  }

  // Aggregate purchase items by category
  const categoryCostMap = new Map<string, { total: number; count: number }>()
  for (const item of allPurchaseItems) {
    const ing = ingredientMap.get(item.pos_ingredient_id)
    if (!ing) continue
    // Exclude "NO USAR" category
    if (ing.categoryId === '021') continue
    const catId = ing.categoryId || 'unknown'
    const entry = categoryCostMap.get(catId) || { total: 0, count: 0 }
    entry.total += item.amount_with_tax || 0
    entry.count += 1
    categoryCostMap.set(catId, entry)
  }

  const costByCategory = Array.from(categoryCostMap.entries())
    .map(([id, v]) => ({
      categoryId: id,
      categoryName: categoryNameMap.get(id) || 'Otro',
      total: v.total,
      count: v.count,
      pct: 0,
    }))
    .sort((a, b) => b.total - a.total)

  const totalCategoryCost = costByCategory.reduce((s, c) => s + c.total, 0)
  for (const c of costByCategory) {
    c.pct = totalCategoryCost > 0 ? (c.total / totalCategoryCost) * 100 : 0
  }

  // ── 7. Product margins ──
  // Fetch all product prices
  let allPrices: any[] = []
  let priceOffset = 0
  let priceHasMore = true
  while (priceHasMore) {
    const { data: batch } = await sb
      .from('pos_product_prices')
      .select('pos_product_id, price, price_before_tax, tax1')
      .range(priceOffset, priceOffset + BATCH - 1)
    if (batch && batch.length > 0) {
      allPrices.push(...batch)
      priceOffset += BATCH
      priceHasMore = batch.length === BATCH
    } else {
      priceHasMore = false
    }
  }

  // Fetch all product recipes
  let allRecipes: any[] = []
  let recipeOffset = 0
  let recipeHasMore = true
  while (recipeHasMore) {
    const { data: batch } = await sb
      .from('pos_product_recipes')
      .select('pos_product_id, pos_ingredient_id, quantity')
      .range(recipeOffset, recipeOffset + BATCH - 1)
    if (batch && batch.length > 0) {
      allRecipes.push(...batch)
      recipeOffset += BATCH
      recipeHasMore = batch.length === BATCH
    } else {
      recipeHasMore = false
    }
  }

  // Fetch all ingredient costs
  let allIngredientCosts: any[] = []
  let costOffset = 0
  let costHasMore = true
  while (costHasMore) {
    const { data: batch } = await sb
      .from('pos_ingredient_costs')
      .select('pos_ingredient_id, cost, avg_cost, cost_with_tax, waste')
      .range(costOffset, costOffset + BATCH - 1)
    if (batch && batch.length > 0) {
      allIngredientCosts.push(...batch)
      costOffset += BATCH
      costHasMore = batch.length === BATCH
    } else {
      costHasMore = false
    }
  }

  // Build ingredient cost lookup
  const ingredientCostMap = new Map<string, number>()
  for (const ic of allIngredientCosts) {
    ingredientCostMap.set(ic.pos_ingredient_id, ic.avg_cost || ic.cost || 0)
  }

  // Build recipe cost per product
  const recipeByProduct = new Map<string, { ingredients: Array<{ id: string; qty: number; cost: number }>; totalCost: number }>()
  for (const r of allRecipes) {
    const pid = (r.pos_product_id || '').trim()
    const costPerUnit = ingredientCostMap.get(r.pos_ingredient_id) || 0
    if (!recipeByProduct.has(pid)) {
      recipeByProduct.set(pid, { ingredients: [], totalCost: 0 })
    }
    const entry = recipeByProduct.get(pid)!
    entry.ingredients.push({ id: r.pos_ingredient_id, qty: r.quantity, cost: costPerUnit })
    entry.totalCost += r.quantity * costPerUnit
  }

  // Build price lookup (use first price per product)
  const priceMap = new Map<string, number>()
  for (const p of allPrices) {
    const pid = (p.pos_product_id || '').trim()
    if (!priceMap.has(pid) && p.price > 0) {
      priceMap.set(pid, p.price)
    }
  }

  // Fetch product names and categories
  let allProducts: any[] = []
  let prodOffset = 0
  let prodHasMore = true
  while (prodHasMore) {
    const { data: batch } = await sb
      .from('pos_products')
      .select('pos_product_id, name, pos_group_id')
      .range(prodOffset, prodOffset + BATCH - 1)
    if (batch && batch.length > 0) {
      allProducts.push(...batch)
      prodOffset += BATCH
      prodHasMore = batch.length === BATCH
    } else {
      prodHasMore = false
    }
  }

  // Fetch product groups (categories)
  const { data: groups } = await sb
    .from('pos_product_groups')
    .select('pos_group_id, name')
  const groupNameMap = new Map<string, string>()
  if (groups) {
    for (const g of groups) {
      groupNameMap.set(g.pos_group_id, g.name)
    }
  }

  // Compute product margins
  const productMargins: Array<{
    productId: string
    productName: string
    categoryId: string
    categoryName: string
    salePrice: number
    recipeCost: number
    margin: number
    marginPct: number
  }> = []

  for (const prod of allProducts) {
    const pid = (prod.pos_product_id || '').trim()
    const salePrice = priceMap.get(pid)
    const recipe = recipeByProduct.get(pid)

    if (!salePrice || !recipe) continue
    if (recipe.totalCost === 0) continue

    const margin = salePrice - recipe.totalCost
    const marginPct = salePrice > 0 ? (margin / salePrice) * 100 : 0

    // Filter out garbage margins
    if (marginPct < -100 || marginPct > 300) continue

    productMargins.push({
      productId: pid,
      productName: prod.name || 'Sin nombre',
      categoryId: prod.pos_group_id || '',
      categoryName: groupNameMap.get(prod.pos_group_id) || 'Sin categoría',
      salePrice,
      recipeCost: Math.round(recipe.totalCost),
      margin: Math.round(margin),
      marginPct: Math.round(marginPct * 10) / 10,
    })
  }

  // Sort by marginPct ascending (worst margins first)
  productMargins.sort((a, b) => a.marginPct - b.marginPct)

  // ── Category list for filters ──
  const categoryList = categories
    ? categories
        .filter(c => c.pos_category_id !== '021')
        .map(c => ({ id: c.pos_category_id, name: c.name }))
    : []

  // ── Response ──
  return NextResponse.json({
    summary: {
      totalPurchases,
      avgMonthlyPurchases: Math.round(avgMonthlyPurchases),
      purchaseCount: activePurchases.length,
      cancelledCount,
      avgMarginPct: productMargins.length > 0
        ? Math.round((productMargins.reduce((s, p) => s + p.marginPct, 0) / productMargins.length) * 10) / 10
        : 0,
      productsWithRecipe: productMargins.length,
      productsTotal: allProducts.length,
      topSupplier,
    },
    dailyPurchases,
    monthlyPurchases,
    costByCategory,
    purchasesBySupplier,
    productMargins,
    categoryList,
    availableMonths,
    filters: { from, to },
  })
}