import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const { searchParams } = new URL(request.url)

  const search = searchParams.get('search')?.trim() || ''
  const category = searchParams.get('category')?.trim() || ''
  const includeBar = searchParams.get('include_bar') === 'true'
  const includeWine = searchParams.get('include_wine') === 'true'
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 2000)

  // Step 1: Fetch "NO USAR" category IDs to exclude
  const { data: noUsarCategories } = await sb
    .from('pos_ingredient_categories')
    .select('pos_category_id')
    .ilike('name', 'NO USAR')

  const noUsarIds = (noUsarCategories || []).map((c: { pos_category_id: string }) => c.pos_category_id)

  // Step 2: Build filter for excluded classifications (bar=2, vino=3)
  const excludedClassifications: number[] = []
  if (!includeBar) excludedClassifications.push(2)
  if (!includeWine) excludedClassifications.push(3)

  // Fetch category IDs for excluded classifications
  let excludedCategoryIds: string[] = []
  if (excludedClassifications.length > 0) {
    const { data: excludedCats } = await sb
      .from('pos_ingredient_categories')
      .select('pos_category_id')
      .in('classification', excludedClassifications)

    excludedCategoryIds = (excludedCats || []).map((c: { pos_category_id: string }) => c.pos_category_id)
  }

  const allExcludedIds = [...new Set([...noUsarIds, ...excludedCategoryIds])]

  // Step 3: Query pos_ingredients with filters
  let query = sb
    .from('pos_ingredients')
    .select(`
      pos_ingredient_id,
      name,
      unit,
      is_composite,
      pos_category_id,
      pos_ingredient_categories (
        pos_category_id,
        name,
        classification
      ),
      pos_ingredient_costs (
        pos_ingredient_id,
        avg_cost,
        cost,
        cost_with_tax
      )
    `)
    .order('name', { ascending: true })
    .limit(limit)

  if (allExcludedIds.length > 0) {
    query = query.not('pos_category_id', 'in', `(${allExcludedIds.map(id => `"${id}"`).join(',')})`)
  }

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  if (category) {
    query = query.eq('pos_category_id', category)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Flatten the joined data
  const ingredients = (data || []).map((item: Record<string, unknown>) => {
    const cat = Array.isArray(item.pos_ingredient_categories)
      ? item.pos_ingredient_categories[0]
      : item.pos_ingredient_categories as Record<string, unknown> | null
    const cost = Array.isArray(item.pos_ingredient_costs)
      ? item.pos_ingredient_costs[0]
      : item.pos_ingredient_costs as Record<string, unknown> | null

    return {
      pos_ingredient_id: item.pos_ingredient_id,
      name: item.name,
      unit: item.unit,
      is_composite: item.is_composite,
      category_name: cat?.name ?? null,
      classification: cat?.classification ?? null,
      avg_cost: cost?.avg_cost ?? null,
      cost: cost?.cost ?? null,
      cost_with_tax: cost?.cost_with_tax ?? null,
    }
  })

  return NextResponse.json({ ingredients })
}