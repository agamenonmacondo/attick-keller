import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'
import { handleApiError } from '@/lib/utils/api-security'

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

  // Step 1: Get excluded category IDs
  const { data: excludedCats } = await sb
    .from('pos_ingredient_categories')
    .select('pos_category_id, name')
    .or('name.ilike.%NO USAR' + (!includeBar ? ',classification.eq.2' : '') + (!includeWine ? ',classification.eq.3' : ''))

  const excludedIds = (excludedCats || []).map((c: { pos_category_id: string }) => c.pos_category_id)

  // Step 2: Fetch ingredients (NO joins — no FK defined)
  let query = sb
    .from('pos_ingredients')
    .select('pos_ingredient_id, name, unit, is_composite, pos_category_id')
    .eq('restaurant_id', 'a0000000-0000-0000-0000-000000000001')
    .order('name', { ascending: true })
    .limit(limit)

  if (excludedIds.length > 0) {
    query = query.not('pos_category_id', 'in', `(${excludedIds.map(id => `"${id}"`).join(',')})`)
  }

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  if (category) {
    query = query.eq('pos_category_id', category)
  }

  const { data: ingredients, error: ingError } = await query
  if (ingError) return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })

  if (!ingredients || ingredients.length === 0) {
    return NextResponse.json({ ingredients: [] })
  }

  // Step 3: Get category names for the ingredients we got
  const catIds = [...new Set(ingredients.map((i: { pos_category_id: string }) => i.pos_category_id).filter(Boolean))]
  const { data: cats } = await sb
    .from('pos_ingredient_categories')
    .select('pos_category_id, name')
    .in('pos_category_id', catIds)

  const catMap: Record<string, string> = {}
  for (const c of (cats || [])) {
    catMap[c.pos_category_id] = c.name
  }

  // Step 4: Get costs for the ingredients
  const ingIds = ingredients.map((i: { pos_ingredient_id: string }) => i.pos_ingredient_id)
  const { data: costs } = await sb
    .from('pos_ingredient_costs')
    .select('pos_ingredient_id, avg_cost')
    .in('pos_ingredient_id', ingIds)

  const costMap: Record<string, number> = {}
  for (const c of (costs || [])) {
    costMap[c.pos_ingredient_id] = c.avg_cost
  }

  // Step 5: Assemble
  const result = ingredients.map((i: { pos_ingredient_id: string; name: string; unit: string; is_composite: boolean; pos_category_id: string }) => ({
    pos_ingredient_id: i.pos_ingredient_id,
    name: i.name,
    unit: i.unit,
    is_composite: i.is_composite || false,
    category_name: catMap[i.pos_category_id] || 'Sin categoria',
    avg_cost: costMap[i.pos_ingredient_id] || 0,
  }))

  return NextResponse.json({ ingredients: result })
}