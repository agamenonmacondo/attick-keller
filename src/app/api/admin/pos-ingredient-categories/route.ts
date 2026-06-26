import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'
import { handleApiError } from '@/lib/utils/api-security'

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()

  // Step 1: Get categories (no joins needed)
  const { data: categories, error: catError } = await sb
    .from('pos_ingredient_categories')
    .select('pos_category_id, name, classification, priority')
    .neq('name', 'NO USAR')
    .eq('classification', '1')
    .order('priority', { ascending: true })

  if (catError) return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })

  // Step 2: Count ingredients per category
  const catIds = (categories || []).map((c: { pos_category_id: string }) => c.pos_category_id)
  const { data: counts } = await sb
    .from('pos_ingredients')
    .select('pos_category_id')
    .in('pos_category_id', catIds)

  const countMap: Record<string, number> = {}
  for (const row of (counts || [])) {
    const id = row.pos_category_id as string
    countMap[id] = (countMap[id] || 0) + 1
  }

  const result = (categories || []).map((cat: { pos_category_id: string; name: string; classification: string; priority: number }) => ({
    pos_category_id: cat.pos_category_id,
    name: cat.name,
    classification: cat.classification,
    priority: cat.priority,
    ingredient_count: countMap[cat.pos_category_id] || 0,
  }))

  return NextResponse.json({ categories: result })
}