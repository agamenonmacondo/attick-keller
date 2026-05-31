import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

const BATCH = 200

export async function GET(request: NextRequest) {
  const adminUser = await getAdminUser(request)
  if (!adminUser) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  try {
    const sb = getServiceClient()

    // Helper: paginated fetch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function fetchAll(table: string, select: string, filters?: Record<string, string>): Promise<any[]> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const all: any[] = []
      let offset = 0
      let hasMore = true
      while (hasMore) {
        let query = sb.from(table).select(select).range(offset, offset + BATCH - 1)
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            query = query.eq(key, value)
          }
        }
        const { data, error } = await query
        if (error) throw error
        if (data) all.push(...data)
        hasMore = !!(data && data.length === BATCH)
        offset += BATCH
      }
      return all
    }

    // Fetch all data in parallel
    const [products, prices, recipes, ingredients, ingredientCosts, groups, ingCategories] = await Promise.all([
      fetchAll('pos_products', 'pos_product_id,name,pos_group_id'),
      fetchAll('pos_product_prices', 'pos_product_id,price,price_before_tax,tax1'),
      fetchAll('pos_product_recipes', 'pos_product_id,pos_ingredient_id,quantity'),
      fetchAll('pos_ingredients', 'pos_ingredient_id,name,unit,pos_category_id,is_composite'),
      fetchAll('pos_ingredient_costs', 'pos_ingredient_id,cost,avg_cost'),
      fetchAll('pos_product_groups', 'pos_group_id,name'),
      fetchAll('pos_ingredient_categories', 'pos_category_id,name'),
    ])

    // Build lookup maps
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const priceMap = new Map(prices.map((p: any) => [p.pos_product_id as string, p]))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groupsMap = new Map(groups.map((g: any) => [g.pos_group_id as string, g.name as string]))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ingMap = new Map(ingredients.map((i: any) => [i.pos_ingredient_id as string, i]))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const costMap = new Map(ingredientCosts.map((c: any) => [c.pos_ingredient_id as string, c]))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ingCatMap = new Map(ingCategories.map((c: any) => [c.pos_category_id as string, c.name as string]))

    // Group recipes by product
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recipesByProduct = new Map<string, any[]>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of recipes as any[]) {
      const pid = r.pos_product_id as string
      if (!recipesByProduct.has(pid)) recipesByProduct.set(pid, [])
      recipesByProduct.get(pid)!.push(r)
    }

    // Build product list
    const productItems: Array<{
      productId: string
      productName: string
      categoryId: string
      categoryName: string
      salePrice: number
      priceBeforeTax: number
      recipeCost: number
      margin: number
      marginPct: number | null
      ingredientCount: number
      hasRecipe: boolean
      ingredients: Array<{
        ingredientId: string
        ingredientName: string
        categoryName: string
        quantity: number
        unit: string
        unitCost: number
        totalCost: number
      }>
    }> = []
    let totalWithRecipe = 0
    let marginSum = 0
    let marginCount = 0

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const product of products as any[]) {
      const pid = product.pos_product_id as string
      const name = product.name as string
      const groupId = product.pos_group_id as string

      const price = priceMap.get(pid) as Record<string, unknown> | undefined
      if (!price || !price.price || (price.price as number) <= 0) continue

      const salePrice = price.price as number
      const priceBeforeTax = (price.price_before_tax as number) || 0
      const categoryName = groupsMap.get(groupId) || groupId

      const recipeItems = recipesByProduct.get(pid) || []
      const hasRecipe = recipeItems.length > 0

      let recipeCost = 0
      const ingredientDetails = []

      for (const item of recipeItems) {
        const iid = item.pos_ingredient_id as string
        const quantity = (item.quantity as number) || 0
        const ing = ingMap.get(iid) as Record<string, unknown> | undefined
        const costData = costMap.get(iid) as Record<string, unknown> | undefined

        const ingName = ing?.name as string || iid
        const unit = ing?.unit as string || '?'
        const unitCost = (costData?.cost as number) || 0
        const totalCost = quantity * unitCost
        recipeCost += totalCost

        const ingCatId = ing?.pos_category_id as string || ''
        const ingCatName = ingCatMap.get(ingCatId) || ingCatId

        ingredientDetails.push({
          ingredientId: iid,
          ingredientName: ingName,
          categoryName: ingCatName,
          quantity,
          unit,
          unitCost,
          totalCost,
        })
      }

      const margin = hasRecipe ? salePrice - recipeCost : salePrice
      const marginPct = hasRecipe && salePrice > 0 ? (margin / salePrice) * 100 : null

      // Filter outliers
      if (marginPct !== null && (marginPct < -100 || marginPct > 300)) continue

      if (hasRecipe) {
        totalWithRecipe++
        if (marginPct !== null) {
          marginSum += marginPct
          marginCount++
        }
      }

      productItems.push({
        productId: pid,
        productName: name,
        categoryId: groupId,
        categoryName,
        salePrice,
        priceBeforeTax,
        recipeCost: hasRecipe ? recipeCost : 0,
        margin: hasRecipe ? margin : salePrice,
        marginPct,
        ingredientCount: recipeItems.length,
        hasRecipe,
        ingredients: ingredientDetails,
      })
    }

    // Sort by marginPct ascending (worst margins first)
    productItems.sort((a, b) => {
      if (a.marginPct === null && b.marginPct === null) return 0
      if (a.marginPct === null) return 1
      if (b.marginPct === null) return -1
      return a.marginPct - b.marginPct
    })

    const categories = groups
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((g: any) => productItems.some((p) => p.categoryId === g.pos_group_id))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((g: any) => ({ id: g.pos_group_id as string, name: g.name as string }))
      .sort((a, b) => a.id.localeCompare(b.id))

    return NextResponse.json({
      products: productItems,
      categories,
      summary: {
        totalProducts: products.length,
        productsWithRecipe: totalWithRecipe,
        avgMarginPct: marginCount > 0 ? Math.round((marginSum / marginCount) * 10) / 10 : 0,
        productCount: productItems.length,
      },
    })
  } catch (err) {
    console.error('Error fetching product costs:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}