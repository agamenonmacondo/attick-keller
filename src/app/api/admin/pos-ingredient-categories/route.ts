import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()

  // Fetch categories excluding "NO USAR" and bar/vino by default
  const { searchParams } = new URL(request.url)
  const includeBar = searchParams.get('include_bar') === 'true'
  const includeWine = searchParams.get('include_wine') === 'true'

  const excludedClassifications: string[] = []
  if (!includeBar) excludedClassifications.push('2')
  if (!includeWine) excludedClassifications.push('3')

  let categoryQuery = sb
    .from('pos_ingredient_categories')
    .select('pos_category_id, name, classification, priority')
    .neq('name', 'NO USAR')
    .order('priority', { ascending: true })

  if (excludedClassifications.length > 0) {
    categoryQuery = categoryQuery.not('classification', 'in', `(${excludedClassifications.join(',')})`)
  }

  const { data: categories, error: catError } = await categoryQuery
  if (catError) return NextResponse.json({ error: catError.message }, { status: 500 })

  // For each category, count ingredients
  const { data: ingredientCounts, error: countError } = await sb
    .from('pos_ingredients')
    .select('pos_category_id')
    .neq('pos_category_id', '')

  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 })

  const countMap: Record<string, number> = {}
  for (const row of (ingredientCounts || [])) {
    const catId = row.pos_category_id as string
    countMap[catId] = (countMap[catId] || 0) + 1
  }

  const result = (categories || []).map((cat: Record<string, unknown>) => ({
    pos_category_id: cat.pos_category_id,
    name: cat.name,
    classification: cat.classification,
    priority: cat.priority,
    ingredient_count: countMap[cat.pos_category_id as string] || 0,
  }))

  return NextResponse.json({ categories: result })
}